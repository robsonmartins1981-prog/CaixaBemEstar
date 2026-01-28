
import React, { useMemo, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell
} from 'recharts';
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

    // Cálculos de Médias (Reforçados contra divisão por zero)
    const uniqueDays = new Set(filteredEntries.map(e => e.date)).size;
    const totalShifts = filteredEntries.length;
    
    const dailyAverage = totalIn / (uniqueDays || 1);
    const shiftAverage = totalIn / (totalShifts || 1);

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

    return { 
      totalIn, 
      totalOutPaid, 
      totalOutPending, 
      netBalance, 
      dailyAverage, 
      shiftAverage,
      chartTimeline 
    };
  }, [entries, expenses, filterMonth, rates]);

  const handleAdjustMonth = (delta: number) => {
    const [year, month] = filterMonth.split('-').map(Number);
    const d = new Date(year, (month - 1) + delta, 1);
    setFilterMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  return (
    <div className="flex-1 flex flex-col gap-5 overflow-hidden h-full no-print pb-6">
      {/* Barra de Filtro Superior */}
      <div className="bg-white border border-slate-200 p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0 shadow-sm rounded-2xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-900 text-white rounded-xl flex items-center justify-center text-xl shadow-inner">📅</div>
          <div>
            <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-800">Controle Mensal</h2>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Análise de desempenho consolidada</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
          <button onClick={() => handleAdjustMonth(-1)} className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all text-slate-600">◀</button>
          <div className="px-6 py-2 font-mono font-black text-[11px] text-slate-700 min-w-[170px] text-center uppercase tracking-widest">
            {new Date(parseInt(filterMonth.split('-')[0]), parseInt(filterMonth.split('-')[1]) - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          </div>
          <button onClick={() => handleAdjustMonth(1)} className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all text-slate-600">▶</button>
        </div>
      </div>

      {/* Grid de KPIs Expandido */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 shrink-0">
        <IndicatorCard 
          title="Faturamento Bruto" 
          value={stats.totalIn} 
          sub="Volume total do mês" 
          icon="📈" 
          color="border-green-100" 
          iconBg="bg-green-500"
          valColor="text-green-600"
        />
        <IndicatorCard 
          title="Média Diária" 
          value={stats.dailyAverage} 
          sub="Média por dia útil" 
          icon="🗓️" 
          color="border-emerald-100" 
          iconBg="bg-emerald-600"
          valColor="text-emerald-600"
        />
        <IndicatorCard 
          title="Média do Caixa" 
          value={stats.shiftAverage} 
          sub="Ticket médio por turno" 
          icon="🧮" 
          color="border-cyan-100" 
          iconBg="bg-cyan-600"
          valColor="text-cyan-600"
        />
        <IndicatorCard 
          title="Custos Pagos" 
          value={stats.totalOutPaid} 
          sub="Despesas liquidadas" 
          icon="💸" 
          color="border-blue-100" 
          iconBg="bg-blue-600"
          valColor="text-blue-600"
        />
        <IndicatorCard 
          title="Custos Pendentes" 
          value={stats.totalOutPending} 
          sub="Previsão a vencer" 
          icon="⏳" 
          color="border-orange-100" 
          iconBg="bg-orange-500"
          valColor="text-orange-600"
        />
        <IndicatorCard 
          title="Resultado Líquido" 
          value={stats.netBalance} 
          sub="Sobra operacional" 
          icon="💎" 
          color="border-slate-200" 
          iconBg="bg-slate-900"
          valColor="text-slate-900"
        />
      </div>

      {/* Gráfico de Desempenho Diário */}
      <div className="flex-1 bg-white border border-slate-200 shadow-sm flex flex-col rounded-[2.5rem] overflow-hidden min-h-[300px]">
        <div className="p-6 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-1.5 h-6 bg-blue-500 rounded-full"></div>
             <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-600">Performance do Fluxo Diário</h3>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-green-500 rounded-full"></div> <span className="text-[8px] font-black uppercase text-slate-400">Entradas</span></div>
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-orange-500 rounded-full"></div> <span className="text-[8px] font-black uppercase text-slate-400">Saídas</span></div>
          </div>
        </div>
        <div className="flex-1 p-6">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.chartTimeline} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="date" fontSize={9} fontWeight="900" tickFormatter={(val) => val.split('-').reverse()[0]} axisLine={false} tickLine={false} />
              <YAxis fontSize={9} fontWeight="900" axisLine={false} tickLine={false} />
              <Tooltip 
                cursor={{fill: '#f8fafc'}}
                contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', fontSize: '10px', fontWeight: 'bold'}}
                formatter={(val: number) => formatMoney(val)} 
              />
              <Bar name="Entradas" dataKey="entradas" fill="#10b981" radius={[5, 5, 0, 0]} barSize={16} />
              <Bar name="Saídas" dataKey="saidas" fill="#f97316" radius={[5, 5, 0, 0]} barSize={16} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

const IndicatorCard = ({ title, value, sub, icon, color, iconBg, valColor }: any) => (
  <div className={`bg-white border-2 ${color} p-4 shadow-sm flex flex-col justify-between gap-4 rounded-[1.8rem] transition-all hover:shadow-md hover:-translate-y-1 group relative overflow-hidden`}>
    <div className="flex items-start justify-between z-10">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-lg ${iconBg} text-base transition-transform group-hover:scale-110`}>
        {icon}
      </div>
      <div className="text-right">
        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{title}</p>
        <p className="text-[7px] font-bold text-slate-300 uppercase tracking-tight">{sub}</p>
      </div>
    </div>
    
    <div className="z-10 mt-1">
      <p className={`text-lg font-mono font-black tracking-tighter leading-none ${valColor}`}>
        {formatMoney(value)}
      </p>
    </div>

    <div className={`absolute -bottom-6 -right-6 w-16 h-16 rounded-full opacity-[0.03] ${iconBg}`}></div>
  </div>
);

export default Dashboard;
