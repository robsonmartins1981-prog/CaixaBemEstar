
import React, { useMemo, useState } from 'react';
import { CashEntry, Expense, ShiftType } from '../types';
import { SHIFTS } from '../constants';
import { 
  Calendar, FileSpreadsheet, FileText, TrendingUp, 
  Scale, Filter, ChevronLeft, ChevronRight, Trophy, Target, BarChart2, Download, FileDown
} from 'lucide-react';

interface ReportsProps {
  entries: CashEntry[];
  expenses: Expense[];
}

type PeriodType = 'Diário' | 'Semanal' | 'Mensal' | 'Anual';

const Reports: React.FC<ReportsProps> = ({ entries, expenses }) => {
  const [periodType, setPeriodType] = useState<PeriodType>('Mensal');
  const [baseDate, setBaseDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedShift, setSelectedShift] = useState<ShiftType | 'TODOS'>('TODOS');

  const analytics = useMemo(() => {
    const selectedDate = new Date(baseDate + 'T12:00:00');
    
    const filterFn = (itemDate: string, itemShift?: string) => {
      const d = new Date(itemDate + 'T12:00:00');
      
      // Filtro de Turno
      if (selectedShift !== 'TODOS' && itemShift && itemShift !== selectedShift) return false;

      // Filtro de Período
      if (periodType === 'Diário') return d.toDateString() === selectedDate.toDateString();
      if (periodType === 'Semanal') {
        const start = new Date(selectedDate);
        start.setDate(selectedDate.getDate() - selectedDate.getDay());
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        return d >= start && d <= end;
      }
      if (periodType === 'Mensal') return d.getMonth() === selectedDate.getMonth() && d.getFullYear() === selectedDate.getFullYear();
      if (periodType === 'Anual') return d.getFullYear() === selectedDate.getFullYear();
      
      return false;
    };

    const periodEntries = entries.filter(e => filterFn(e.date, e.shift));
    const periodExpenses = expenses.filter(e => e.status === 'Pago' && filterFn(e.dueDate));

    const totalIn = periodEntries.reduce((acc, curr) => acc + (curr.cash + curr.pix + curr.credit + curr.debit), 0);
    const totalOut = periodExpenses.reduce((acc, curr) => acc + curr.value, 0);

    const salesByDay: Record<string, number> = {};
    periodEntries.forEach(e => {
      salesByDay[e.date] = (salesByDay[e.date] || 0) + (e.cash + e.pix + e.credit + e.debit);
    });
    const bestDayDate = Object.keys(salesByDay).reduce((a, b) => salesByDay[a] > salesByDay[b] ? a : b, '');
    const bestDayValue = bestDayDate ? salesByDay[bestDayDate] : 0;

    const salesByShift: Record<string, number> = { 'CAIXA 01 (MANHÃ)': 0, 'CAIXA 02 (TARDE)': 0, 'CAIXA 03 (NOITE)': 0 };
    periodEntries.forEach(e => { salesByShift[e.shift] += (e.cash + e.pix + e.credit + e.debit); });
    const bestShift = Object.keys(salesByShift).reduce((a, b) => salesByShift[a] > salesByShift[b] ? a : b, '');

    const salesByWeek: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    periodEntries.forEach(e => {
      const day = new Date(e.date + 'T12:00:00').getDate();
      const weekNum = Math.ceil(day / 7);
      salesByWeek[weekNum] = (salesByWeek[weekNum] || 0) + (e.cash + e.pix + e.credit + e.debit);
    });
    const bestWeek = Object.keys(salesByWeek).reduce((a, b) => salesByWeek[Number(a)] > salesByWeek[Number(b)] ? a : b, '1');

    return {
      totalIn,
      totalOut,
      balance: totalIn - totalOut,
      filteredEntries: periodEntries,
      filteredExpenses: periodExpenses,
      insights: {
        bestDayDate,
        bestDayValue,
        bestShift,
        bestWeek,
        salesByShift
      }
    };
  }, [entries, expenses, periodType, baseDate, selectedShift]);

  const handleAdjustDate = (delta: number) => {
    const d = new Date(baseDate + 'T12:00:00');
    if (periodType === 'Diário') d.setDate(d.getDate() + delta);
    else if (periodType === 'Semanal') d.setDate(d.getDate() + (delta * 7));
    else if (periodType === 'Mensal') d.setMonth(d.getMonth() + delta);
    else if (periodType === 'Anual') d.setFullYear(d.getFullYear() + delta);
    setBaseDate(d.toISOString().split('T')[0]);
  };

  const handleExportCSV = () => {
    const headers = ["Data", "Caixa", "Tipo Operacao", "Entrada (+)", "Saida (-)"];
    const rows = [
      ...analytics.filteredEntries.map(e => [
        new Date(e.date + 'T12:00:00').toLocaleDateString('pt-BR'),
        e.shift.split(' ')[1],
        "Vendas de Balcao",
        (e.cash + e.pix + e.credit + e.debit).toFixed(2),
        "0.00"
      ]),
      ...analytics.filteredExpenses.map(e => [
        new Date(e.dueDate + 'T12:00:00').toLocaleDateString('pt-BR'),
        "ADMN",
        e.description,
        "0.00",
        e.value.toFixed(2)
      ])
    ];

    const csvContent = [headers, ...rows].map(e => e.join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `auditoria_bemestar_${periodType}_${baseDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = () => {
    const originalTitle = document.title;
    const dateStr = new Date().toISOString().split('T')[0];
    // Altera o título do documento temporariamente para influenciar o nome do arquivo PDF sugerido pelo navegador
    document.title = `relatorio_auditoria_${dateStr}`;
    window.print();
    document.title = originalTitle;
  };

  const formattedDateRange = () => {
    const d = new Date(baseDate + 'T12:00:00');
    if (periodType === 'Diário') return d.toLocaleDateString('pt-BR');
    if (periodType === 'Mensal') return d.toLocaleDateString('pt-BR', {month: 'long', year: 'numeric'});
    if (periodType === 'Anual') return d.getFullYear().toString();
    return baseDate;
  };

  return (
    <div className="flex-1 flex flex-col gap-4 overflow-hidden h-full">
      {/* CABEÇALHO DE IMPRESSÃO (INVISÍVEL NA TELA) */}
      <div className="hidden print:block border-b-4 border-slate-900 pb-4 mb-6">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tighter text-slate-900">Relatório de Auditoria Financeira</h1>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Bem Estar - Sistema de Gestão</p>
          </div>
          <div className="text-right text-[10px] font-black uppercase text-slate-400">
            Gerado em: {new Date().toLocaleString('pt-BR')}
          </div>
        </div>
        <div className="flex gap-8 mt-4 pt-4 border-t border-slate-100">
          <div>
            <span className="text-[8px] font-black text-slate-400 uppercase block">Período Analisado</span>
            <span className="text-xs font-bold uppercase">{periodType}: {formattedDateRange()}</span>
          </div>
          <div>
            <span className="text-[8px] font-black text-slate-400 uppercase block">Terminal/Filtro</span>
            <span className="text-xs font-bold uppercase">{selectedShift === 'TODOS' ? 'Todos os Caixas' : selectedShift}</span>
          </div>
        </div>
      </div>

      {/* HEADER DE FILTROS AVANÇADOS */}
      <div className="bg-white border border-slate-200 p-3 flex flex-col lg:flex-row items-center justify-between gap-4 shrink-0 shadow-sm no-print">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex bg-slate-100 p-1 rounded-lg">
            {(['Diário', 'Semanal', 'Mensal', 'Anual'] as PeriodType[]).map(p => (
              <button key={p} onClick={() => setPeriodType(p)} className={`px-3 py-1.5 rounded text-[9px] font-black uppercase transition-all ${periodType === p ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>{p}</button>
            ))}
          </div>

          <div className="h-6 w-px bg-slate-200 hidden lg:block" />

          <div className="flex items-center gap-2">
             <button onClick={() => handleAdjustDate(-1)} className="p-2 bg-slate-50 border border-slate-200 rounded hover:bg-white"><ChevronLeft size={14}/></button>
             <div className="px-3 py-1.5 bg-slate-900 text-white rounded font-mono font-bold text-[10px] min-w-[140px] text-center uppercase">
                {formattedDateRange()}
             </div>
             <button onClick={() => handleAdjustDate(1)} className="p-2 bg-slate-50 border border-slate-200 rounded hover:bg-white"><ChevronRight size={14}/></button>
          </div>

          <div className="h-6 w-px bg-slate-200 hidden lg:block" />

          <div className="flex items-center gap-2">
            <Filter size={14} className="text-slate-400" />
            <select 
              className="bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-[10px] font-black uppercase outline-none focus:bg-white"
              value={selectedShift}
              onChange={(e) => setSelectedShift(e.target.value as any)}
            >
              <option value="TODOS">Todos os Caixas</option>
              {SHIFTS.map(s => <option key={s} value={s}>{s.split(' ')[1]}</option>)}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded font-black text-[10px] uppercase hover:bg-slate-50 transition-all active:scale-95"
            title="Baixar Planilha CSV"
          >
            <Download size={14}/> CSV
          </button>
          <button 
            onClick={handleExportPDF} 
            className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded font-black text-[10px] uppercase shadow-md hover:bg-green-600 transition-all active:scale-95"
            title="Baixar Relatório PDF"
          >
            <FileDown size={14}/> Baixar PDF
          </button>
        </div>
      </div>

      {/* PAINEL DE INSIGHTS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 shrink-0">
        <InsightCard 
          label="Pico de Faturamento" 
          value={`R$ ${analytics.insights.bestDayValue.toLocaleString('pt-BR')}`}
          sub={analytics.insights.bestDayDate ? new Date(analytics.insights.bestDayDate + 'T12:00:00').toLocaleDateString('pt-BR') : '---'}
          icon={<Trophy size={18}/>}
          color="text-amber-600"
          bgColor="bg-amber-50"
        />
        <InsightCard 
          label="Melhor Terminal" 
          value={analytics.insights.bestShift.split(' ')[1]}
          sub={`${((analytics.insights.salesByShift[analytics.insights.bestShift] / (analytics.totalIn || 1)) * 100).toFixed(0)}% do volume total`}
          icon={<Target size={18}/>}
          color="text-blue-600"
          bgColor="bg-blue-50"
        />
        <InsightCard 
          label="Semana de Pico" 
          value={`${analytics.insights.bestWeek}ª Semana`}
          sub="Maior volume mensal"
          icon={<BarChart2 size={18}/>}
          color="text-purple-600"
          bgColor="bg-purple-50"
        />
        <div className="bg-slate-900 p-4 flex flex-col justify-center border-l-4 border-green-500 shadow-sm">
           <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Resultado do Período</span>
           <span className="text-xl font-mono font-black text-green-400 tracking-tighter">
             R$ {analytics.balance.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
           </span>
        </div>
      </div>

      {/* GRADE DE AUDITORIA */}
      <div className="flex-1 bg-white border border-slate-200 shadow-sm flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 bg-slate-100 z-10 shadow-sm">
              <tr className="border-b border-slate-200">
                <th className="px-6 py-3 text-left text-[9px] font-black text-slate-500 uppercase border-r border-slate-200">Data</th>
                <th className="px-6 py-3 text-left text-[9px] font-black text-slate-500 uppercase border-r border-slate-200">Caixa</th>
                <th className="px-6 py-3 text-left text-[9px] font-black text-slate-500 uppercase border-r border-slate-200">Tipo de Operação</th>
                <th className="px-6 py-3 text-right text-[9px] font-black text-slate-500 uppercase border-r border-slate-200">Entrada (+)</th>
                <th className="px-6 py-3 text-right text-[9px] font-black text-slate-500 uppercase">Saída (-)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {analytics.filteredEntries.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50">
                  <td className="px-6 py-3 text-[10px] font-mono font-bold border-r border-slate-100">
                    {new Date(e.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-6 py-3 border-r border-slate-100">
                    <span className="text-[9px] font-black text-slate-600 uppercase tracking-tighter">{e.shift.split(' ')[1]}</span>
                  </td>
                  <td className="px-6 py-3 text-[10px] font-bold text-slate-500 border-r border-slate-100 uppercase">Movimento de Vendas</td>
                  <td className="px-6 py-3 text-right text-[11px] font-mono font-black text-green-600 border-r border-slate-100 bg-green-50/20">
                    R$ {(e.cash + e.pix + e.credit + e.debit).toFixed(2)}
                  </td>
                  <td className="px-6 py-3 text-right text-[11px] font-mono font-bold text-slate-300">---</td>
                </tr>
              ))}
              
              {analytics.filteredExpenses.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50">
                  <td className="px-6 py-3 text-[10px] font-mono font-bold border-r border-slate-100">
                    {new Date(e.dueDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-6 py-3 border-r border-slate-100">
                    <span className="text-[9px] font-black text-slate-300 uppercase italic">Administrativo</span>
                  </td>
                  <td className="px-6 py-3 text-[10px] font-bold text-slate-700 border-r border-slate-100 uppercase">{e.description}</td>
                  <td className="px-6 py-3 text-right text-[11px] font-mono font-bold text-slate-300 border-r border-slate-100">---</td>
                  <td className="px-6 py-3 text-right text-[11px] font-mono font-black text-red-600 bg-red-50/20">
                    R$ {e.value.toFixed(2)}
                  </td>
                </tr>
              ))}

              {(analytics.filteredEntries.length === 0 && analytics.filteredExpenses.length === 0) && (
                <tr>
                  <td colSpan={5} className="py-24 text-center text-[11px] font-black text-slate-200 uppercase tracking-[0.4em]">
                    Nenhum dado analítico encontrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const InsightCard = ({ label, value, sub, icon, color, bgColor }: any) => (
  <div className="bg-white border border-slate-200 p-4 shadow-sm flex items-center gap-4 transition-all hover:border-slate-300">
    <div className={`w-10 h-10 rounded flex items-center justify-center ${bgColor} ${color} shrink-0 shadow-sm`}>
      {icon}
    </div>
    <div className="min-w-0">
      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{label}</p>
      <p className={`text-sm font-black tracking-tight truncate ${color}`}>
        {value}
      </p>
      <p className="text-[8px] font-bold text-slate-400 uppercase truncate mt-0.5">{sub}</p>
    </div>
  </div>
);

export default Reports;
