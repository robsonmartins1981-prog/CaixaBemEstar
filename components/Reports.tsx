
import React, { useMemo, useState } from 'react';
import { CashEntry, Expense, CardRates, ExpenseNature } from '../types.ts';
import { db } from '../services/db.ts';
import { NATURES } from '../constants.tsx';
import { 
  ChevronLeft, ChevronRight, PieChart, ClipboardList, TrendingUp, FileDown, 
  ArrowUpRight, Info, LineChart as LineChartIcon, BarChart3, Filter, CheckCircle2, Circle
} from 'lucide-react';
import { 
  CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, XAxis, YAxis, ReferenceLine, BarChart, Bar, Cell
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
      <div className="bg-white p-4 border border-slate-200 shadow-2xl rounded-2xl min-w-[200px]">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 border-b pb-2">
          {data.fullName || data.nature}
        </p>
        <div className="space-y-2">
          <div className="flex justify-between items-center gap-4">
            <span className="text-[9px] font-bold text-slate-500 uppercase">Valor:</span>
            <span className="text-[11px] font-mono font-black text-slate-900">{formatMoney(data.value || data.lucro)}</span>
          </div>
          {data.percent && (
            <div className="flex justify-between items-center gap-4">
              <span className="text-[9px] font-bold text-slate-400 uppercase">Representação:</span>
              <span className="text-[10px] font-mono font-black text-blue-600">{formatPercent(data.percent)}</span>
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
  const [selectedNatures, setSelectedNatures] = useState<string[]>(NATURES as unknown as string[]);
  
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  
  const [rates] = useState<CardRates>(db.getCardRates());

  const toggleNature = (nature: string) => {
    setSelectedNatures(prev => 
      prev.includes(nature) ? prev.filter(n => n !== nature) : [...prev, nature]
    );
  };

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

    const filteredAuditItems = periodExpenses.filter(e => selectedNatures.includes(e.nature));

    const faturamento = {
      dinheiro: periodEntries.reduce((acc, e) => acc + e.cash, 0),
      pix: periodEntries.reduce((acc, e) => acc + e.pix, 0),
      debito: periodEntries.reduce((acc, e) => acc + e.debit, 0),
      credito: periodEntries.reduce((acc, e) => acc + e.credit, 0),
    };

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
        fullName: d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
        receita: mBruto,
        despesa: mTaxas + mPago,
        lucro: mBruto - mTaxas - mPago
      });
    }

    const compositionMap: Record<string, number> = {};
    let totalSpent = 0;
    filteredAuditItems.forEach(exp => {
      compositionMap[exp.nature] = (compositionMap[exp.nature] || 0) + exp.value;
      totalSpent += exp.value;
    });

    const compositionData = Object.entries(compositionMap)
      .map(([nature, value]) => ({ 
        nature, 
        value, 
        percent: totalSpent > 0 ? value / totalSpent : 0 
      }))
      .sort((a, b) => b.value - a.value);

    return {
      dre: { 
        receitaBruta, faturamento, taxasMaquininha, impostos, receitaLiquida, 
        cmv, lucroBruto, despesasFixas, despesasVariaveisOutras, lucroLiquido, 
        historyTrend 
      },
      audit: { 
        items: filteredAuditItems.sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
        compositionData
      }
    };
  }, [entries, expenses, periodType, baseDate, rates, startDate, endDate, selectedNatures]);

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
    setTimeout(() => { window.print(); }, 500);
  };

  if (!analytics) return null;

  const rb = analytics.dre.receitaBruta || 1;

  return (
    <div className="flex-1 flex flex-col gap-4 overflow-hidden h-full print:block print:bg-white bg-[#F8FAFC]">
      <div className="bg-white border-b border-slate-200 p-3 flex flex-col xl:flex-row items-center justify-between gap-4 shrink-0 no-print z-20 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            {(['Diário', 'Mensal', 'Anual', 'Custom'] as PeriodType[]).map(p => (
              <button 
                key={p} 
                onClick={() => setPeriodType(p)} 
                className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${periodType === p ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                {p}
              </button>
            ))}
          </div>
          
          <div className="flex items-center gap-2">
             <button onClick={() => handleAdjustDate(-1)} className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"><ChevronLeft size={14}/></button>
             <div className="px-4 py-2 bg-slate-900 text-white rounded-lg font-mono font-bold text-[10px] min-w-[140px] text-center uppercase tracking-widest shadow-md">
                {formattedLabel()}
             </div>
             <button onClick={() => handleAdjustDate(1)} className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"><ChevronRight size={14}/></button>
          </div>

          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button onClick={() => setReportView('dre')} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${reportView === 'dre' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}><PieChart size={14}/> DRE</button>
            <button onClick={() => setReportView('audit')} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${reportView === 'audit' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}><ClipboardList size={14}/> Auditoria</button>
          </div>
        </div>

        <button 
          onClick={handlePrintPDF}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 active:scale-95 transition-all shadow-lg"
        >
          <FileDown size={14}/> Imprimir DRE
        </button>
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar p-2 lg:p-4 print:p-0 print:overflow-visible bg-[#F8FAFC] print:bg-white">
        {reportView === 'dre' ? (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-white border border-slate-200 shadow-xl rounded-[2.5rem] overflow-hidden print:border-0 print:shadow-none print:max-w-none print:rounded-none">
              <div className="p-6 md:p-8 border-b border-slate-100 bg-[#F1F5F9]/30 print:p-4 print:pb-2">
                 <div className="flex justify-between items-end">
                    <div>
                      <h3 className="text-3xl md:text-4xl font-black text-slate-800 uppercase tracking-tighter leading-none mb-1">D.R.E</h3>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Demonstrativo de Resultado do Exercício</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Período de Referência</p>
                      <p className="text-base font-mono font-black text-slate-900 uppercase">{formattedLabel()}</p>
                    </div>
                 </div>
              </div>

              <div className="p-6 md:p-10 space-y-1.5 print:p-4 print:space-y-1">
                <DRETitle label="1. RECEITA OPERACIONAL BRUTA" value={analytics.dre.receitaBruta} />
                <DRERow label="(+) Vendas em Dinheiro" value={analytics.dre.faturamento.dinheiro} rb={rb} />
                <DRERow label="(+) Recebimentos PIX" value={analytics.dre.faturamento.pix} rb={rb} />
                <DRERow label="(+) Vendas em Cartão (Crédito/Débito)" value={analytics.dre.faturamento.debito + analytics.dre.faturamento.credito} rb={rb} />
                <div className="h-2 print:h-1"></div>
                <DRERow label="(-) Taxas Adm. de Cartão" value={analytics.dre.taxasMaquininha} rb={rb} isNegative />
                <DRERow label="(-) Impostos sobre Vendas" value={analytics.dre.impostos} rb={rb} isNegative />
                <DRESubtotal label="(=) RECEITA OPERACIONAL LÍQUIDA" value={analytics.dre.receitaLiquida} rb={rb} />
                <div className="h-2 print:h-1"></div>
                <DRERow label="(-) Custo Mercadoria Vendida (CMV)" value={analytics.dre.cmv} rb={rb} isNegative />
                <DRESubtotal label="(=) MARGEM DE CONTRIBUIÇÃO" value={analytics.dre.lucroBruto} rb={rb} highlight />
                <div className="h-2 print:h-1"></div>
                <DRERow label="(-) Despesas Administrativas Fixas" value={analytics.dre.despesasFixas} rb={rb} isNegative />
                <DRERow label="(-) Outras Despesas Variáveis" value={analytics.dre.despesasVariaveisOutras} rb={rb} isNegative />
                <div className="h-4 print:h-2"></div>
                <div className="bg-slate-900 text-white rounded-[1.5rem] p-6 md:p-8 flex flex-col md:flex-row justify-between items-center shadow-xl relative overflow-hidden print:bg-black print:p-6">
                  <div className="z-10 text-center md:text-left">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 block">Resultado Final</span>
                    <h4 className="text-3xl font-black uppercase tracking-tighter italic">LUCRO LÍQUIDO</h4>
                    <div className="mt-1 flex items-center gap-2 px-2 py-0.5 bg-white/10 rounded inline-flex">
                      <span className="text-[9px] font-black text-slate-200 uppercase">Margem:</span>
                      <span className="text-[11px] font-mono font-black text-emerald-400">
                        {formatPercent(analytics.dre.lucroLiquido / rb)}
                      </span>
                    </div>
                  </div>
                  <div className="z-10 mt-4 md:mt-0 text-center md:text-right">
                     <p className={`text-5xl md:text-6xl font-mono font-black tracking-tighter ${analytics.dre.lucroLiquido >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                      {formatMoney(analytics.dre.lucroLiquido)}
                     </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-8 rounded-[2.5rem] shadow-xl no-print print:hidden">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center shadow-inner">
                    <LineChartIcon size={24}/>
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest leading-none mb-1">Tendência de Lucratividade</h4>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Análise consolidada dos últimos 12 meses</p>
                  </div>
                </div>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analytics.dre.historyTrend} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis dataKey="name" fontSize={10} fontWeight="900" axisLine={false} tickLine={false} dy={10} tick={{ fill: '#94a3b8' }} />
                    <YAxis fontSize={9} fontWeight="900" axisLine={false} tickLine={false} tickFormatter={(v) => `R$ ${v/1000}k`} tick={{ fill: '#94a3b8' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <ReferenceLine y={0} stroke="#cbd5e1" strokeWidth={2} />
                    <Line type="monotone" dataKey="lucro" stroke="#2563eb" strokeWidth={4} dot={{ r: 6, fill: '#2563eb', strokeWidth: 3, stroke: '#fff' }} activeDot={{ r: 8, fill: '#1d4ed8', strokeWidth: 0 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="bg-white border border-slate-200 p-6 rounded-[2rem] shadow-sm space-y-4">
                <div className="flex items-center gap-2">
                  <Filter size={14} className="text-slate-400"/>
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Filtro de Natureza de Gastos</h4>
                </div>
                <div className="flex flex-wrap gap-2">
                   {NATURES.map(nature => (
                     <button
                        key={nature}
                        onClick={() => toggleNature(nature)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[9px] font-black uppercase transition-all ${
                          selectedNatures.includes(nature) 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm' 
                            : 'bg-white text-slate-400 border-slate-100 hover:bg-slate-50'
                        }`}
                     >
                       {selectedNatures.includes(nature) ? <CheckCircle2 size={12}/> : <Circle size={12}/>}
                       {nature}
                     </button>
                   ))}
                </div>
             </div>

             <div className="bg-white border border-slate-200 p-8 rounded-[2.5rem] shadow-xl">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center shadow-inner">
                    <BarChart3 size={24}/>
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest leading-none mb-1">Composição dos Gastos</h4>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Distribuição por natureza no período selecionado</p>
                  </div>
                </div>

                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.audit.compositionData} layout="vertical" margin={{ top: 0, right: 30, left: 100, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#F1F5F9" />
                      <XAxis type="number" hide />
                      <YAxis 
                        dataKey="nature" 
                        type="category" 
                        fontSize={9} 
                        fontWeight="900" 
                        axisLine={false} 
                        tickLine={false} 
                        width={100}
                        tick={{ fill: '#64748b' }}
                      />
                      <Tooltip content={<CustomTooltip />} cursor={{fill: 'transparent'}} />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                        {analytics.audit.compositionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : '#334155'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
             </div>

             <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xl">
                <div className="p-6 border-b border-slate-100 flex items-center gap-4 bg-slate-50/50">
                  <div className="w-10 h-10 bg-emerald-500 text-white rounded-xl flex items-center justify-center shadow-lg">
                    <ClipboardList size={20}/>
                  </div>
                  <div>
                     <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Detalhamento Auditado</h3>
                     <p className="text-[9px] font-bold text-slate-400 uppercase">Lista de pagamentos efetuados no período com filtros aplicados</p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-slate-900 text-white">
                        <th className="px-6 py-4 text-left text-[9px] font-black uppercase tracking-widest">Vencimento</th>
                        <th className="px-6 py-4 text-left text-[9px] font-black uppercase tracking-widest">Descrição / Fornecedor</th>
                        <th className="px-6 py-4 text-left text-[9px] font-black uppercase tracking-widest">Natureza</th>
                        <th className="px-6 py-4 text-right text-[9px] font-black uppercase tracking-widest">Valor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {analytics.audit.items.map((row, i) => (
                        <tr key={i} className="hover:bg-slate-50 transition-colors group">
                          <td className="px-6 py-4 text-[10px] font-mono font-bold text-slate-400">
                            {new Date(row.dueDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                          </td>
                          <td className="px-6 py-4">
                             <p className="text-[11px] font-black text-slate-800 uppercase leading-none mb-0.5">{row.description}</p>
                             <p className="text-[8px] font-bold text-slate-400 uppercase">{row.supplier}</p>
                          </td>
                          <td className="px-6 py-4">
                             <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[8px] font-black uppercase border border-slate-200">
                               {row.nature}
                             </span>
                          </td>
                          <td className="px-6 py-4 text-right text-[11px] font-mono font-black text-rose-500">
                            {formatMoney(row.value)}
                          </td>
                        </tr>
                      ))}
                      {analytics.audit.items.length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-20 text-center text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] italic">
                            Sem registros para os filtros selecionados
                          </td>
                        </tr>
                      )}
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

const DRETitle = ({ label, value }: { label: string, value: number }) => (
  <div className="flex justify-between items-end pt-6 pb-2 border-b-2 border-slate-900 print:pt-4 print:pb-1">
    <span className="text-[13px] md:text-[14px] font-black text-slate-900 uppercase tracking-widest">{label}</span>
    <span className="text-[14px] md:text-[16px] font-mono font-black text-slate-900">{formatMoney(value)}</span>
  </div>
);

const DRERow = ({ label, value, rb, isNegative }: any) => {
  const percent = value / rb;
  return (
    <div className="flex justify-between items-center py-2 transition-colors hover:bg-slate-50 px-2 rounded-lg print:py-1">
      <div className="flex items-center gap-3">
        <span className={`text-[12px] md:text-[13px] font-bold ${isNegative ? 'text-slate-500' : 'text-slate-700'} uppercase tracking-tight`}>{label}</span>
        <span className="text-[9px] font-black px-1.5 py-0.5 bg-slate-100 text-slate-400 rounded-md">
          {formatPercent(percent)}
        </span>
      </div>
      <span className={`text-[12px] md:text-[13px] font-mono font-bold ${isNegative ? 'text-rose-500' : 'text-slate-800'}`}>
        {isNegative && value > 0 ? '-' : ''} {formatMoney(value)}
      </span>
    </div>
  );
};

const DRESubtotal = ({ label, value, rb, highlight }: any) => {
  const percent = value / rb;
  return (
    <div className={`flex justify-between items-center py-3 px-5 rounded-xl mt-2 border ${highlight ? 'bg-slate-900 border-slate-800 text-white shadow-md print:bg-black' : 'bg-slate-100 border-slate-200 text-slate-800'}`}>
      <div className="flex items-center gap-3">
        <span className="text-[12px] md:text-[13px] font-black uppercase tracking-widest">{label}</span>
        <span className={`text-[10px] font-mono font-black ${highlight ? 'text-emerald-400' : 'text-slate-500'}`}>
          {formatPercent(percent)}
        </span>
      </div>
      <span className={`text-xl font-mono font-black ${highlight ? 'text-white' : 'text-slate-900'}`}>
        {formatMoney(value)}
      </span>
    </div>
  );
};

export default Reports;
