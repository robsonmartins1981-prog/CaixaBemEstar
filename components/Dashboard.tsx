
import React, { useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell 
} from 'recharts';
import { Wallet, Receipt, ArrowUpRight, ArrowDownRight } from 'lucide-react';
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
    <div className="h-full flex flex-col gap-6 overflow-hidden">
      <div className="grid grid-cols-4 gap-4 shrink-0">
        <StatCard title="Receita Total" value={stats.totalEntries} icon={<ArrowUpRight size={20} />} color={COLORS.green} />
        <StatCard title="Total Saídas" value={stats.totalSangrias} icon={<ArrowDownRight size={20} />} color={COLORS.orange} />
        <StatCard title="Contas Pagas" value={stats.totalPaid} icon={<Wallet size={20} />} color={COLORS.blue} />
        <StatCard title="A Pagar" value={stats.totalPending} icon={<Receipt size={20} />} color={COLORS.yellow} />
      </div>

      <div className="flex-1 grid grid-cols-12 gap-6 min-h-0">
        <div className="col-span-8 bg-white p-6 rounded-3xl border border-gray-100 shadow-subtle flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-6 shrink-0">
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">Histórico Semanal</h3>
            <div className="flex gap-4 text-[9px] font-black uppercase text-gray-400">
               <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{backgroundColor: COLORS.green}}></div> Entradas</div>
               <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{backgroundColor: COLORS.orange}}></div> Saídas</div>
            </div>
          </div>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} fontSize={9} fontWeight="900" tickFormatter={(val) => val.split('-').reverse().slice(0,2).join('/')} />
                <YAxis axisLine={false} tickLine={false} fontSize={9} fontWeight="900" />
                <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.05)'}} />
                <Bar dataKey="entradas" fill={COLORS.green} radius={[4, 4, 0, 0]} barSize={24} />
                <Bar dataKey="sangrias" fill={COLORS.orange} radius={[4, 4, 0, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="col-span-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-subtle flex flex-col min-h-0">
          <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider mb-6 shrink-0">Mix de Receita</h3>
          <div className="flex-1 relative min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={stats.paymentMethods.filter(p => p.value > 0)} innerRadius="65%" outerRadius="90%" paddingAngle={5} dataKey="value" stroke="none">
                  {stats.paymentMethods.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[10px] font-black text-gray-300 uppercase">Total</span>
              <span className="text-xl font-black text-gray-900 tracking-tight">R$ {Math.round(stats.totalEntries / 1000)}k</span>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 shrink-0">
             {stats.paymentMethods.map(m => (
               <div key={m.name} className="flex items-center justify-between p-2 rounded-xl bg-gray-50/50 border border-gray-100">
                 <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full" style={{ backgroundColor: m.color }}></div>
                   <span className="text-[9px] font-black text-gray-500 uppercase">{m.name}</span>
                 </div>
                 <span className="text-[10px] font-black text-gray-900">R$ {m.value.toLocaleString('pt-BR')}</span>
               </div>
             ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon, color }: any) => (
  <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-subtle flex items-center gap-4">
    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0" style={{ backgroundColor: color }}>
      {icon}
    </div>
    <div className="min-w-0">
      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest truncate">{title}</p>
      <p className="text-lg font-black text-gray-900 tracking-tighter truncate leading-none mt-1">
        R$ {value.toLocaleString('pt-BR')}
      </p>
    </div>
  </div>
);

export default Dashboard;
