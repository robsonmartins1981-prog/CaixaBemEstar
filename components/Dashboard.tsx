
import React, { useMemo, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, Legend, LineChart, Line, AreaChart, Area
} from 'recharts';
import { 
  TrendingUp, Zap, Calendar, Clock, Filter, ChevronLeft, ChevronRight, Activity, 
  BarChart3, Scale, Layers, MousePointer2, Calculator, Wallet, Receipt
} from 'lucide-react';
import { CashEntry, Expense } from '../types';
import { COLORS } from '../constants';
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
    
    // Saldo projetado do mês considerando o que entrou versus o que já foi pago
    const netBalance = totalIn - totalTaxas - totalOutPaid;

    // Timeline para Gráfico
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
      totalIn, totalOutPaid, totalOutPending, netBalance, 
      chartTimeline
    };
  }, [entries, expenses, filterMonth, rates]);

  const handleAdjustMonth = (delta: number) => {
    const [year, month] = filterMonth.split('-').map(Number);
    const d = new Date(year, (month - 1) + delta, 1);
    setFilterMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  return (
    <div className="flex-1 flex flex-col gap-4 overflow-hidden h-full no-print">
      {/* Top Filter Bar */}
      <div className="bg-white border border-slate-200 p-3 flex flex-col md:flex-row items-center justify-between gap-4 shrink-0 shadow-sm rounded-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-slate-900 text-white rounded-lg"><Filter size={18}/></div>
          <div>
            <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-800">Resumo Financeiro</h2>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Visão mensal consolidada</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => handleAdjustMonth(-1)} className="p-2 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"><ChevronLeft size={16}/></button>
          <div className="px-6 py-2 bg-slate-100 border border-slate-200 rounded-lg font-mono font-black text-xs text-slate-700 min-w-[180px] text-center uppercase">
            {new Date(parseInt(filterMonth.split('-')[0]), parseInt(filterMonth.split('-')[1]) - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          </div>
          <button onClick={() => handleAdjustMonth(1)} className="p-2 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"><ChevronRight size={16}/></button>
        </div>
      </div>

      {/* KPI Cards Expandidos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
        <IndicatorCard 
          title="Faturamento Bruto" 
          value={stats.totalIn} 
          sub="Total de entradas" 
          icon={<TrendingUp size={20}/>} 
          color="bg-green-500" 
        />
        <IndicatorCard 
          title="Custos Liquidados" 
          value={stats.totalOutPaid} 
          sub="Despesas pagas no mês" 
          icon={<Activity size={20}/>} 
          color="bg-blue-600" 
        />
        <IndicatorCard 
          title="Custos Agendados" 
          value={stats.totalOutPending} 
          sub="Pendências p/ o período" 
          icon={<Clock size={20}/>} 
          color="bg-orange-500" 
        />
        <IndicatorCard 
          title="Disponível (Líquido)" 
          value={stats.netBalance} 
          sub="Saldo pós-pagamentos" 
          icon={<Zap size={20}/>} 
          color="bg-slate-900" 
        />
      </div>

      {/* Gráfico de Fluxo Diário */}
      <div className="flex-1 bg-white border border-slate-200 shadow-sm flex flex-col rounded-2xl overflow-hidden min-h-0">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-600 flex items-center gap-2">
            <BarChart3 size={14}/> Comparativo de Fluxo: Entradas vs Saídas
          </h3>
          <div className="flex gap-4 text-[8px] font-black uppercase">
            <div className="flex items-center gap-1"><div className="w-2 h-2 bg-green-500 rounded-sm"></div> Entradas</div>
            <div className="flex items-center gap-1"><div className="w-2 h-2 bg-orange-500 rounded-sm"></div> Saídas Pagas</div>
          </div>
        </div>
        <div className="flex-1 p-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.chartTimeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="date" 
                fontSize={9} 
                fontWeight="900" 
                tickFormatter={(val) => val.split('-').reverse()[0]} 
                axisLine={false} 
                tickLine={false} 
              />
              <YAxis fontSize={9} fontWeight="900" axisLine={false} tickLine={false} />
              <Tooltip 
                cursor={{fill: '#f8fafc'}}
                contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '11px', fontWeight: 'bold'}}
                formatter={(val: number) => formatMoney(val)} 
              />
              <Bar name="Entradas" dataKey="entradas" fill="#10b981" radius={[4, 4, 0, 0]} barSize={14} />
              <Bar name="Saídas" dataKey="saidas" fill="#f97316" radius={[4, 4, 0, 0]} barSize={14} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

const IndicatorCard = ({ title, value, sub, icon, color }: any) => (
  <div className="bg-white border border-slate-200 p-4 shadow-sm flex items-center gap-4 rounded-xl transition-all hover:shadow-md group">
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white shrink-0 shadow-lg ${color} group-hover:rotate-6 transition-transform`}>{icon}</div>
    <div className="min-w-0">
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{title}</p>
      <p className="text-lg font-mono font-black text-slate-800 tracking-tighter truncate">{formatMoney(value)}</p>
      <p className="text-[8px] font-bold text-slate-400 uppercase truncate tracking-tighter">{sub}</p>
    </div>
  </div>
);

export default Dashboard;
