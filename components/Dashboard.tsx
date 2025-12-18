
import React, { useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell 
} from 'recharts';
import { TrendingUp, TrendingDown, Receipt, Wallet } from 'lucide-react';
import { CashEntry, Expense } from '../types';
import { COLORS } from '../constants';

interface DashboardProps {
  entries: CashEntry[];
  expenses: Expense[];
}

const Dashboard: React.FC<DashboardProps> = ({ entries, expenses }) => {
  const stats = useMemo(() => {
    const totalEntries = entries.reduce((acc, e) => acc + (e.cash + e.pix + e.credit + e.debit), 0);
    const totalSangrias = entries.reduce((acc, e) => acc + e.sangria, 0);
    const totalPaid = expenses.filter(e => e.status === 'Pago').reduce((acc, e) => acc + e.value, 0);
    const totalPending = expenses.filter(e => e.status === 'Pendente').reduce((acc, e) => acc + e.value, 0);

    const dataByDate = entries.reduce((acc: any, curr) => {
      const date = curr.date;
      if (!acc[date]) acc[date] = { date, entradas: 0, sangrias: 0 };
      acc[date].entradas += (curr.cash + curr.pix + curr.credit + curr.debit);
      acc[date].sangrias += curr.sangria;
      return acc;
    }, {});

    const chartData = Object.values(dataByDate).sort((a: any, b: any) => a.date.localeCompare(b.date)).slice(-7);

    const paymentMethods = [
      { name: 'Dinheiro', value: entries.reduce((acc, e) => acc + e.cash, 0), color: COLORS.green },
      { name: 'Pix', value: entries.reduce((acc, e) => acc + e.pix, 0), color: COLORS.cyan },
      { name: 'Crédito', value: entries.reduce((acc, e) => acc + e.credit, 0), color: COLORS.blue },
      { name: 'Débito', value: entries.reduce((acc, e) => acc + e.debit, 0) || 0, color: COLORS.yellow },
    ];

    return { totalEntries, totalSangrias, totalPaid, totalPending, chartData, paymentMethods };
  }, [entries, expenses]);

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      <header className="flex flex-col gap-2">
        <h2 className="text-3xl font-black text-gray-900 tracking-tighter">Resumo Executivo</h2>
        <p className="text-[11px] text-gray-400 font-black uppercase tracking-[0.3em]">Visão Geral de Performance</p>
      </header>

      {/* KPI Row - Sombra Suave */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
        <StatCard title="Total Receitas" value={stats.totalEntries} icon={<TrendingUp size={20} />} color={COLORS.green} />
        <StatCard title="Total Retiradas" value={stats.totalSangrias} icon={<TrendingDown size={20} />} color={COLORS.orange} />
        <StatCard title="Despesas Pagas" value={stats.totalPaid} icon={<Wallet size={20} />} color={COLORS.blue} />
        <StatCard title="A Pagar" value={stats.totalPending} icon={<Receipt size={20} />} color={COLORS.yellow} />
      </div>

      {/* Graphs - Sombras Suaves */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        <div className="lg:col-span-8 bg-white p-10 rounded-[32px] border border-gray-100 shadow-subtle overflow-hidden flex flex-col h-full">
          <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-10">Histórico de Fluxo</h3>
          <div className="h-[380px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} fontSize={10} fontWeight="900" tickFormatter={(val) => val.split('-').reverse().slice(0,2).join('/')} />
                <YAxis axisLine={false} tickLine={false} fontSize={10} fontWeight="900" />
                <Tooltip cursor={{fill: '#F8FAFC'}} contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.05)'}} />
                <Bar dataKey="entradas" fill={COLORS.green} radius={[4, 4, 0, 0]} barSize={20} />
                <Bar dataKey="sangrias" fill={COLORS.orange} radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-4 bg-white p-10 rounded-[32px] border border-gray-100 shadow-subtle h-full flex flex-col">
          <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-10">Mix de Receita</h3>
          <div className="h-[280px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={stats.paymentMethods.filter(p => p.value > 0)} innerRadius={75} outerRadius={100} paddingAngle={6} dataKey="value" stroke="none">
                  {stats.paymentMethods.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.05)'}} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[9px] font-black text-gray-300 uppercase">Bruto</span>
              <span className="text-xl font-black text-gray-900 tracking-tighter">R$ {Math.round(stats.totalEntries / 1000)}k</span>
            </div>
          </div>
          <div className="mt-8 space-y-2">
             {stats.paymentMethods.map(m => (
               <div key={m.name} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors">
                 <div className="flex items-center gap-3">
                   <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: m.color }}></div>
                   <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{m.name}</span>
                 </div>
                 <span className="text-xs font-black text-gray-900">R$ {m.value.toFixed(0)}</span>
               </div>
             ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon, color }: any) => (
  <div className="bg-white p-6 rounded-[24px] border border-gray-100 shadow-subtle group overflow-hidden relative transition-all hover:-translate-y-1">
    <div className="flex items-center gap-4">
      <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white shadow-subtle shrink-0" style={{ backgroundColor: color }}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest truncate">{title}</p>
        <p className="text-xl font-black text-gray-900 tracking-tighter truncate leading-none mt-1">
          R$ {value.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
        </p>
      </div>
    </div>
  </div>
);

export default Dashboard;
