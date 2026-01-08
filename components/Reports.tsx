
import React, { useMemo, useState } from 'react';
import { CashEntry, Expense, CardRates, ExpenseNature } from '../types';
import { db } from '../services/db';
import { NATURES } from '../constants';
import { 
  ChevronLeft, ChevronRight, FileDown, PieChart, ClipboardList, Settings2, Percent, BookOpen, Filter, BarChart3, TrendingDown, LayoutList, ArrowRight
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell, Legend
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
  const [rates, setRates] = useState<CardRates>(db.getCardRates());
  const [showRateSettings, setShowRateSettings] = useState(false);

  const handleSaveRates = (e: React.FormEvent) => {
    e.preventDefault();
    db.saveCardRates(rates);
    setShowRateSettings(false);
  };

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

    const receitaBruta = faturamento.dinheiro + faturamento.pix + faturamento.debito + faturamento.credito;
    const taxasMaquininha = (faturamento.debito * (rates.debit / 100)) + (faturamento.credito * (rates.credit / 100));
    const impostos = periodExpenses.filter(e => e.nature === 'Impostos').reduce((acc, e) => acc + e.value, 0);
    const receitaLiquida = receitaBruta - taxasMaquininha - impostos;

    const cmv = periodExpenses.filter(e => e.nature === 'Custo da Mercadoria Vendida (CMV)').reduce((acc, e) => acc + e.value, 0);
    const lucroBruto = receitaLiquida - cmv;

    const despesasFixas = periodExpenses.filter(e => e.costType === 'Fixo').reduce((acc, e) => acc + e.value, 0);
    const despesasVariaveisOutras = periodExpenses.filter(e => e.costType === 'Variável' && e.nature !== 'Custo da Mercadoria Vendida (CMV)' && e.nature !== 'Impostos').reduce((acc, e) => acc + e.value, 0);
    
    const lucroLiquido = lucroBruto - despesasFixas - despesasVariaveisOutras;
    const margemLiquida = receitaBruta > 0 ? (lucroLiquido / receitaBruta) * 100 : 0;
    const ticketMedio = periodEntries.length > 0 ? receitaBruta / periodEntries.length : 0;

    // Dados para Gráficos de Despesas
    const expenseDataMap: Record<string, number> = {};
    periodExpenses.forEach(exp => {
      expenseDataMap[exp.nature] = (expenseDataMap[exp.nature] || 0) + exp.value;
    });
    
    const expenseTotal = periodExpenses.reduce((acc, e) => acc + e.value, 0);
    const expenseChartData = Object.entries(expenseDataMap)
      .map(([name, value]) => ({ 
        name, 
        value,
        percentage: expenseTotal > 0 ? (value / expenseTotal) * 100 : 0
      }))
      .sort((a, b) => b.value - a.value);

    // Listagem filtrada para Auditoria
    const auditItems = periodExpenses.filter(exp => selectedNature === 'TODAS' || exp.nature === selectedNature);

    return {
      dre: {
        receitaBruta, faturamento, taxasMaquininha, impostos, receitaLiquida,
        cmv, lucroBruto, despesasFixas, despesasVariaveisOutras, lucroLiquido,
        margemLiquida, ticketMedio
      },
      expenses: {
        chart: expenseChartData,
        total: expenseTotal
      },
      audit: auditItems.sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    };
  }, [entries, expenses, periodType, baseDate, rates, selectedNature]);

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

  if (!analytics) return null;

  return (
    <div className="flex-1 flex flex-col gap-4 overflow-hidden h-full">
      {/* HEADER CONTROLS */}
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
          <button onClick={() => window.print()} className="px-4 py-2 bg-slate-800 text-white rounded-xl font-black text-[10px] uppercase shadow-lg flex items-center gap-2"><FileDown size={14}/> PDF</button>
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

      <div className="flex-1 bg-white border border-slate-200 shadow-sm flex flex-col overflow-hidden rounded-3xl">
        {/* FILTRO DE CATEGORIA PARA AUDITORIA E GASTOS */}
        {(reportView === 'audit' || reportView === 'expenses') && (
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
               Pago no Período: <span className="text-red-600">{formatMoney(analytics.expenses.total)}</span>
             </div>
           </div>
        )}

        <div className="flex-1 overflow-auto custom-scrollbar p-6">
          {reportView === 'dre' && (
            <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in">
              <div className="flex flex-col gap-1 border-b pb-4">
                <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Demonstrativo de Resultado (DRE)</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Competência: {formattedLabel()}</p>
              </div>

              <div className="space-y-1">
                <DREHeader label="1. FATURAMENTO BRUTO" value={analytics.dre.receitaBruta} />
                <DRERow label="(+) Vendas em Espécie (Dinheiro)" value={analytics.dre.faturamento.dinheiro} indent />
                <DRERow label="(+) Vendas via Pix" value={analytics.dre.faturamento.pix} indent />
                <DRERow label="(+) Vendas Cartão de Débito" value={analytics.dre.faturamento.debito} indent />
                <DRERow label="(+) Vendas Cartão de Crédito" value={analytics.dre.faturamento.credito} indent />
                <DRERow label={`(-) Taxas Maquininha`} value={analytics.dre.taxasMaquininha} indent negative />
                <DRERow label="(-) Impostos s/ Faturamento" value={analytics.dre.impostos} indent negative />
                <DRESubtotal label="(=) RECEITA LÍQUIDA" value={analytics.dre.receitaLiquida} />
              </div>

              <div className="space-y-1 pt-4">
                <DREHeader label="2. CUSTO DA MERCADORIA VENDIDA (CMV)" value={analytics.dre.cmv} negative />
                <DRERow label="(-) Custo Real da Operação" value={analytics.dre.cmv} indent negative />
                <DRESubtotal label="(=) LUCRO BRUTO" value={analytics.dre.lucroBruto} highlight />
              </div>

              <div className="space-y-1 pt-4">
                <DREHeader label="3. DESPESAS OPERACIONAIS" value={analytics.dre.despesasFixas + analytics.dre.despesasVariaveisOutras} negative />
                <DRERow label="(-) Despesas Fixas (Estrutura)" value={analytics.dre.despesasFixas} indent negative />
                <DRERow label="(-) Outras Variáveis" value={analytics.dre.despesasVariaveisOutras} indent negative />
              </div>

              <div className="mt-12 p-10 bg-slate-900 rounded-[40px] text-white flex flex-col md:flex-row justify-between items-center shadow-2xl">
                 <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest opacity-50">Linha de Chegada</span>
                    <h4 className="text-4xl font-black uppercase tracking-tighter">LUCRO LÍQUIDO</h4>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-[10px] font-black uppercase">Margem: {analytics.dre.margemLiquida.toFixed(2)}%</span>
                      <span className="bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full text-[10px] font-black uppercase">Ticket Médio: {formatMoney(analytics.dre.ticketMedio)}</span>
                    </div>
                 </div>
                 <div className="text-center md:text-right">
                    <p className={`text-5xl font-mono font-black tracking-tighter ${analytics.dre.lucroLiquido >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {formatMoney(analytics.dre.lucroLiquido)}
                    </p>
                 </div>
              </div>

              <div className="mt-16 pt-12 border-t border-slate-200">
                <div className="flex items-center gap-3 mb-8">
                  <BookOpen className="text-blue-600" size={24} />
                  <h4 className="text-lg font-black text-slate-800 uppercase tracking-tight">Glossário de Indicadores</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <GlossaryItem number="1" title="Faturamento Bruto" description="Volume total de vendas antes de qualquer desconto ou taxa." />
                  <GlossaryItem number="2" title="CMV" description="Custo real das mercadorias que saíram do estoque no período." />
                  <GlossaryItem number="3" title="Despesas Operacionais" description="Custos necessários para manter a loja aberta (aluguel, salários, energia)." />
                  <GlossaryItem number="4" title="Margem Líquida" description="Qual a porcentagem de lucro real sobre cada venda realizada." />
                </div>
              </div>
            </div>
          )}

          {reportView === 'expenses' && (
            <div className="max-w-5xl mx-auto space-y-10 animate-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col gap-2">
                <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Composição dos Gastos</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Análise de custos fixos e variáveis por categoria</p>
              </div>

              {/* GRÁFICO DE BARRAS REFAZIDO - COMPOSIÇÃO DE GASTOS */}
              <div className="bg-white border border-slate-200 p-8 rounded-[32px] shadow-sm flex flex-col gap-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 text-orange-600 rounded-xl">
                      <BarChart3 size={20}/>
                    </div>
                    <span className="text-[11px] font-black text-slate-700 uppercase tracking-widest">Ranking de Investimento por Natureza</span>
                  </div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-2">
                    Total em {formattedLabel()}: <span className="text-slate-900 font-black">{formatMoney(analytics.expenses.total)}</span>
                  </div>
                </div>

                <div className="h-[500px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={analytics.expenses.chart} 
                      layout="vertical" 
                      margin={{ left: 40, right: 40, top: 10, bottom: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                      <XAxis type="number" hide />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        fontSize={9} 
                        fontWeight="black" 
                        width={150} 
                        tickFormatter={(val) => val.toUpperCase()} 
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip 
                        formatter={(val: number) => formatMoney(val)} 
                        cursor={{fill: '#f8fafc', radius: 8}} 
                        contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', fontSize: '11px', fontWeight: 'bold'}}
                      />
                      <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={28}>
                        {analytics.expenses.chart.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS_CHART[index % COLORS_CHART.length]} fillOpacity={0.85} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* TABELA DE RESUMO DETALHADO */}
              <div className="grid grid-cols-1 gap-4">
                 <div className="bg-slate-50 border border-slate-200 rounded-[24px] overflow-hidden">
                    <div className="p-4 bg-white border-b border-slate-200 flex items-center gap-2">
                       <LayoutList size={16} className="text-slate-400"/>
                       <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Tabela de Participação</span>
                    </div>
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-50">
                          <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Natureza</th>
                          <th className="px-6 py-4 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest">Participação (%)</th>
                          <th className="px-6 py-4 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">Valor Investido</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {analytics.expenses.chart.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/80 transition-colors group">
                            <td className="px-6 py-4 flex items-center gap-4">
                              <div className="w-2 h-6 rounded-full" style={{backgroundColor: COLORS_CHART[idx % COLORS_CHART.length]}} />
                              <div>
                                <p className="text-[11px] font-black text-slate-700 uppercase leading-none mb-1">{item.name}</p>
                                <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <span className="text-[8px] font-bold text-slate-400 uppercase">Ver detalhes</span>
                                  <ArrowRight size={10} className="text-slate-300"/>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col items-center gap-1">
                                <span className="text-[10px] font-black text-slate-900">{item.percentage.toFixed(1)}%</span>
                                <div className="w-24 h-1 bg-slate-100 rounded-full overflow-hidden">
                                   <div className="h-full bg-slate-400" style={{ width: `${item.percentage}%` }} />
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <span className="text-[12px] font-mono font-black text-slate-900">{formatMoney(item.value)}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                 </div>
              </div>
            </div>
          )}

          {reportView === 'audit' && (
            <div className="overflow-auto animate-in fade-in">
              <table className="w-full border-collapse">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase">Data Pago</th>
                    <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase">Descrição / Fornecedor</th>
                    <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase">Natureza</th>
                    <th className="px-6 py-4 text-center text-[10px] font-black text-slate-500 uppercase">Tipo</th>
                    <th className="px-6 py-4 text-right text-[10px] font-black text-red-600 uppercase">Valor Pago R$</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {analytics.audit.map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-[11px] font-mono font-bold text-slate-600">
                        {new Date(row.dueDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-[11px] font-black text-slate-800 uppercase">{row.supplier || row.description}</div>
                        <div className="text-[9px] font-bold text-slate-400 uppercase">{row.description}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[9px] font-black px-2 py-0.5 bg-slate-100 text-slate-500 rounded uppercase">{row.nature}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                         <span className={`text-[8px] font-black px-2 py-0.5 rounded ${row.costType === 'Fixo' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-700'}`}>{row.costType}</span>
                      </td>
                      <td className="px-6 py-4 text-right text-[11px] font-mono font-black text-red-600">
                        {formatMoney(row.value)}
                      </td>
                    </tr>
                  ))}
                  {analytics.audit.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-20 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest italic">
                        Nenhum registro encontrado para os filtros selecionados
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const DREHeader = ({ label, value, negative }: any) => (
  <div className="flex justify-between items-center py-2.5 border-b-2 border-slate-800">
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
  <div className={`flex justify-between items-center py-4 px-6 rounded-2xl mt-2 ${highlight ? 'bg-blue-600 text-white shadow-xl shadow-blue-100' : 'bg-slate-100'}`}>
    <span className={`text-[11px] font-black uppercase ${highlight ? 'text-white' : 'text-slate-700'}`}>{label}</span>
    <span className={`text-base font-mono font-black ${highlight ? 'text-white' : (value >= 0 ? 'text-slate-900' : 'text-red-700')}`}>{formatMoney(value)}</span>
  </div>
);

const GlossaryItem = ({ number, title, description }: any) => (
  <div className="space-y-2 border-l-2 border-slate-100 pl-4 hover:border-blue-500 transition-colors">
    <div className="flex items-center gap-2">
      <span className="w-6 h-6 rounded-lg bg-slate-900 text-white flex items-center justify-center text-[10px] font-black shrink-0">{number}</span>
      <h5 className="text-[11px] font-black text-slate-800 uppercase tracking-tight">{title}</h5>
    </div>
    <p className="text-[10px] font-medium text-slate-500 leading-relaxed text-justify">{description}</p>
  </div>
);

export default Reports;
