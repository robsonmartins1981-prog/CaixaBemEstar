
import React, { useMemo, useState } from 'react';
import { CashEntry, Expense, CardRates } from '../types';
import { db } from '../services/db';
import { 
  ChevronLeft, ChevronRight, PieChart, ClipboardList, TrendingUp, Calendar, Filter, FileDown
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell, AreaChart, Area
} from 'recharts';

interface ReportsProps {
  entries: CashEntry[];
  expenses: Expense[];
}

const formatMoney = (val: number) => 
  val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });

type PeriodType = 'Diário' | 'Mensal' | 'Anual' | 'Custom';
type ReportView = 'audit' | 'dre';

const Reports: React.FC<ReportsProps> = ({ entries, expenses }) => {
  const [periodType, setPeriodType] = useState<PeriodType>('Mensal');
  const [reportView, setReportView] = useState<ReportView>('dre');
  const [baseDate, setBaseDate] = useState<string>(new Date().toISOString().split('T')[0]);
  
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  
  const [rates] = useState<CardRates>(db.getCardRates());

  const analytics = useMemo(() => {
    const selectedDate = new Date(baseDate + 'T12:00:00');
    if (isNaN(selectedDate.getTime())) return null;
    
    const filterFn = (itemDate: string) => {
      if (periodType === 'Custom') {
        return itemDate >= startDate && itemDate <= endDate;
      }
      
      const d = new Date(itemDate + 'T12:00:00');
      if (periodType === 'Diário') return d.toDateString() === selectedDate.toDateString();
      if (periodType === 'Mensal') return d.getMonth() === selectedDate.getMonth() && d.getFullYear() === selectedDate.getFullYear();
      if (periodType === 'Anual') return d.getFullYear() === selectedDate.getFullYear();
      return false;
    };

    const periodEntries = entries.filter(e => filterFn(e.date));
    const periodExpenses = expenses.filter(e => e.status === 'Pago' && filterFn(e.dueDate));

    const faturamento = {
      dinheiro: periodEntries.reduce((acc, e) => acc + e.cash, 0),
      pix: periodEntries.reduce((acc, e) => acc + e.pix, 0),
      debito: periodEntries.reduce((acc, e) => acc + e.debit, 0),
      credito: periodEntries.reduce((acc, e) => acc + e.credit, 0),
    };

    const revenueChartData = [
      { name: 'Dinheiro', value: faturamento.dinheiro, color: '#10b981' },
      { name: 'Pix', value: faturamento.pix, color: '#06b6d4' },
      { name: 'Débito', value: faturamento.debito, color: '#64748b' },
      { name: 'Crédito', value: faturamento.credito, color: '#3b82f6' },
    ].filter(item => item.value > 0);

    const receitaBruta = faturamento.dinheiro + faturamento.pix + faturamento.debito + faturamento.credito;
    const taxasMaquininha = (faturamento.debito * (rates.debit / 100)) + (faturamento.credito * (rates.credit / 100));
    const impostos = periodExpenses.filter(e => e.nature === 'Impostos').reduce((acc, e) => acc + e.value, 0);
    const receitaLiquida = receitaBruta - taxasMaquininha - impostos;
    const cmv = periodExpenses.filter(e => e.nature === 'Custo da Mercadoria Vendida (CMV)').reduce((acc, e) => acc + e.value, 0);
    const lucroBruto = receitaLiquida - cmv;
    const despesasFixas = periodExpenses.filter(e => e.costType === 'Fixo').reduce((acc, e) => acc + e.value, 0);
    const despesasVariaveisOutras = periodExpenses.filter(e => e.costType === 'Variável' && e.nature !== 'Custo da Mercadoria Vendida (CMV)' && e.nature !== 'Impostos').reduce((acc, e) => acc + e.value, 0);
    const lucroLiquido = lucroBruto - despesasFixas - despesasVariaveisOutras;

    const historyTrend = [];
    const trendEnd = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    for (let i = 11; i >= 0; i--) {
      const d = new Date(trendEnd.getFullYear(), trendEnd.getMonth() - i, 1);
      const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const mEntries = entries.filter(e => e.date.startsWith(mKey));
      const mExpenses = expenses.filter(e => e.status === 'Pago' && e.dueDate.startsWith(mKey));
      const mBruto = mEntries.reduce((acc, e) => acc + (e.cash + e.pix + e.credit + e.debit), 0);
      const mTaxas = mEntries.reduce((acc, e) => acc + (e.debit * (rates.debit/100) + e.credit * (rates.credit/100)), 0);
      const mPago = mExpenses.reduce((acc, e) => acc + e.value, 0);
      historyTrend.push({
        name: d.toLocaleDateString('pt-BR', { month: 'short' }),
        lucro: mBruto - mTaxas - mPago
      });
    }

    return {
      dre: { receitaBruta, faturamento, taxasMaquininha, impostos, receitaLiquida, cmv, lucroBruto, despesasFixas, despesasVariaveisOutras, lucroLiquido, revenueChartData, historyTrend },
      audit: { items: periodExpenses.sort((a, b) => a.dueDate.localeCompare(b.dueDate)) }
    };
  }, [entries, expenses, periodType, baseDate, rates, startDate, endDate]);

  const handleAdjustDate = (delta: number) => {
    if (periodType === 'Custom') return;
    const d = new Date(baseDate + 'T12:00:00');
    if (periodType === 'Diário') d.setDate(d.getDate() + delta);
    else if (periodType === 'Mensal') d.setMonth(d.getMonth() + delta);
    else if (periodType === 'Anual') d.setFullYear(d.getFullYear() + delta);
    setBaseDate(d.toISOString().split('T')[0]);
  };

  const formattedLabel = () => {
    if (periodType === 'Custom') {
      const s = new Date(startDate + 'T12:00:00').toLocaleDateString('pt-BR');
      const e = new Date(endDate + 'T12:00:00').toLocaleDateString('pt-BR');
      return `${s} à ${e}`;
    }
    const d = new Date(baseDate + 'T12:00:00');
    if (periodType === 'Diário') return d.toLocaleDateString('pt-BR');
    if (periodType === 'Mensal') return d.toLocaleDateString('pt-BR', {month: 'long', year: 'numeric'});
    return d.getFullYear().toString();
  };

  const handlePrintPDF = () => {
    setReportView('dre');
    // Aumentado o timeout para garantir que os SVGs do Recharts recalculem o layout
    setTimeout(() => {
      window.print();
    }, 800);
  };

  if (!analytics) return null;

  return (
    <div className="flex-1 flex flex-col gap-4 overflow-hidden h-full print:block print:h-auto">
      {/* Barra de Controles - Escondida na Impressão */}
      <div className="bg-white border border-slate-200 p-3 flex flex-col xl:flex-row items-center justify-between gap-4 shrink-0 shadow-sm rounded-2xl z-10 no-print">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            {(['Diário', 'Mensal', 'Anual', 'Custom'] as PeriodType[]).map(p => (
              <button 
                key={p} 
                onClick={() => setPeriodType(p)} 
                className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${periodType === p ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                {p === 'Custom' ? 'Período' : p}
              </button>
            ))}
          </div>
          
          {periodType === 'Custom' ? (
            <div className="flex items-center gap-2 animate-in slide-in-from-left-2 duration-300">
              <div className="flex flex-col">
                <span className="text-[7px] font-black text-slate-400 uppercase ml-1">Início</span>
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-8 px-2 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold outline-none focus:border-blue-500"
                />
              </div>
              <ChevronRight size={14} className="text-slate-300 mt-3"/>
              <div className="flex flex-col">
                <span className="text-[7px] font-black text-slate-400 uppercase ml-1">Fim</span>
                <input 
                  type="date" 
                  value={endDate} 
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-8 px-2 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold outline-none focus:border-blue-500"
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
               <button onClick={() => handleAdjustDate(-1)} className="p-2 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"><ChevronLeft size={14}/></button>
               <div className="px-4 py-1.5 bg-slate-900 text-white rounded-lg font-mono font-bold text-[10px] min-w-[140px] text-center uppercase tracking-widest">
                  {formattedLabel()}
               </div>
               <button onClick={() => handleAdjustDate(1)} className="p-2 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"><ChevronRight size={14}/></button>
            </div>
          )}

          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button onClick={() => setReportView('dre')} className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${reportView === 'dre' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}><PieChart size={14}/> DRE</button>
            <button onClick={() => setReportView('audit')} className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${reportView === 'audit' ? 'bg-white text-green-600 shadow-sm' : 'text-slate-400'}`}><ClipboardList size={14}/> Auditoria</button>
          </div>
        </div>

        <button 
          onClick={handlePrintPDF}
          className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 active:scale-95 transition-all shadow-lg"
        >
          <FileDown size={14}/> Exportar DRE (PDF)
        </button>
      </div>

      <div className="flex-1 bg-white border border-slate-200 shadow-sm flex flex-col overflow-hidden rounded-3xl print:border-0 print:shadow-none print:overflow-visible print:block">
        <div className="flex-1 overflow-auto custom-scrollbar p-6 print:p-0 print:overflow-visible">
          
          {reportView === 'dre' && (
            <div id="dre-report-content" className="max-w-4xl mx-auto space-y-8 animate-in fade-in print:max-w-none">
              <div className="flex flex-col gap-1 border-b-4 border-slate-900 pb-4">
                <div className="flex justify-between items-end">
                  <h3 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">Demonstrativo de Resultado (DRE)</h3>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Relatório Analítico</p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase">{formattedLabel()}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <DREHeader label="1. RECEITA BRUTA" value={analytics.dre.receitaBruta} />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center bg-slate-50 border border-slate-100 rounded-2xl p-6 print:bg-white print:border-slate-200">
                  <div className="h-48 w-full">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Mix de Pagamentos</p>
                    <ResponsiveContainer width="100%" height="90%">
                      <BarChart layout="vertical" data={analytics.dre.revenueChartData} margin={{ left: -20 }}>
                        <XAxis type="number" hide />
                        <YAxis type="category" dataKey="name" fontSize={10} fontWeight="900" width={80} axisLine={false} tickLine={false} />
                        <Tooltip formatter={(val: number) => formatMoney(val)} />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                          {analytics.dre.revenueChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-1">
                    <DRERow label="(+) Dinheiro" value={analytics.dre.faturamento.dinheiro} indent />
                    <DRERow label="(+) Pix" value={analytics.dre.faturamento.pix} indent />
                    <DRERow label="(+) Cartões" value={analytics.dre.faturamento.debito + analytics.dre.faturamento.credito} indent />
                    <DRERow label="(-) Taxas de Cartão" value={analytics.dre.taxasMaquininha} indent negative />
                    <DRERow label="(-) Impostos" value={analytics.dre.impostos} indent negative />
                  </div>
                </div>
                
                <DRESubtotal label="(=) RECEITA LÍQUIDA" value={analytics.dre.receitaLiquida} />
                
                <div className="space-y-1">
                  <DRERow label="(-) Custo de Mercadoria (CMV)" value={analytics.dre.cmv} negative />
                  <DRESubtotal label="(=) LUCRO BRUTO" value={analytics.dre.lucroBruto} highlight />
                </div>

                <div className="space-y-1">
                  <DRERow label="(-) Despesas Fixas" value={analytics.dre.despesasFixas} negative />
                  <DRERow label="(-) Outras Variáveis" value={analytics.dre.despesasVariaveisOutras} negative />
                </div>

                <div className="mt-8 p-10 bg-slate-900 rounded-[32px] text-white flex flex-col md:flex-row justify-between items-center shadow-xl print:bg-black print:text-white">
                   <div className="flex flex-col text-center md:text-left">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Resultado Final</span>
                      <h4 className="text-4xl font-black uppercase tracking-tighter">LUCRO LÍQUIDO</h4>
                   </div>
                   <div className="text-center md:text-right mt-4 md:mt-0">
                      <p className={`text-5xl font-mono font-black tracking-tighter ${analytics.dre.lucroLiquido >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {formatMoney(analytics.dre.lucroLiquido)}
                      </p>
                   </div>
                </div>

                <div className="mt-12 space-y-4 page-break-before">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={16} className="text-blue-600"/>
                    <h5 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Tendência do Lucro Líquido (Últimos 12 Meses)</h5>
                  </div>
                  <div className="h-64 w-full bg-white border border-slate-100 rounded-2xl p-4 shadow-sm print:border-slate-200">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={analytics.dre.historyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorLucro" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" fontSize={9} fontWeight="900" axisLine={false} tickLine={false} />
                        <YAxis fontSize={9} fontWeight="900" axisLine={false} tickLine={false} tickFormatter={(val) => `R$${val/1000}k`} />
                        <Tooltip formatter={(val: number) => formatMoney(val)} />
                        <Area type="monotone" dataKey="lucro" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorLucro)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}

          {reportView === 'audit' && (
            <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in">
               <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Conciliação de Saídas</h3>
               <div className="overflow-hidden border border-slate-200 rounded-2xl">
                <table className="w-full border-collapse">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase">Vencimento</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase">Item</th>
                      <th className="px-6 py-4 text-right text-[10px] font-black text-slate-500 uppercase">Valor Pago</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {analytics.audit.items.map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 text-[11px] font-mono font-bold text-slate-600">{new Date(row.dueDate + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
                        <td className="px-6 py-4 text-[11px] font-black text-slate-800 uppercase">{row.description}</td>
                        <td className="px-6 py-4 text-right text-[11px] font-mono font-black text-red-600">{formatMoney(row.value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const DREHeader = ({ label, value, negative }: any) => (
  <div className="flex justify-between items-center py-2.5 border-b-2 border-slate-900">
    <span className="text-[11px] font-black text-slate-800 uppercase tracking-wider">{label}</span>
    <span className={`text-[11px] font-mono font-black ${negative ? 'text-red-600' : 'text-slate-900'}`}>{formatMoney(value)}</span>
  </div>
);

const DRERow = ({ label, value, indent, negative }: any) => (
  <div className={`flex justify-between items-center py-1.5 ${indent ? 'pl-6' : ''}`}>
    <span className="text-[10px] font-bold text-slate-500 uppercase">{label}</span>
    <span className={`text-[10px] font-mono font-bold ${negative ? 'text-red-500' : 'text-slate-600'}`}>
      {negative && value > 0 ? '-' : ''} {formatMoney(value)}
    </span>
  </div>
);

const DRESubtotal = ({ label, value, highlight }: any) => (
  <div className={`flex justify-between items-center py-4 px-6 rounded-2xl mt-2 ${highlight ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-100'}`}>
    <span className={`text-[11px] font-black uppercase ${highlight ? 'text-white' : 'text-slate-700'}`}>{label}</span>
    <span className={`text-base font-mono font-black ${highlight ? 'text-white' : (value >= 0 ? 'text-slate-900' : 'text-red-700')}`}>{formatMoney(value)}</span>
  </div>
);

export default Reports;
