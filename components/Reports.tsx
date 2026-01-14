
import React, { useMemo, useState } from 'react';
import { CashEntry, Expense, CardRates, ExpenseNature } from '../types';
import { db } from '../services/db';
import { NATURES } from '../constants';
import { 
  ChevronLeft, ChevronRight, FileDown, PieChart, ClipboardList, Settings2, Percent, BookOpen, Filter, BarChart3, TrendingDown, LayoutList, ArrowRight, CheckSquare, Square, RefreshCcw, TrendingUp, Activity, Info, TrendingDown as TrendDown, ShieldCheck, Target, Zap
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell, Legend, LineChart, Line, AreaChart, Area
} from 'recharts';

interface ReportsProps {
  entries: CashEntry[];
  expenses: Expense[];
}

const formatMoney = (val: number) => 
  val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });

type PeriodType = 'Diário' | 'Semanal' | 'Mensal' | 'Anual';
type ReportView = 'audit' | 'dre' | 'expenses';

const COLORS_CHART = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#64748b'];

const Reports: React.FC<ReportsProps> = ({ entries, expenses }) => {
  const [periodType, setPeriodType] = useState<PeriodType>('Mensal');
  const [reportView, setReportView] = useState<ReportView>('dre');
  const [baseDate, setBaseDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedNature, setSelectedNature] = useState<string>('TODAS');
  
  const [expenseFilters, setExpenseFilters] = useState<string[]>(Array.from(NATURES));
  
  const [rates, setRates] = useState<CardRates>(db.getCardRates());
  const [showRateSettings, setShowRateSettings] = useState(false);

  const handleSaveRates = (e: React.FormEvent) => {
    e.preventDefault();
    db.saveCardRates(rates);
    setShowRateSettings(false);
  };

  const toggleExpenseFilter = (nature: string) => {
    setExpenseFilters(prev => 
      prev.includes(nature) 
        ? prev.filter(n => n !== nature) 
        : [...prev, nature]
    );
  };

  const selectAllFilters = () => setExpenseFilters(Array.from(NATURES));
  const deselectAllFilters = () => setExpenseFilters([]);

  const analytics = useMemo(() => {
    const selectedDate = new Date(baseDate + 'T12:00:00');
    if (isNaN(selectedDate.getTime())) return null;
    
    const filterFn = (itemDate: string) => {
      const d = new Date(itemDate + 'T12:00:00');
      if (isNaN(d.getTime())) return false;
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
    
    const lucroOperacional = lucroBruto - despesasFixas - despesasVariaveisOutras;
    const lucroLiquido = lucroOperacional; 
    
    // Indicadores Chave
    const margemBruta = receitaLiquida > 0 ? (lucroBruto / receitaLiquida) * 100 : 0;
    const margemOperacional = receitaLiquida > 0 ? (lucroOperacional / receitaLiquida) * 100 : 0;
    const margemLiquida = receitaBruta > 0 ? (lucroLiquido / receitaBruta) * 100 : 0;
    const ticketMedio = periodEntries.length > 0 ? receitaBruta / periodEntries.length : 0;

    // EBITDA Simplificado (Lucro Operacional + Investimentos que não são custo direto)
    const investimentosEquip = periodExpenses.filter(e => e.nature === 'Equipamentos').reduce((acc, e) => acc + e.value, 0);
    const ebitda = lucroOperacional + investimentosEquip;

    const profitabilityTrend = [];
    const trendEnd = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    
    for (let i = 11; i >= 0; i--) {
      const d = new Date(trendEnd.getFullYear(), trendEnd.getMonth() - i, 1);
      const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      
      const mEntries = entries.filter(e => e.date.startsWith(mKey));
      const mExpenses = expenses.filter(e => e.status === 'Pago' && e.dueDate.startsWith(mKey));
      
      const mBruto = mEntries.reduce((acc, e) => acc + (e.cash + e.pix + e.credit + e.debit), 0);
      const mTaxas = mEntries.reduce((acc, e) => acc + (e.debit * (rates.debit/100) + e.credit * (rates.credit/100)), 0);
      const mPago = mExpenses.reduce((acc, e) => acc + e.value, 0);
      
      profitabilityTrend.push({
        name: d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
        lucro: mBruto - mTaxas - mPago
      });
    }

    const filteredPeriodExpenses = periodExpenses.filter(e => expenseFilters.includes(e.nature));
    const expenseDataMap: Record<string, number> = {};
    filteredPeriodExpenses.forEach(exp => {
      expenseDataMap[exp.nature] = (expenseDataMap[exp.nature] || 0) + exp.value;
    });
    
    const expenseTotalFiltered = filteredPeriodExpenses.reduce((acc, e) => acc + e.value, 0);
    const expenseTotalUnfiltered = periodExpenses.reduce((acc, e) => acc + e.value, 0);

    const expenseChartData = Object.entries(expenseDataMap)
      .map(([name, value]) => ({ 
        name, 
        value,
        percentage: expenseTotalFiltered > 0 ? (value / expenseTotalFiltered) * 100 : 0
      }))
      .sort((a, b) => b.value - a.value);

    const auditItems = periodExpenses.filter(exp => selectedNature === 'TODAS' || exp.nature === selectedNature);

    return {
      dre: {
        receitaBruta, faturamento, taxasMaquininha, impostos, receitaLiquida,
        cmv, lucroBruto, despesasFixas, despesasVariaveisOutras, lucroLiquido,
        margemLiquida, margemBruta, margemOperacional, ticketMedio, ebitda, revenueChartData
      },
      expenses: {
        chart: expenseChartData,
        totalFiltered: expenseTotalFiltered,
        totalUnfiltered: expenseTotalUnfiltered
      },
      audit: {
        items: auditItems.sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
        trend: profitabilityTrend
      }
    };
  }, [entries, expenses, periodType, baseDate, rates, selectedNature, expenseFilters]);

  const handleAdjustDate = (delta: number) => {
    const d = new Date(baseDate + 'T12:00:00');
    if (periodType === 'Diário') d.setDate(d.getDate() + delta);
    else if (periodType === 'Mensal') d.setMonth(d.getMonth() + delta);
    else if (periodType === 'Anual') d.setFullYear(d.getFullYear() + delta);
    setBaseDate(d.toISOString().split('T')[0]);
  };

  const formattedLabel = () => {
    const d = new Date(baseDate + 'T12:00:00');
    if (periodType === 'Diário') return d.toLocaleDateString('pt-BR');
    if (periodType === 'Mensal') return d.toLocaleDateString('pt-BR', {month: 'long', year: 'numeric'});
    return d.getFullYear().toString();
  };

  const handlePrint = () => {
    window.print();
  };

  if (!analytics) return null;

  return (
    <div className="flex-1 flex flex-col gap-4 overflow-hidden h-full print:overflow-visible print:h-auto">
      {/* Barra de Controles - Escondida no PDF */}
      <div className="bg-white border border-slate-200 p-3 flex flex-col lg:flex-row items-center justify-between gap-4 shrink-0 shadow-sm no-print rounded-2xl">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            {(['Diário', 'Mensal', 'Anual'] as PeriodType[]).map(p => (
              <button key={p} onClick={() => setPeriodType(p)} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${periodType === p ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>{p}</button>
            ))}
          </div>
          
          <div className="flex items-center gap-2">
             <button onClick={() => handleAdjustDate(-1)} className="p-2 bg-slate-50 border border-slate-200 rounded-lg"><ChevronLeft size={14}/></button>
             <div className="px-4 py-1.5 bg-slate-900 text-white rounded-lg font-mono font-bold text-[10px] min-w-[140px] text-center uppercase">
                {formattedLabel()}
             </div>
             <button onClick={() => handleAdjustDate(1)} className="p-2 bg-slate-50 border border-slate-200 rounded-lg"><ChevronRight size={14}/></button>
          </div>

          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button onClick={() => setReportView('dre')} className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${reportView === 'dre' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}><PieChart size={14}/> DRE</button>
            <button onClick={() => setReportView('expenses')} className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${reportView === 'expenses' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-400'}`}><BarChart3 size={14}/> Gastos</button>
            <button onClick={() => setReportView('audit')} className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${reportView === 'audit' ? 'bg-white text-green-600 shadow-sm' : 'text-slate-400'}`}><ClipboardList size={14}/> Auditoria</button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setShowRateSettings(!showRateSettings)} className="p-2 bg-white border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50"><Settings2 size={16}/></button>
          <button 
            onClick={handlePrint} 
            className="px-4 py-2 bg-slate-800 text-white rounded-xl font-black text-[10px] uppercase shadow-lg flex items-center gap-2 hover:bg-slate-700 active:scale-95 transition-all"
          >
            <FileDown size={14}/> PDF / IMPRIMIR
          </button>
        </div>
      </div>

      {showRateSettings && (
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xl no-print">
          <form onSubmit={handleSaveRates} className="flex flex-col md:flex-row items-end gap-6">
            <div className="flex-1 space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest"><Percent size={10}/> Taxa Débito (%)</label>
              <input type="number" step="0.01" className="w-full h-10 px-4 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-sm" value={rates.debit} onChange={e => setRates({...rates, debit: parseFloat(e.target.value)})}/>
            </div>
            <div className="flex-1 space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest"><Percent size={10}/> Taxa Crédito (%)</label>
              <input type="number" step="0.01" className="w-full h-10 px-4 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-sm" value={rates.credit} onChange={e => setRates({...rates, credit: parseFloat(e.target.value)})}/>
            </div>
            <button type="submit" className="h-10 px-8 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">Salvar Taxas</button>
          </form>
        </div>
      )}

      {/* Conteúdo Principal do Relatório */}
      <div className="flex-1 bg-white border border-slate-200 shadow-sm flex flex-col overflow-hidden rounded-3xl print:border-0 print:shadow-none print:bg-white print:overflow-visible print:block">
        
        {reportView === 'audit' && (
           <div className="p-4 border-b border-slate-100 flex items-center justify-between no-print bg-slate-50/50">
             <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Filter size={14} className="text-slate-400"/>
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Filtrar por Natureza:</span>
                </div>
                <select 
                  className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-[10px] font-black uppercase outline-none focus:border-blue-500"
                  value={selectedNature}
                  onChange={e => setSelectedNature(e.target.value)}
                >
                  <option value="TODAS">TODAS AS CATEGORIAS</option>
                  {NATURES.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
             </div>
             <div className="text-[11px] font-black text-slate-700">
               Total Pago (Auditado): <span className="text-red-600">{formatMoney(analytics.expenses.totalUnfiltered)}</span>
             </div>
           </div>
        )}

        <div className="flex-1 overflow-auto custom-scrollbar p-6 print:p-0 print:overflow-visible print:block">
          {reportView === 'dre' && (
            <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in print:max-w-none print:space-y-6 print:block">
              {/* Header do DRE no PDF */}
              <div className="flex flex-col gap-1 border-b-4 border-slate-900 pb-4 print:pb-4">
                <div className="flex justify-between items-end">
                  <h3 className="text-3xl font-black text-slate-800 uppercase tracking-tighter print:text-2xl">Demonstrativo de Resultado (DRE)</h3>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Relatório Administrativo</p>
                    <p className="text-[8px] font-bold text-slate-400">Gerado em: {new Date().toLocaleString('pt-BR')}</p>
                  </div>
                </div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em] mt-2">Período de Competência: {formattedLabel()}</p>
              </div>

              {/* Seção 1: Faturamento */}
              <div className="space-y-3 print:space-y-1">
                <DREHeader label="1. FATURAMENTO BRUTO" value={analytics.dre.receitaBruta} />
                <div className="h-16 w-full bg-slate-50 rounded-xl p-2 no-print">
                   <ResponsiveContainer width="100%" height="100%">
                      <BarChart layout="vertical" data={analytics.dre.revenueChartData} margin={{ left: 0, right: 30, top: 0, bottom: 0 }}>
                        <XAxis type="number" hide />
                        <YAxis type="category" dataKey="name" hide />
                        <Tooltip formatter={(val: number) => formatMoney(val)} />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={10}>
                          {analytics.dre.revenueChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                   </ResponsiveContainer>
                </div>
                <DRERow label="(+) Vendas em Dinheiro" value={analytics.dre.faturamento.dinheiro} indent />
                <DRERow label="(+) Vendas via Pix" value={analytics.dre.faturamento.pix} indent />
                <DRERow label="(+) Vendas Cartão de Débito" value={analytics.dre.faturamento.debito} indent />
                <DRERow label="(+) Vendas Cartão de Crédito" value={analytics.dre.faturamento.credito} indent />
                <DRERow label="(-) Taxas de Operadoras (Cartão)" value={analytics.dre.taxasMaquininha} indent negative />
                <DRERow label="(-) Impostos s/ Vendas" value={analytics.dre.impostos} indent negative />
                <DRESubtotal label="(=) RECEITA LÍQUIDA" value={analytics.dre.receitaLiquida} />
              </div>

              {/* Seção 2: Lucro Bruto */}
              <div className="space-y-1 pt-2">
                <DREHeader label="2. CUSTO DA MERCADORIA VENDIDA (CMV)" value={analytics.dre.cmv} negative />
                <DRERow label="(-) Insumos e Fornecedores de Estoque" value={analytics.dre.cmv} indent negative />
                <DRESubtotal label="(=) LUCRO BRUTO" value={analytics.dre.lucroBruto} highlight />
                <div className="pl-6 flex justify-between items-center py-2 bg-blue-50/30 rounded-lg px-4 print:bg-slate-50 print:border mt-2">
                   <span className="text-[10px] font-black text-slate-600 uppercase">Margem Bruta (Eficiência):</span>
                   <span className="text-[11px] font-mono font-black text-blue-700">{analytics.dre.margemBruta.toFixed(2)}%</span>
                </div>
              </div>

              {/* Seção 3: Despesas e EBITDA */}
              <div className="space-y-1 pt-2">
                <DREHeader label="3. DESPESAS OPERACIONAIS" value={analytics.dre.despesasFixas + analytics.dre.despesasVariaveisOutras} negative />
                <DRERow label="(-) Gastos Fixos (Aluguel, Salários, etc)" value={analytics.dre.despesasFixas} indent negative />
                <DRERow label="(-) Outros Gastos Variáveis" value={analytics.dre.despesasVariaveisOutras} indent negative />
                <div className="pl-6 flex justify-between items-center py-3 bg-slate-900 text-white rounded-xl mt-3 px-6 shadow-lg print:bg-slate-100 print:text-slate-900 print:shadow-none print:border print:border-slate-300">
                   <div className="flex flex-col">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest print:text-slate-500">Geração de Caixa Operacional</span>
                      <span className="text-[11px] font-black uppercase">EBITDA (LAJIDA)</span>
                   </div>
                   <span className="text-xl font-mono font-black text-green-400 print:text-slate-900">{formatMoney(analytics.dre.ebitda)}</span>
                </div>
              </div>

              {/* Resultado Final */}
              <div className="mt-8 p-10 bg-slate-900 rounded-[40px] text-white flex flex-col md:flex-row justify-between items-center shadow-2xl print:bg-slate-50 print:text-slate-900 print:rounded-2xl print:mt-6 print:p-6 print:shadow-none print:border-2 print:border-slate-800">
                 <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest opacity-50 print:text-slate-500">Resultado Final do Período</span>
                    <h4 className="text-4xl font-black uppercase tracking-tighter print:text-2xl">LUCRO LÍQUIDO</h4>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-[10px] font-black uppercase print:bg-white print:border print:text-green-700">Margem Líquida: {analytics.dre.margemLiquida.toFixed(2)}%</span>
                      <span className="bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full text-[10px] font-black uppercase print:bg-white print:border print:text-blue-700">Ticket Médio: {formatMoney(analytics.dre.ticketMedio)}</span>
                    </div>
                 </div>
                 <div className="text-center md:text-right">
                    <p className={`text-5xl font-mono font-black tracking-tighter print:text-3xl ${analytics.dre.lucroLiquido >= 0 ? 'text-green-400 print:text-green-700' : 'text-red-400 print:text-red-700'}`}>
                      {formatMoney(analytics.dre.lucroLiquido)}
                    </p>
                 </div>
              </div>

              {/* Glossário e Explicativos dos Indicadores Chave */}
              <div className="mt-16 pt-12 border-t border-slate-200 print:mt-12 print:pt-6 print:block">
                <div className="flex items-center gap-3 mb-8 print:mb-4">
                  <div className="p-2 bg-blue-600 text-white rounded-lg shadow-lg">
                    <BookOpen size={20} />
                  </div>
                  <h4 className="text-xl font-black text-slate-800 uppercase tracking-tight print:text-lg">Indicadores Chave da DRE</h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10 print:gap-4 print:grid-cols-2">
                  <IndicatorGlossaryItem 
                    icon={<Target size={14}/>}
                    title="Margem Bruta" 
                    formula="(Lucro Bruto ÷ Rec. Líquida) × 100"
                    description="Indica a eficiência nos custos diretos (CMV) e precificação. Uma margem alta mostra bom controle sobre as compras de estoque." 
                  />
                  <IndicatorGlossaryItem 
                    icon={<Activity size={14}/>}
                    title="Margem Operacional" 
                    formula="(Lucro Operacional ÷ Rec. Líquida) × 100"
                    description="Rentabilidade das operações centrais antes de juros e impostos. Avalia se o modelo de negócio é sustentável no dia a dia." 
                  />
                  <IndicatorGlossaryItem 
                    icon={<Zap size={14}/>}
                    title="EBITDA" 
                    formula="Lucro Operacional + Depreciação"
                    description="Geração de caixa operacional real. Útil para comparar a performance ignorando impostos e custos de financiamento." 
                  />
                  <IndicatorGlossaryItem 
                    icon={<ShieldCheck size={14}/>}
                    title="Margem Líquida" 
                    formula="(Lucro Líquido ÷ Rec. Líquida) × 100"
                    description="O percentual final que se converte em lucro para os sócios após todas as despesas. É o indicador mais direto de lucratividade final." 
                  />
                </div>

                <div className="mt-12 p-6 bg-slate-50 rounded-2xl border border-slate-100 print:mt-8 print:p-4 print:bg-white print:border-slate-300">
                  <div className="flex items-center gap-2 mb-2">
                    <Info size={14} className="text-blue-500" />
                    <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Nota Fiscal e Técnica</span>
                  </div>
                  <p className="text-[9px] font-medium text-slate-500 italic leading-relaxed">
                    Este relatório baseia-se no regime de caixa para fins administrativos. Os impostos e taxas configurados refletem as deduções automáticas aplicadas sobre o faturamento bruto declarado nos turnos de caixa.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Outras visões - Gastos e Auditoria seguem o mesmo padrão */}
          {reportView === 'expenses' && (
            <div className="max-w-6xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
                <div>
                  <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Composição dos Gastos</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Análise de investimento por natureza de despesa</p>
                </div>
                <div className="flex flex-wrap gap-2 no-print">
                   <button onClick={selectAllFilters} className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-[9px] font-black uppercase hover:bg-slate-200 transition-all"><CheckSquare size={12}/> Tudo</button>
                   <button onClick={deselectAllFilters} className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-[9px] font-black uppercase hover:bg-slate-200 transition-all"><Square size={12}/> Limpar</button>
                </div>
              </div>

              <div className="bg-white border border-slate-200 p-6 rounded-[24px] shadow-sm no-print">
                <div className="flex flex-wrap gap-2">
                   {NATURES.map(n => (
                     <button key={n} onClick={() => toggleExpenseFilter(n)} className={`px-3 py-1.5 rounded-full text-[9px] font-bold uppercase transition-all border ${expenseFilters.includes(n) ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'}`}>{n}</button>
                   ))}
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                <div className="xl:col-span-7 bg-white border border-slate-200 p-8 rounded-[32px] shadow-sm flex flex-col gap-6 h-[550px]">
                  <h4 className="text-[11px] font-black text-slate-700 uppercase tracking-widest flex items-center gap-2"><BarChart3 size={16}/> Ranking por Valor</h4>
                  <div className="flex-1">
                    {analytics.expenses.chart.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analytics.expenses.chart} layout="vertical" margin={{ left: 20, right: 40, top: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                          <XAxis type="number" hide />
                          <YAxis dataKey="name" type="category" fontSize={9} fontWeight="black" width={160} tickFormatter={(val) => val.toUpperCase()} axisLine={false} tickLine={false} />
                          <Tooltip formatter={(val: number) => formatMoney(val)} cursor={{fill: '#f8fafc', radius: 8}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', fontSize: '11px', fontWeight: 'bold'}} />
                          <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={26}>
                            {analytics.expenses.chart.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS_CHART[index % COLORS_CHART.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-slate-300">Sem dados para o filtro</div>
                    )}
                  </div>
                </div>

                <div className="xl:col-span-5 flex flex-col gap-6">
                  <div className="bg-slate-900 p-8 rounded-[32px] text-white shadow-xl">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Exibido</p>
                    <h4 className="text-3xl font-mono font-black text-orange-400">{formatMoney(analytics.expenses.totalFiltered)}</h4>
                    <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center">
                      <span className="text-[8px] font-bold text-slate-500 uppercase">Total Geral do Período</span>
                      <span className="text-[11px] font-black text-slate-300">{formatMoney(analytics.expenses.totalUnfiltered)}</span>
                    </div>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-[32px] overflow-hidden flex-1 shadow-sm flex flex-col">
                    <div className="p-5 bg-slate-50 border-b border-slate-200 flex items-center gap-2"><LayoutList size={16} className="text-slate-400"/><span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Detalhamento</span></div>
                    <div className="flex-1 overflow-auto custom-scrollbar">
                      <table className="w-full text-left">
                        <tbody className="divide-y divide-slate-100">
                          {analytics.expenses.chart.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                              <td className="px-5 py-4 flex items-center gap-3"><div className="w-1.5 h-6 rounded-full shrink-0" style={{backgroundColor: COLORS_CHART[idx % COLORS_CHART.length]}} /><div className="min-w-0"><p className="text-[10px] font-black text-slate-700 uppercase truncate">{item.name}</p><p className="text-[8px] font-black text-slate-400">{item.percentage.toFixed(1)}%</p></div></td>
                              <td className="px-5 py-4 text-right"><span className="text-[11px] font-mono font-black text-slate-900">{formatMoney(item.value)}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {reportView === 'audit' && (
            <div className="flex flex-col gap-8 animate-in fade-in print:block">
              <div className="bg-white border border-slate-200 p-8 rounded-[32px] shadow-sm flex flex-col gap-6 no-print">
                <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Projeção de Lucratividade</h4>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analytics.audit.trend}>
                      <defs><linearGradient id="colorLucroAudit" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient></defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" fontSize={9} fontWeight="black" axisLine={false} tickLine={false} />
                      <YAxis hide />
                      <Tooltip formatter={(val: number) => formatMoney(val)} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', fontSize: '11px', fontWeight: 'bold' }} />
                      <Area type="monotone" dataKey="lucro" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorLucroAudit)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="overflow-auto bg-slate-50/50 rounded-2xl border border-slate-100 print:bg-white print:border-0 print:overflow-visible print:block">
                <table className="w-full border-collapse">
                  <thead className="bg-slate-50 border-b print:bg-slate-100">
                    <tr>
                      <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase">Pagamento</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase">Descrição / Fornecedor</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase">Natureza</th>
                      <th className="px-6 py-4 text-right text-[10px] font-black text-red-600 uppercase">Valor Pago R$</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {analytics.audit.items.map((row, i) => (
                      <tr key={i} className="hover:bg-white transition-colors">
                        <td className="px-6 py-4 text-[11px] font-mono font-bold text-slate-600">{new Date(row.dueDate + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
                        <td className="px-6 py-4"><div className="text-[11px] font-black text-slate-800 uppercase">{row.supplier || row.description}</div><div className="text-[9px] font-bold text-slate-400 uppercase">{row.description}</div></td>
                        <td className="px-6 py-4"><span className="text-[9px] font-black px-2 py-0.5 bg-white border border-slate-100 text-slate-500 rounded uppercase">{row.nature}</span></td>
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
  <div className="flex justify-between items-center py-2.5 border-b-2 border-slate-800 print:py-1.5 print:border-slate-400">
    <span className="text-[11px] font-black text-slate-800 uppercase tracking-wider print:text-[10px]">{label}</span>
    <span className={`text-[11px] font-mono font-black print:text-[10px] ${negative ? 'text-red-600' : 'text-slate-900'}`}>{formatMoney(value)}</span>
  </div>
);

const DRERow = ({ label, value, indent, negative }: any) => (
  <div className={`flex justify-between items-center py-1.5 print:py-1 ${indent ? 'pl-6 print:pl-3' : ''}`}>
    <span className="text-[10px] font-bold text-slate-500 uppercase print:text-[9px]">{label}</span>
    <span className={`text-[10px] font-mono font-bold print:text-[9px] ${negative ? 'text-red-500' : 'text-slate-600'}`}>
      {negative && value > 0 ? '-' : ''} {formatMoney(value)}
    </span>
  </div>
);

const DRESubtotal = ({ label, value, highlight }: any) => (
  <div className={`flex justify-between items-center py-4 px-6 rounded-2xl mt-2 print:py-2 print:px-4 print:rounded-lg ${highlight ? 'bg-blue-600 text-white shadow-xl shadow-blue-100 print:bg-slate-200 print:text-slate-900 print:shadow-none print:border' : 'bg-slate-100 print:bg-slate-50'}`}>
    <span className={`text-[11px] font-black uppercase print:text-[9px] ${highlight ? 'text-white print:text-slate-900' : 'text-slate-700'}`}>{label}</span>
    <span className={`text-base font-mono font-black print:text-[11px] ${highlight ? 'text-white print:text-slate-900' : (value >= 0 ? 'text-slate-900' : 'text-red-700')}`}>{formatMoney(value)}</span>
  </div>
);

const IndicatorGlossaryItem = ({ title, formula, description, icon }: any) => (
  <div className="space-y-1.5 border-l-4 border-slate-200 pl-4 hover:border-blue-600 transition-colors group print:pl-3 print:space-y-1 print:border-slate-300">
    <div className="flex items-center gap-2">
      <div className="w-7 h-7 rounded bg-slate-900 text-white flex items-center justify-center text-[9px] font-black shrink-0 print:w-5 print:h-5 print:text-[8px] group-hover:bg-blue-600 transition-colors">
        {icon}
      </div>
      <h5 className="text-[11px] font-black text-slate-800 uppercase tracking-tight print:text-[10px]">{title}</h5>
    </div>
    {formula && (
      <div className="flex items-center gap-1.5 text-[8px] font-black text-blue-600 uppercase bg-blue-50 px-2 py-0.5 rounded inline-block print:text-[7px]">
        Fórmula: {formula}
      </div>
    )}
    <p className="text-[10px] font-medium text-slate-500 leading-tight text-justify print:text-[8px]">{description}</p>
  </div>
);

export default Reports;
