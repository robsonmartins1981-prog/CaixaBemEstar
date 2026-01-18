
import React, { useMemo, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { 
  TrendingUp, Filter, ChevronLeft, ChevronRight, Activity, 
  BarChart3, Clock, Zap
} from 'lucide-react';
import { CashEntry, Expense } from '../types';
import { db } from '../services/db';

interface DashboardProps {
  entries: CashEntry[];
  expenses: Expense[];
}

const formatMoney = (val: number) => 
  val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });

const Dashboard: React.FC<DashboardProps> = ({ entries, expenses }) => {
  const [filterMonth, setFilterMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const rates = useMemo(() => db.getCardRates(), []);

  const stats = useMemo(() => {
    const filteredEntries = entries.filter(e => e.date && e.date.startsWith(filterMonth));
    const filteredExpenses = expenses.filter(e => e.dueDate && e.dueDate.startsWith(filterMonth));

    const totalIn = filteredEntries.reduce((acc, e) => acc + (e.cash + e.pix + e.credit + e.debit), 0);
    const totalTaxas = filteredEntries.reduce((acc, e) => acc + (e.debit * (rates.debit / 100)) + (e.credit * (rates.credit / 100)), 0);
    const totalOutPaid = filteredExpenses.filter(e => e.status === 'Pago').reduce((acc, e) => acc + e.value, 0);
    const totalOutPending = filteredExpenses.filter(e => e.status === 'Pendente').reduce((acc, e) => acc + e.value, 0);
    const netBalance = totalIn - totalTaxas - totalOutPaid;

    const timelineMap: Record<string, { date: string, entradas: number, saidas: number }> = {};
    filteredEntries.forEach(curr => {
      const date = curr.date;
      if (!timelineMap[date]) timelineMap[date] = { date, entradas: 0, saidas: 0 };
      timelineMap[date].entradas += (curr.cash + curr.pix + curr.credit + curr.debit);
    });
    filteredExpenses.filter(exp => exp.status === 'Pago').forEach(exp => {
      const date = exp.dueDate;
      if (!timelineMap[date]) timelineMap[date] = { date, entradas: 0, saidas: 0 };
      timelineMap[date].saidas += exp.value;
    });

    const chartTimeline = Object.values(timelineMap).sort((a, b) => a.date.localeCompare(b.date));
    return { totalIn, totalOutPaid, totalOutPending, netBalance, chartTimeline };
  }, [entries, expenses, filterMonth, rates]);

  const handleAdjustMonth = (delta: number) => {
    const [year, month] = filterMonth.split('-').map(Number);
    const d = new Date(year, (month - 1) + delta, 1);
    setFilterMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  return (
    <div className="flex-1 flex flex-col gap-6 no-print">
      {/* Top Filter Bar */}
      <div className="bg-white border border-slate-200 p-4 flex flex-col md:flex-row items-center justify-between gap-4 rounded-3xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-slate-900 text-white rounded-xl shadow-lg shadow-slate-200"><Filter size={18}/></div>
          <div>
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-800">Painel Executivo</h2>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Indicadores mensais consolidados</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => handleAdjustMonth(-1)} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-all"><ChevronLeft size={16}/></button>
          <div className="px-8 py-2.5 bg-slate-900 text-white rounded-xl font-mono font-black text-[10px] min-w-[200px] text-center uppercase tracking-widest shadow-md">
            {new Date(parseInt(filterMonth.split('-')[0]), parseInt(filterMonth.split('-')[1]) - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          </div>
          <button onClick={() => handleAdjustMonth(1)} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-all"><ChevronRight size={16}/></button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <IndicatorCard title="Faturamento Bruto" value={stats.totalIn} icon={<TrendingUp size={20}/>} color="bg-green-500" />
        <IndicatorCard title="Despesas Pagas" value={stats.totalOutPaid} icon={<Activity size={20}/>} color="bg-blue-600" />
        <IndicatorCard title="Compromissos" value={stats.totalOutPending} icon={<Clock size={20}/>} color="bg-orange-500" />
        <IndicatorCard title="Saldo Disponível" value={stats.netBalance} icon={<Zap size={20}/>} color="bg-slate-900" />
      </div>

      {/* Gráfico de Fluxo Diário */}
      <div className="bg-white border border-slate-200 shadow-sm flex flex-col rounded-[32px] overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-600 flex items-center gap-3">
            <BarChart3 size={18} className="text-blue-500"/> Comparativo de Fluxo Diário
          </h3>
          <div className="hidden sm:flex gap-4 text-[9px] font-black uppercase tracking-widest">
            <div className="flex items-center gap-2"><div className="w-3 h-3 bg-green-500 rounded-sm"></div> Entradas</div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 bg-orange-500 rounded-sm"></div> Saídas</div>
          </div>
        </div>
        <div className="p-6" style={{ height: '350px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.chartTimeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="date" fontSize={9} fontWeight="900" tickFormatter={(val) => val.split('-').reverse()[0]} axisLine={false} tickLine={false} />
              <YAxis fontSize={9} fontWeight="900" axisLine={false} tickLine={false} />
              <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', fontSize: '11px', fontWeight: 'bold'}} formatter={(val: number) => formatMoney(val)} />
              <Bar name="Entradas" dataKey="entradas" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
              <Bar name="Saídas" dataKey="saidas" fill="#f97316" radius={[4, 4, 0, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

const IndicatorCard = ({ title, value, icon, color }: any) => (
  <div className="bg-white border border-slate-200 p-6 shadow-sm flex items-center gap-5 rounded-[28px] transition-all hover:scale-[1.02]">
    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg ${color}`}>{icon}</div>
    <div className="min-w-0">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{title}</p>
      <p className="text-xl font-mono font-black text-slate-800 tracking-tighter truncate">{formatMoney(value)}</p>
    </div>
  </div>
);

export default Dashboard;
