
import React, { useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell 
} from 'recharts';
import { Wallet, Receipt, TrendingUp, BarChart3, PieChart as PieIcon } from 'lucide-react';
import { CashEntry, Expense } from '../types';
import { COLORS } from '../constants';

interface DashboardProps {
  entries: CashEntry[];
  expenses: Expense[];
}

const Dashboard: React.FC<DashboardProps> = ({ entries, expenses }) => {
  const stats = useMemo(() => {
    const totalEntries = entries.reduce((acc, e) => acc + (e.cash + e.pix + e.credit + e.debit), 0);
    const totalPaid = expenses.filter(e => e.status === 'Pago').reduce((acc, e) => acc + e.value, 0);
    const totalPending = expenses.filter(e => e.status === 'Pendente').reduce((acc, e) => acc + e.value, 0);

    const dataByDate = entries.reduce((acc: any, curr) => {
      const date = curr.date;
      if (!acc[date]) acc[date] = { date, entradas: 0 };
      acc[date].entradas += (curr.cash + curr.pix + curr.credit + curr.debit);
      return acc;
    }, {});

    const chartData = Object.values(dataByDate).sort((a: any, b: any) => a.date.localeCompare(b.date)).slice(-7);

    const paymentMethods = [
      { name: 'Dinheiro', value: entries.reduce((acc, e) => acc + e.cash, 0), color: COLORS.green },
      { name: 'Pix', value: entries.reduce((acc, e) => acc + e.pix, 0), color: COLORS.cyan },
      { name: 'Crédito', value: entries.reduce((acc, e) => acc + e.credit, 0), color: COLORS.blue },
      { name: 'Débito', value: entries.reduce((acc, e) => acc + e.debit, 0) || 0, color: '#94a3b8' },
    ];

    return { totalEntries, totalPaid, totalPending, chartData, paymentMethods };
  }, [entries, expenses]);

  return (
    <div className="flex-1 flex flex-col gap-4 overflow-hidden h-full">
      {/* Cards de Resumo Horizontal Spreadsheet Style */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
        <MiniCard title="Faturamento Total" value={stats.totalEntries} icon={<TrendingUp size={18}/>} color="bg-green-500" />
        <MiniCard title="Despesas Liquidadas" value={stats.totalPaid} icon={<Wallet size={18}/>} color="bg-blue-500" />
        <MiniCard title="Obrigações Pendentes" value={stats.totalPending} icon={<Receipt size={18}/>} color="bg-amber-500" />
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0">
        {/* Gráfico Linear de Performance */}
        <div className="lg:col-span-8 bg-white border border-slate-200 shadow-sm flex flex-col overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
            <BarChart3 size={16} className="text-slate-400"/>
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-600">Performance Semanal (Entradas)</h3>
          </div>
          <div className="flex-1 p-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.chartData}>
                <CartesianGrid strokeDasharray="2 2" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} fontSize={10} fontWeight="900" tickFormatter={(val) => val.split('-').reverse().slice(0,2).join('/')} />
                <YAxis axisLine={false} tickLine={false} fontSize={10} fontWeight="900" />
                <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px'}} />
                <Bar dataKey="entradas" fill={COLORS.green} radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Mix de Receita Pie */}
        <div className="lg:col-span-4 bg-white border border-slate-200 shadow-sm flex flex-col overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
            <PieIcon size={16} className="text-slate-400"/>
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-600">Mix de Pagamentos</h3>
          </div>
          <div className="flex-1 relative p-6">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={stats.paymentMethods.filter(p => p.value > 0)} innerRadius="60%" outerRadius="90%" paddingAngle={4} dataKey="value" stroke="none">
                  {stats.paymentMethods.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[18px] font-black text-slate-900 tracking-tighter">
                R$ {stats.totalEntries.toLocaleString('pt-BR', { notation: 'compact' })}
              </span>
            </div>
          </div>
          <div className="p-4 bg-slate-50 border-t border-slate-100 grid grid-cols-2 gap-2">
             {stats.paymentMethods.map(m => (
               <div key={m.name} className="flex items-center justify-between text-[10px] font-bold">
                 <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full" style={{ backgroundColor: m.color }}></div>
                   <span className="text-slate-500 uppercase">{m.name}</span>
                 </div>
                 <span className="text-slate-900">R$ {m.value.toFixed(0)}</span>
               </div>
             ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const MiniCard = ({ title, value, icon, color }: any) => (
  <div className="bg-white border border-slate-200 p-4 shadow-sm flex items-center gap-4 group hover:border-green-500 transition-colors">
    <div className={`w-12 h-12 rounded flex items-center justify-center text-white shrink-0 shadow-md ${color}`}>
      {icon}
    </div>
    <div className="min-w-0">
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{title}</p>
      <p className="text-xl font-mono font-black text-slate-800 tracking-tighter">
        R$ {value.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
      </p>
    </div>
  </div>
);

export default Dashboard;
