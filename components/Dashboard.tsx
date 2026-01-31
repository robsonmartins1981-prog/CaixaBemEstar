
import React, { useMemo, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell
} from 'recharts';
import { CashEntry, Expense } from '../types.ts';
import { db } from '../services/db.ts';

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
    const dailyAverage = totalIn / (new Set(filteredEntries.map(e => e.date)).size || 1);

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

    return { 
      totalIn, totalOutPaid, totalOutPending, netBalance, dailyAverage,
      chartTimeline: Object.values(timelineMap).sort((a, b) => a.date.localeCompare(b.date))
    };
  }, [entries, expenses, filterMonth, rates]);

  const handleAdjustMonth = (delta: number) => {
    const [year, month] = filterMonth.split('-').map(Number);
    const d = new Date(year, (month - 1) + delta, 1);
    setFilterMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  return (
    <div className="flex-1 flex flex-col gap-3 overflow-hidden h-full pb-2">
      <div className="bg-white border border-slate-200 p-3 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 rounded-xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className="text-xl">📅</div>
          <div>
            <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-800 leading-none">Controle Mensal</h2>
            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tight">Desempenho consolidado</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-lg border border-slate-100">
          <button onClick={() => handleAdjustMonth(-1)} className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all text-xs">◀</button>
          <div className="px-3 font-mono font-black text-[10px] text-slate-700 min-w-[120px] text-center uppercase">
            {new Date(parseInt(filterMonth.split('-')[0]), parseInt(filterMonth.split('-')[1]) - 1).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}
          </div>
          <button onClick={() => handleAdjustMonth(1)} className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all text-xs">▶</button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-2 shrink-0">
        <IndicatorCard title="Faturamento" value={stats.totalIn} color="border-green-100" valColor="text-green-600" />
        <IndicatorCard title="Média Diária" value={stats.dailyAverage} color="border-emerald-100" valColor="text-emerald-600" />
        <IndicatorCard title="Custos Pagos" value={stats.totalOutPaid} color="border-blue-100" valColor="text-blue-600" />
        <IndicatorCard title="Pendentes" value={stats.totalOutPending} color="border-orange-100" valColor="text-orange-600" />
        <IndicatorCard title="Líquido" value={stats.netBalance} color="border-slate-200" valColor="text-slate-900" isMain />
      </div>

      <div className="flex-1 bg-white border border-slate-200 shadow-sm flex flex-col rounded-2xl overflow-hidden min-h-[200px]">
        <div className="p-3 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-[9px] font-black uppercase tracking-widest text-slate-500">Fluxo Diário</h3>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1"><div className="w-2 h-2 bg-green-500 rounded-full"></div> <span className="text-[7px] font-bold uppercase text-slate-400">In</span></div>
            <div className="flex items-center gap-1"><div className="w-2 h-2 bg-orange-500 rounded-full"></div> <span className="text-[7px] font-bold uppercase text-slate-400">Out</span></div>
          </div>
        </div>
        <div className="flex-1 p-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.chartTimeline} margin={{ top: 5, right: 0, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="date" fontSize={8} fontWeight="700" tickFormatter={(val) => val.split('-').reverse()[0]} axisLine={false} tickLine={false} />
              <YAxis fontSize={8} fontWeight="700" axisLine={false} tickLine={false} />
              <Tooltip 
                contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', fontSize: '9px'}}
                formatter={(val: number) => formatMoney(val)} 
              />
              <Bar name="In" dataKey="entradas" fill="#10b981" radius={[2, 2, 0, 0]} barSize={12} />
              <Bar name="Out" dataKey="saidas" fill="#f97316" radius={[2, 2, 0, 0]} barSize={12} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

const IndicatorCard = ({ title, value, color, valColor, isMain }: any) => (
  <div className={`bg-white border ${color} p-2.5 shadow-subtle rounded-xl flex flex-col justify-between gap-1 transition-all ${isMain ? 'md:bg-slate-50' : ''}`}>
    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">{title}</p>
    <p className={`text-xs sm:text-sm font-mono font-black tracking-tighter leading-none ${valColor}`}>
      {formatMoney(value)}
    </p>
  </div>
);

export default Dashboard;