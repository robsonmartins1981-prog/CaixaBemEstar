
import React, { useMemo, useState } from 'react';
import { CashEntry, Expense } from '../types';
import { db } from '../services/db';
import { NATURES } from '../constants';
import { 
  ChevronLeft, ChevronRight, PieChart, ClipboardList, FileDown, 
  BarChart3, Filter, CheckCircle2, Circle, Receipt, Clock
} from 'lucide-react';
import { 
  CartesianGrid, Tooltip, ResponsiveContainer, 
  XAxis, YAxis, BarChart, Bar, Cell
} from 'recharts';

interface ReportsProps {
  entries: CashEntry[];
  expenses: Expense[];
}

const formatMoney = (val: number) => 
  val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatPercent = (val: number) => 
  val.toLocaleString('pt-BR', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 });

type PeriodType = 'Diário' | 'Mensal' | 'Anual' | 'Custom';
type ReportView = 'audit' | 'dre';

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-5 border border-slate-200 shadow-2xl rounded-3xl min-w-[250px]">
        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4 border-b pb-3">{data.nature}</p>
        <div className="space-y-3">
          <div className="flex justify-between items-center gap-4">
            <span className="text-[11px] font-black text-slate-500 uppercase">Valor Consolidado:</span>
            <span className="text-[13px] font-mono font-black text-slate-900">{formatMoney(data.value)}</span>
          </div>
          {data.percent && (
            <div className="flex justify-between items-center gap-4">
              <span className="text-[11px] font-black text-slate-400 uppercase">Proporção:</span>
              <span className="text-[12px] font-mono font-black text-blue-600">{formatPercent(data.percent)}</span>
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
};

const Reports: React.FC<ReportsProps> = ({ entries, expenses }) => {
  const [periodType, setPeriodType] = useState<PeriodType>('Mensal');
  const [reportView, setReportView] = useState<ReportView>('dre');
  const [baseDate, setBaseDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedNatures, setSelectedNatures] = useState<string[]>(Array.from(NATURES));
  
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  
  const toggleNature = (nature: string) => {
    setSelectedNatures(prev => prev.includes(nature) ? prev.filter(n => n !== nature) : [...prev, nature]);
  };

  const analytics = useMemo(() => {
    const selectedDate = new Date(baseDate + 'T12:00:00');
    if (isNaN(selectedDate.getTime())) return null;
    
    const filterFn = (itemDate: string, purchaseDate?: string) => {
      const dateToUse = purchaseDate || itemDate;
      if (periodType === 'Custom') return dateToUse >= startDate && dateToUse <= endDate;
      const d = new Date(dateToUse + 'T12:00:00');
      if (periodType === 'Diário') return d.toDateString() === selectedDate.toDateString();
      if (periodType === 'Mensal') return d.getMonth() === selectedDate.getMonth() && d.getFullYear() === selectedDate.getFullYear();
      if (periodType === 'Anual') return d.getFullYear() === selectedDate.getFullYear();
      return false;
    };

    const periodEntries = entries.filter(e => filterFn(e.date));
    const paidPeriodExpenses = expenses.filter(e => e.status === 'Pago' && filterFn(e.dueDate, e.purchaseDate));
    
    const totalOutPending = expenses.filter(e => e.status === 'Pendente').reduce((acc, e) => acc + e.value, 0);

    const faturamento = {
      dinheiro: periodEntries.reduce((acc, e) => acc + (e.cash || 0), 0),
      pix: periodEntries.reduce((acc, e) => acc + (e.pix || 0), 0),
      debito: periodEntries.reduce((acc, e) => acc + (e.debit || 0), 0),
      credito: periodEntries.reduce((acc, e) => acc + (e.credit || 0), 0),
      sangria: periodEntries.reduce((acc, e) => acc + (e.sangria || 0), 0),
    };
    const receitaBruta = faturamento.dinheiro + faturamento.pix + faturamento.debito + faturamento.credito - faturamento.sangria;
    const custoOperacional = paidPeriodExpenses.reduce((acc, e) => acc + e.value, 0);
    const custoTotalReal = custoOperacional;
    const lucroLiquido = receitaBruta - custoTotalReal;

    const allPeriodExpenses = expenses.filter(e => filterFn(e.dueDate, e.purchaseDate));
    const totalObrigacoes = allPeriodExpenses.reduce((acc, e) => acc + e.value, 0);
    const compositionMap: Record<string, number> = {};
    let totalFiltered = 0;
    allPeriodExpenses.filter(e => {
      const normalizedNature = e.nature === 'Custo da Mercadoria Vendida' ? 'Custo da Mercadoria Vendida (CMV)' : e.nature;
      return selectedNatures.includes(normalizedNature);
    }).forEach(exp => {
      const normalizedNature = exp.nature === 'Custo da Mercadoria Vendida' ? 'Custo da Mercadoria Vendida (CMV)' : exp.nature;
      compositionMap[normalizedNature] = (compositionMap[normalizedNature] || 0) + exp.value;
      totalFiltered += exp.value;
    });

    const compositionData = Object.entries(compositionMap)
      .map(([nature, value]) => ({ nature, value, percent: totalFiltered > 0 ? value / totalFiltered : 0 }))
      .sort((a, b) => b.value - a.value);

    return {
      dre: { receitaBruta, faturamento, custoOperacional, custoTotalReal, lucroLiquido, totalOutPending },
      audit: { 
        items: allPeriodExpenses.filter(e => selectedNatures.includes(e.nature)).sort((a, b) => (a.purchaseDate || a.dueDate).localeCompare(b.purchaseDate || b.dueDate)), 
        compositionData, 
        totalObrigacoes,
        totalFiltered
      }
    };
  }, [entries, expenses, periodType, baseDate, startDate, endDate, selectedNatures]);

  const handleAdjustDate = (delta: number) => {
    if (periodType === 'Custom') return;
    const d = new Date(baseDate + 'T12:00:00');
    if (periodType === 'Diário') d.setDate(d.getDate() + delta);
    else if (periodType === 'Mensal') d.setMonth(d.getMonth() + delta);
    else if (periodType === 'Anual') d.setFullYear(d.getFullYear() + delta);
    setBaseDate(d.toISOString().split('T')[0]);
  };

  const formattedLabel = () => {
    if (periodType === 'Custom') return `${new Date(startDate + 'T12:00:00').toLocaleDateString('pt-BR')} à ${new Date(endDate + 'T12:00:00').toLocaleDateString('pt-BR')}`;
    const d = new Date(baseDate + 'T12:00:00');
    if (periodType === 'Diário') return d.toLocaleDateString('pt-BR');
    if (periodType === 'Mensal') return d.toLocaleDateString('pt-BR', {month: 'long', year: 'numeric'});
    return d.getFullYear().toString();
  };

  const dreTitleLabel = useMemo(() => {
    if (periodType === 'Custom') return `DRE - PERSONALIZADO`;
    const d = new Date(baseDate + 'T12:00:00');
    const month = d.toLocaleDateString('pt-BR', { month: 'long' }).toUpperCase();
    const year = d.getFullYear();
    if (periodType === 'Diário') return `DRE - ${d.toLocaleDateString('pt-BR').toUpperCase()}`;
    if (periodType === 'Mensal') return `DRE - ${month} - ${year}`;
    return `DRE - ANUAL - ${year}`;
  }, [periodType, baseDate]);

  if (!analytics) return null;
  const rb = analytics.dre.receitaBruta || 1;

  return (
    <div className="flex-1 flex flex-col gap-5 overflow-hidden h-full print:block print:bg-white bg-[#F8FAFC]">
      <div className="bg-white border-b border-slate-200 p-4 flex flex-col xl:flex-row items-center justify-between gap-5 shrink-0 no-print z-20 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
            {(['Diário', 'Mensal', 'Anual', 'Custom'] as PeriodType[]).map(p => (
              <button key={p} onClick={() => setPeriodType(p)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${periodType === p ? 'bg-white text-slate-800 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>{p}</button>
            ))}
          </div>
          <div className="flex items-center gap-2.5">
             <button onClick={() => handleAdjustDate(-1)} className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50"><ChevronLeft size={20}/></button>
             <div className="px-6 py-3 bg-slate-900 text-white rounded-[1.2rem] font-mono font-bold text-[11px] min-w-[180px] text-center uppercase shadow-lg">{formattedLabel()}</div>
             <button onClick={() => handleAdjustDate(1)} className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50"><ChevronRight size={20}/></button>
          </div>
          <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
            <button onClick={() => setReportView('dre')} className={`flex items-center gap-3 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${reportView === 'dre' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-400'}`}><PieChart size={18}/> DRE Operacional</button>
            <button onClick={() => setReportView('audit')} className={`flex items-center gap-3 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${reportView === 'audit' ? 'bg-white text-emerald-600 shadow-md' : 'text-slate-400'}`}><ClipboardList size={18}/> Auditoria</button>
          </div>
        </div>
        <button onClick={() => window.print()} className="flex items-center gap-3 px-8 py-3 bg-blue-600 text-white rounded-2xl text-[11px] font-black uppercase shadow-xl hover:bg-blue-700 active:scale-95 transition-all"><FileDown size={20}/> Gerar PDF</button>
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar p-3 lg:p-6 print:p-0 bg-[#F8FAFC] print:bg-white print:overflow-visible">
        {reportView === 'dre' ? (
          <div className="max-w-4xl mx-auto animate-in fade-in duration-500 pb-10 print:pb-0 print:m-0 print:max-w-none">
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm print:border-none print:shadow-none print:rounded-none">
              <div className="p-2 border-b border-slate-100 bg-slate-50/30 text-center print:bg-white print:border-b-2 print:border-slate-800 print:mb-2">
                 <h3 className="text-base md:text-lg font-black text-slate-800 uppercase tracking-tighter leading-none print:text-xl">{dreTitleLabel}</h3>
              </div>
              <div className="p-6 lg:p-8 space-y-1 print:p-2 print:space-y-0.5">
                
                <div className="space-y-1 print:space-y-0">
                  <DRETitle label="1. RECEITA OPERACIONAL BRUTA" value={analytics.dre.receitaBruta} color="text-slate-900" border="border-slate-900" />
                  <DRERow label="(+) Movimento em Dinheiro" value={analytics.dre.faturamento.dinheiro} rb={rb} />
                  <DRERow label="(+) Movimento via PIX" value={analytics.dre.faturamento.pix} rb={rb} />
                  <DRERow label="(+) Vendas em Débito" value={analytics.dre.faturamento.debito} rb={rb} />
                  <DRERow label="(+) Vendas em Crédito" value={analytics.dre.faturamento.credito} rb={rb} />
                  <DRERow label="(-) Sangrias (Retiradas)" value={analytics.dre.faturamento.sangria} rb={rb} isNegative />
                </div>

                <div className="h-4 print:h-2"></div>

                <div className="space-y-1 print:space-y-0">
                  <DRETitle label="2. CUSTO OPERACIONAL (SAÍDAS REAIS)" value={analytics.dre.custoTotalReal} color="text-rose-600" border="border-rose-200" />
                  <DRERow label="(-) Pagamentos de Contas" value={analytics.dre.custoOperacional} rb={rb} isNegative />
                </div>

                <div className="h-6 print:h-4"></div>

                <div 
                  className="rounded-xl p-4 lg:p-5 flex flex-row justify-between items-center overflow-hidden border-l-8 border-green-500 shadow-md print:shadow-none"
                  style={{ 
                    backgroundColor: '#0f172a', 
                    color: '#ffffff',
                    WebkitPrintColorAdjust: 'exact',
                    printColorAdjust: 'exact'
                  }}
                >
                  <div className="z-10">
                    <h4 className="text-base font-black uppercase tracking-tighter italic print:text-lg">LUCRO LÍQUIDO DO PERÍODO</h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[9px] font-black text-slate-500 uppercase">Margem Operacional:</span>
                      <span className="text-[11px] font-mono font-black text-emerald-400">{formatPercent(analytics.dre.lucroLiquido / rb)}</span>
                    </div>
                  </div>
                  <div className="z-10 text-right">
                     <p className={`text-2xl lg:text-3xl font-mono font-black tracking-tighter ${analytics.dre.lucroLiquido >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatMoney(analytics.dre.lucroLiquido)}</p>
                  </div>
                </div>

                <div 
                  className="rounded-xl p-3 flex flex-row justify-between items-center gap-4 mt-3 border border-orange-100 print:mt-2"
                  style={{ 
                    backgroundColor: '#fff7ed',
                    WebkitPrintColorAdjust: 'exact',
                    printColorAdjust: 'exact'
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-orange-500 text-white rounded-lg flex items-center justify-center shadow-md print:bg-orange-500"><Clock size={16}/></div>
                    <div>
                      <h4 className="text-[11px] font-black text-orange-900 uppercase tracking-widest leading-none mb-0.5">Total Geral Pendente</h4>
                      <p className="text-[8px] font-bold text-orange-400 uppercase tracking-widest italic leading-none">Inadimplência acumulada de todos os meses</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-mono font-black text-orange-600">{formatMoney(analytics.dre.totalOutPending)}</p>
                  </div>
                </div>

                <div className="hidden print:block pt-4 border-t border-slate-200 mt-4 text-center">
                  <p className="text-[8px] text-slate-400 uppercase font-black tracking-[0.4em]">Relatório Gerado via Bem Estar Controle • {new Date().toLocaleDateString('pt-BR')} {new Date().toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 pb-10">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white border border-slate-200 p-8 rounded-[2.5rem] shadow-sm flex items-center gap-6">
                  <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center shadow-inner shrink-0"><Receipt size={32}/></div>
                  <div>
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Total de Obrigações (Período)</p>
                    <p className="text-3xl font-mono font-black text-slate-900">{formatMoney(analytics.audit.totalObrigacoes)}</p>
                  </div>
                </div>
                <div className="bg-white border border-slate-200 p-8 rounded-[2.5rem] shadow-sm flex items-center gap-6">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center shadow-inner shrink-0"><BarChart3 size={32}/></div>
                  <div>
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Filtrado por Natureza</p>
                    <p className="text-3xl font-mono font-black text-emerald-600">{formatMoney(analytics.audit.totalFiltered)}</p>
                  </div>
                </div>
             </div>

             <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm">
                   <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-6 border-b pb-4">Composição por Natureza</h4>
                   <div className="space-y-4">
                      {analytics.audit.compositionData.map((item, idx) => (
                        <div key={idx} className="space-y-2">
                           <div className="flex justify-between items-center text-[11px] font-black uppercase">
                              <span className="text-slate-600 truncate mr-2">{item.nature}</span>
                              <span className="text-slate-900 font-mono">{formatMoney(item.value)}</span>
                           </div>
                           <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-blue-500 rounded-full" style={{ width: `${item.percent * 100}%` }}></div>
                           </div>
                           <p className="text-[9px] font-bold text-slate-400 text-right uppercase">{formatPercent(item.percent)} do total</p>
                        </div>
                      ))}
                   </div>
                </div>

                <div className="lg:col-span-2 bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm flex flex-col">
                   <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-6 border-b pb-4">Detalhamento de Títulos</h4>
                   <div className="flex-1 overflow-auto custom-scrollbar max-h-[500px]">
                      <table className="w-full border-collapse">
                        <thead className="sticky top-0 bg-white border-b text-[9px] font-black uppercase text-slate-400">
                          <tr>
                            <th className="px-4 py-3 text-left">Data</th>
                            <th className="px-4 py-3 text-left">Fornecedor / Descrição</th>
                            <th className="px-4 py-3 text-right">Valor</th>
                            <th className="px-4 py-3 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {analytics.audit.items.map(item => (
                            <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-4 py-4 text-[11px] font-mono font-bold text-slate-500">{(item.purchaseDate || item.dueDate).split('-').reverse().join('/')}</td>
                              <td className="px-4 py-4">
                                <p className="text-[11px] font-black text-slate-800 uppercase leading-none mb-1">{item.supplier}</p>
                                <p className="text-[9px] font-bold text-slate-400 uppercase truncate max-w-[200px]">{item.description}</p>
                              </td>
                              <td className="px-4 py-4 text-right text-[12px] font-mono font-black text-slate-900">{formatMoney(item.value)}</td>
                              <td className="px-4 py-4 text-center">
                                <span className={`px-2 py-1 rounded-md text-[8px] font-black uppercase ${item.status === 'Pago' ? 'bg-emerald-100 text-emerald-600' : 'bg-orange-100 text-orange-600'}`}>
                                  {item.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                   </div>
                </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

const DRETitle = ({ label, value, color, border }: { label: string, value: number, color: string, border: string }) => (
  <div className={`flex justify-between items-end pt-2 pb-1 border-b-2 print:pt-1 print:pb-0.5 ${border}`}>
    <span className={`text-[12px] md:text-[13px] font-black uppercase tracking-widest ${color}`}>{label}</span>
    <span className={`text-[13px] md:text-[14px] font-mono font-black ${color}`}>{formatMoney(value)}</span>
  </div>
);

const DRERow = ({ label, value, rb, isNegative }: any) => {
  const percent = value / rb;
  return (
    <div className="flex justify-between items-center py-1 transition-colors hover:bg-slate-50 px-3 rounded-lg print:py-0.2 print:px-1">
      <div className="flex items-center gap-2">
        <span className={`text-[11px] font-bold ${isNegative ? 'text-slate-500' : 'text-slate-700'} uppercase tracking-tight`}>{label}</span>
        <span className="text-[8px] font-black px-1.5 py-0.5 bg-slate-100 text-slate-400 rounded border border-slate-200 print:hidden">{formatPercent(percent)}</span>
      </div>
      <span className={`text-[11px] font-mono font-black ${isNegative ? 'text-rose-500' : 'text-slate-800'}`}>{isNegative && value > 0 ? '-' : ''} {formatMoney(value)}</span>
    </div>
  );
};

export default Reports;
