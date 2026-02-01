
import React, { useMemo, useState } from 'react';
import { CashEntry, Expense } from '../types.ts';
import { db } from '../services/db.ts';
import { NATURES } from '../constants.tsx';
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
        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4 border-b pb-3">
          {data.nature}
        </p>
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
    setSelectedNatures(prev => 
      prev.includes(nature) ? prev.filter(n => n !== nature) : [...prev, nature]
    );
  };

  const analytics = useMemo(() => {
    const selectedDate = new Date(baseDate + 'T12:00:00');
    if (isNaN(selectedDate.getTime())) return null;
    
    const filterFn = (itemDate: string) => {
      if (periodType === 'Custom') return itemDate >= startDate && itemDate <= endDate;
      const d = new Date(itemDate + 'T12:00:00');
      if (periodType === 'Diário') return d.toDateString() === selectedDate.toDateString();
      if (periodType === 'Mensal') return d.getMonth() === selectedDate.getMonth() && d.getFullYear() === selectedDate.getFullYear();
      if (periodType === 'Anual') return d.getFullYear() === selectedDate.getFullYear();
      return false;
    };

    const periodEntries = entries.filter(e => filterFn(e.date));
    const paidPeriodExpenses = expenses.filter(e => e.status === 'Pago' && filterFn(e.dueDate));
    
    // O usuário solicitou que Obrigações Pendentes incluam valores de meses passados (Total Geral Pendente Global)
    const totalOutPending = expenses.filter(e => e.status === 'Pendente').reduce((acc, e) => acc + e.value, 0);

    const faturamento = {
      dinheiro: periodEntries.reduce((acc, e) => acc + (e.cash || 0), 0),
      pix: periodEntries.reduce((acc, e) => acc + (e.pix || 0), 0),
      debito: periodEntries.reduce((acc, e) => acc + (e.debit || 0), 0),
      credito: periodEntries.reduce((acc, e) => acc + (e.credit || 0), 0),
    };
    const receitaBruta = faturamento.dinheiro + faturamento.pix + faturamento.debito + faturamento.credito;
    
    const custoOperacional = paidPeriodExpenses.reduce((acc, e) => acc + e.value, 0);
    const totalSangrias = periodEntries.reduce((acc, e) => acc + (e.sangria || 0), 0);
    const custoTotalReal = custoOperacional + totalSangrias;
    
    const lucroLiquido = receitaBruta - custoTotalReal;

    const allPeriodExpenses = expenses.filter(e => filterFn(e.dueDate));
    const totalObrigacoes = allPeriodExpenses.reduce((acc, e) => acc + e.value, 0);
    const compositionMap: Record<string, number> = {};
    let totalFiltered = 0;
    allPeriodExpenses.filter(e => selectedNatures.includes(e.nature)).forEach(exp => {
      compositionMap[exp.nature] = (compositionMap[exp.nature] || 0) + exp.value;
      totalFiltered += exp.value;
    });

    const compositionData = Object.entries(compositionMap)
      .map(([nature, value]) => ({ nature, value, percent: totalFiltered > 0 ? value / totalFiltered : 0 }))
      .sort((a, b) => b.value - a.value);

    return {
      dre: { receitaBruta, faturamento, custoOperacional, totalSangrias, custoTotalReal, lucroLiquido, totalOutPending },
      audit: { items: allPeriodExpenses.filter(e => selectedNatures.includes(e.nature)).sort((a, b) => a.dueDate.localeCompare(b.dueDate)), compositionData, totalObrigacoes }
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
    if (periodType === 'Diário') return `DRE - ${d.toLocaleDateString('pt-BR').toUpperCase()}`;
    if (periodType === 'Mensal') {
      const month = d.toLocaleDateString('pt-BR', { month: 'long' }).toUpperCase();
      const year = d.getFullYear();
      return `DRE - ${month} - ${year}`;
    }
    return `DRE - ANUAL - ${d.getFullYear()}`;
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
              <div className="p-3 border-b border-slate-100 bg-slate-50/30 text-center print:bg-white print:border-b-2 print:border-slate-800">
                 <h3 className="text-lg font-black text-slate-800 uppercase tracking-tighter leading-none print:text-2xl">{dreTitleLabel}</h3>
              </div>
              <div className="p-6 lg:p-10 space-y-2 print:p-4 print:space-y-1">
                
                {/* BLOCO DE ENTRADAS */}
                <div className="space-y-1 print:space-y-0">
                  <DRETitle label="1. RECEITA OPERACIONAL BRUTA" value={analytics.dre.receitaBruta} color="text-slate-900" border="border-slate-900" />
                  <DRERow label="(+) Movimento em Dinheiro" value={analytics.dre.faturamento.dinheiro} rb={rb} />
                  <DRERow label="(+) Movimento via PIX" value={analytics.dre.faturamento.pix} rb={rb} />
                  <DRERow label="(+) Vendas em Débito" value={analytics.dre.faturamento.debito} rb={rb} />
                  <DRERow label="(+) Vendas em Crédito" value={analytics.dre.faturamento.credito} rb={rb} />
                </div>

                <div className="h-4 print:h-2"></div>

                {/* BLOCO DE SAÍDAS */}
                <div className="space-y-1 print:space-y-0">
                  <DRETitle label="2. CUSTO OPERACIONAL (DESEMBOLSO)" value={analytics.dre.custoTotalReal} color="text-rose-600" border="border-rose-200" />
                  <DRERow label="(-) Pagamentos de Contas" value={analytics.dre.custoOperacional} rb={rb} isNegative />
                  <DRERow label="(-) Sangrias do Período" value={analytics.dre.totalSangrias} rb={rb} isNegative />
                </div>

                <div className="h-6 print:h-4"></div>

                {/* RESULTADO FINAL - REATORADO PARA FIXAR COR NA IMPRESSÃO */}
                <div 
                  className="rounded-xl p-4 lg:p-5 flex flex-row justify-between items-center overflow-hidden border-l-8 border-green-500"
                  style={{ 
                    backgroundColor: '#0f172a', 
                    color: '#ffffff',
                    WebkitPrintColorAdjust: 'exact',
                    printColorAdjust: 'exact'
                  }}
                >
                  <div>
                    <h4 className="text-lg font-black uppercase tracking-tighter italic print:text-xl">LUCRO LÍQUIDO</h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[9px] font-black text-slate-400 uppercase">Margem Operacional:</span>
                      <span className="text-[11px] font-mono font-black text-emerald-400">{formatPercent(analytics.dre.lucroLiquido / rb)}</span>
                    </div>
                  </div>
                  <div className="text-right">
                     <p className={`text-2xl lg:text-3xl font-mono font-black tracking-tighter ${analytics.dre.lucroLiquido >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatMoney(analytics.dre.lucroLiquido)}</p>
                  </div>
                </div>

                {/* OBRIGAÇÕES PENDENTES (GLOBAL) */}
                <div 
                  className="rounded-xl p-4 flex flex-row justify-between items-center gap-4 mt-4 border border-orange-100"
                  style={{ 
                    backgroundColor: '#fff7ed',
                    WebkitPrintColorAdjust: 'exact',
                    printColorAdjust: 'exact'
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-orange-500 text-white rounded-lg flex items-center justify-center shadow-md print:bg-orange-500 print:text-white"><Clock size={18}/></div>
                    <div>
                      <h4 className="text-[11px] font-black text-orange-900 uppercase tracking-widest leading-none mb-0.5">Total Geral de Pendências</h4>
                      <p className="text-[8px] font-bold text-orange-400 uppercase tracking-widest italic leading-none">Inadimplência acumulada (Meses Passados + Atual)</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl lg:text-2xl font-mono font-black text-orange-600">{formatMoney(analytics.dre.totalOutPending)}</p>
                  </div>
                </div>

                {/* NOTA DE RODAPÉ PARA IMPRESSÃO */}
                <div className="hidden print:block pt-6 border-t border-slate-100 mt-6">
                  <p className="text-[8px] text-slate-400 uppercase font-black text-center tracking-[0.4em]">Relatório gerado em {new Date().toLocaleString('pt-BR')} • Sistema Bem Estar Controle</p>
                </div>

              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
             <div className="bg-white border border-slate-200 p-8 rounded-2xl shadow-sm flex items-center gap-6">
                <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center shadow-inner shrink-0"><Receipt size={32}/></div>
                <div>
                   <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Geral de Obrigações (Competência)</p>
                   <p className="text-3xl font-mono font-black text-slate-900">{formatMoney(analytics.audit.totalObrigacoes)}</p>
                   <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Todas as contas (Pagas e Pendentes)</p>
                </div>
             </div>

             <div className="bg-white border border-slate-200 p-8 rounded-2xl shadow-sm space-y-6">
                <div className="flex items-center gap-3"><Filter size={20} className="text-slate-400"/><h4 className="text-[12px] font-black text-slate-500 uppercase tracking-[0.2em]">Filtros por Natureza</h4></div>
                <div className="flex flex-wrap gap-3">
                   {NATURES.map(nature => (
                     <button key={nature} onClick={() => toggleNature(nature)} className={`flex items-center gap-3 px-5 py-2.5 rounded-2xl border text-[11px] font-black uppercase transition-all shadow-sm ${selectedNatures.includes(nature) ? 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-2 ring-emerald-100' : 'bg-white text-slate-400 border-slate-100 hover:bg-slate-50'}`}>{selectedNatures.includes(nature) ? <CheckCircle2 size={16}/> : <Circle size={16}/>}{nature}</button>
                   ))}
                </div>
             </div>

             <div className="bg-white border border-slate-200 p-10 rounded-2xl shadow-sm">
                <div className="flex items-center gap-5 mb-10"><div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center shadow-inner"><BarChart3 size={28}/></div><div><h4 className="text-lg font-black text-slate-800 uppercase tracking-widest leading-none mb-2">Distribuição de Gastos</h4><p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Peso de cada natureza no total do período</p></div></div>
                <div className="h-96 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.audit.compositionData} layout="vertical" margin={{ left: 120 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#F1F5F9" />
                      <XAxis type="number" hide />
                      <YAxis dataKey="nature" type="category" fontSize={11} fontWeight="900" axisLine={false} tickLine={false} width={120} tick={{ fill: '#475569' }} />
                      <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(241, 245, 249, 0.5)'}} />
                      <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={24} fill="#475569" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
             </div>

             <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="p-8 border-b border-slate-100 flex items-center gap-5 bg-slate-50/50">
                  <div className="w-12 h-12 bg-emerald-500 text-white rounded-2xl flex items-center justify-center shadow-md"><ClipboardList size={24}/></div>
                  <div><h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Extrato Auditado</h3><p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Detalhamento das contas do período</p></div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead><tr className="bg-slate-900 text-white"><th className="px-8 py-5 text-left text-[11px] font-black uppercase tracking-widest">Data Venc.</th><th className="px-8 py-5 text-left text-[11px] font-black uppercase tracking-widest">Descrição / Fornecedor</th><th className="px-8 py-5 text-left text-[11px] font-black uppercase tracking-widest">Natureza</th><th className="px-8 py-5 text-center text-[11px] font-black uppercase tracking-widest">Status</th><th className="px-8 py-5 text-right text-[11px] font-black uppercase tracking-widest">Valor</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">
                      {analytics.audit.items.map((row, i) => (
                        <tr key={i} className="hover:bg-slate-50 transition-colors">
                          <td className="px-8 py-5 text-[14px] font-mono font-black text-slate-400">{row.dueDate.split('-').reverse().join('/')}</td>
                          <td className="px-8 py-5"><p className="text-[14px] font-black text-slate-800 uppercase leading-none mb-1.5">{row.supplier}</p><p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{row.description}</p></td>
                          <td className="px-8 py-5"><span className="px-4 py-1.5 bg-slate-100 text-slate-500 rounded-xl text-[10px] font-black uppercase border border-slate-200">{row.nature}</span></td>
                          <td className="px-8 py-5 text-center"><span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase border ${row.status === 'Pago' ? 'bg-green-50 border-green-200 text-green-600' : 'bg-orange-50 border-orange-200 text-orange-600'}`}>{row.status}</span></td>
                          <td className="px-8 py-5 text-right text-[15px] font-mono font-black text-slate-900">{formatMoney(row.value)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
    <div className="flex justify-between items-center py-1 transition-colors hover:bg-slate-50 px-3 rounded-lg print:py-0.5 print:px-1">
      <div className="flex items-center gap-2">
        <span className={`text-[11px] font-bold ${isNegative ? 'text-slate-500' : 'text-slate-700'} uppercase tracking-tight`}>{label}</span>
        <span className="text-[8px] font-black px-1.5 py-0.5 bg-slate-100 text-slate-400 rounded border border-slate-200 print:hidden">{formatPercent(percent)}</span>
      </div>
      <span className={`text-[11px] font-mono font-black ${isNegative ? 'text-rose-500' : 'text-slate-800'}`}>{isNegative && value > 0 ? '-' : ''} {formatMoney(value)}</span>
    </div>
  );
};

export default Reports;
