
import React, { useMemo, useState } from 'react';
import { 
  CartesianGrid, Tooltip, ResponsiveContainer,
  XAxis, YAxis, Area, AreaChart, PieChart, Pie, Cell, BarChart, Bar, LabelList
} from 'recharts';
import { CashEntry, Expense } from '../types.ts';
// Added CheckCircle2 to imports from lucide-react
import { Wallet, QrCode, CreditCard, Landmark, TrendingUp, ArrowUpRight, ArrowDownLeft, AlertCircle, Clock, CheckCircle2 } from 'lucide-react';

interface DashboardProps {
  entries: CashEntry[];
  expenses: Expense[];
}

const COLORS_MIX = ['#10b981', '#06b6d4', '#3b82f6', '#8b5cf6'];
const formatMoney = (val: number) => 
  val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatCompact = (val: number) => 
  val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 });

const formatPercent = (val: number) => 
  val.toLocaleString('pt-BR', { style: 'percent', minimumFractionDigits: 1 });

const Dashboard: React.FC<DashboardProps> = ({ entries, expenses }) => {
  const [filterMonth, setFilterMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const stats = useMemo(() => {
    const filteredEntries = entries.filter(e => e.date && e.date.startsWith(filterMonth));
    const filteredExpenses = expenses.filter(e => e.dueDate && e.dueDate.startsWith(filterMonth));

    const faturamento = {
      dinheiro: filteredEntries.reduce((acc, e) => acc + (e.cash || 0), 0),
      pix: filteredEntries.reduce((acc, e) => acc + (e.pix || 0), 0),
      debito: filteredEntries.reduce((acc, e) => acc + (e.debit || 0), 0),
      credito: filteredEntries.reduce((acc, e) => acc + (e.credit || 0), 0),
    };

    const totalIn = faturamento.dinheiro + faturamento.pix + faturamento.debito + faturamento.credito;
    const totalOutPaid = filteredExpenses.filter(e => e.status === 'Pago').reduce((acc, e) => acc + e.value, 0);
    const totalOutPending = filteredExpenses.filter(e => e.status === 'Pendente').reduce((acc, e) => acc + e.value, 0);
    const totalSangrias = filteredEntries.reduce((acc, e) => acc + (e.sangria || 0), 0);
    
    const netBalance = totalIn - (totalOutPaid + totalSangrias);

    const timelineMap: Record<string, any> = {};
    const [year, month] = filterMonth.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${filterMonth}-${String(i).padStart(2, '0')}`;
      timelineMap[dateStr] = { dia: String(i).padStart(2, '0'), entradas: 0, saidas: 0 };
    }

    filteredEntries.forEach(curr => {
      if (timelineMap[curr.date]) {
        timelineMap[curr.date].entradas += (curr.cash + curr.pix + (curr.credit || 0) + (curr.debit || 0));
      }
    });

    filteredExpenses.filter(exp => exp.status === 'Pago').forEach(exp => {
      if (timelineMap[exp.dueDate]) {
        timelineMap[exp.dueDate].saidas += exp.value;
      }
    });

    const mixData = [
      { name: 'Dinheiro', value: faturamento.dinheiro, icon: <Wallet size={14}/>, percent: totalIn > 0 ? faturamento.dinheiro / totalIn : 0, color: '#10b981' },
      { name: 'PIX', value: faturamento.pix, icon: <QrCode size={14}/>, percent: totalIn > 0 ? faturamento.pix / totalIn : 0, color: '#06b6d4' },
      { name: 'Débito', value: faturamento.debito, icon: <CreditCard size={14}/>, percent: totalIn > 0 ? faturamento.debito / totalIn : 0, color: '#3b82f6' },
      { name: 'Crédito', value: faturamento.credito, icon: <Landmark size={14}/>, percent: totalIn > 0 ? faturamento.credito / totalIn : 0, color: '#8b5cf6' }
    ].filter(d => d.value > 0);

    const expenseMap: Record<string, number> = {};
    filteredExpenses.filter(e => e.status === 'Pago').forEach(exp => {
      expenseMap[exp.nature] = (expenseMap[exp.nature] || 0) + exp.value;
    });
    const expenseData = Object.entries(expenseMap)
      .map(([nature, value]) => ({ nature, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    return { 
      totalIn, totalOutPaid, totalOutPending, netBalance, totalSangrias, faturamento,
      chartData: Object.values(timelineMap),
      mixData,
      expenseData
    };
  }, [entries, expenses, filterMonth]);

  const handleAdjustMonth = (delta: number) => {
    const [year, month] = filterMonth.split('-').map(Number);
    const d = new Date(year, (month - 1) + delta, 1);
    setFilterMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  return (
    <div className="flex-1 flex flex-col gap-6 overflow-y-auto custom-scrollbar h-full pb-8 pr-2">
      {/* HEADER E FILTRO */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl">
            <TrendingUp size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800 tracking-tighter uppercase leading-none mb-1">Visão Executiva</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Painel Consolidado de Resultados</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200">
          <button onClick={() => handleAdjustMonth(-1)} className="w-10 h-10 flex items-center justify-center bg-slate-50 border border-slate-100 rounded-xl hover:bg-slate-100 transition-all text-xs">◀</button>
          <div className="px-4 font-black text-[12px] text-slate-700 min-w-[140px] text-center uppercase tracking-widest">
            {new Date(parseInt(filterMonth.split('-')[0]), parseInt(filterMonth.split('-')[1]) - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          </div>
          <button onClick={() => handleAdjustMonth(1)} className="w-10 h-10 flex items-center justify-center bg-slate-50 border border-slate-100 rounded-xl hover:bg-slate-100 transition-all text-xs">▶</button>
        </div>
      </div>

      {/* KPIs DE ALTO NÍVEL */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <MainKPICard title="Faturamento Bruto" value={stats.totalIn} icon={<ArrowUpRight className="text-emerald-500"/>} bg="bg-white" />
        <MainKPICard title="Total de Sangrias" value={stats.totalSangrias} icon={<ArrowDownLeft className="text-rose-500"/>} bg="bg-white" />
        <MainKPICard title="Despesas Pagas" value={stats.totalOutPaid} icon={<CheckCircle2 className="text-blue-500" size={18}/>} bg="bg-white" />
        <MainKPICard title="Contas Pendentes" value={stats.totalOutPending} icon={<AlertCircle className="text-orange-500" size={18}/>} bg="bg-white" />
        <MainKPICard title="Saldo Líquido" value={stats.netBalance} icon={<TrendingUp className="text-white" size={18}/>} bg="bg-slate-900" isDark />
      </div>

      {/* SEÇÃO REFATORADA: DETALHAMENTO POR MODALIDADE */}
      <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm">
        <div className="flex items-center justify-between mb-8">
           <div>
              <h3 className="text-[12px] font-black uppercase tracking-[0.2em] text-slate-800">Recursos por Modalidade</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Origem detalhada de cada Real que entrou no caixa</p>
           </div>
           <div className="px-4 py-2 bg-slate-50 rounded-xl border border-slate-100 text-[10px] font-black text-slate-500 uppercase">
             Total: {formatMoney(stats.totalIn)}
           </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
           <RefactoredPaymentCard 
             label="Dinheiro em Espécie" 
             value={stats.faturamento.dinheiro} 
             percent={stats.totalIn > 0 ? stats.faturamento.dinheiro / stats.totalIn : 0} 
             icon={<Wallet size={20}/>} 
             color="#10b981"
           />
           <RefactoredPaymentCard 
             label="Recebimentos via PIX" 
             value={stats.faturamento.pix} 
             percent={stats.totalIn > 0 ? stats.faturamento.pix / stats.totalIn : 0} 
             icon={<QrCode size={20}/>} 
             color="#06b6d4"
           />
           <RefactoredPaymentCard 
             label="Cartão de Débito" 
             value={stats.faturamento.debito} 
             percent={stats.totalIn > 0 ? stats.faturamento.debito / stats.totalIn : 0} 
             icon={<CreditCard size={20}/>} 
             color="#3b82f6"
           />
           <RefactoredPaymentCard 
             label="Vendas no Crédito" 
             value={stats.faturamento.credito} 
             percent={stats.totalIn > 0 ? stats.faturamento.credito / stats.totalIn : 0} 
             icon={<Landmark size={20}/>} 
             color="#8b5cf6"
           />
        </div>
      </div>

      {/* GRÁFICOS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm min-h-[400px] flex flex-col">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="text-[12px] font-black uppercase tracking-[0.2em] text-slate-800">Fluxo Diário de Competência</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Comparativo de performance por dia</p>
            </div>
            <div className="flex gap-4">
               <div className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Entradas</div>
               <div className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase"><div className="w-2 h-2 rounded-full bg-rose-500"></div> Saídas</div>
            </div>
          </div>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.chartData}>
                <defs>
                  <linearGradient id="colorEnt" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="dia" fontSize={10} fontWeight="900" axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} />
                <YAxis fontSize={10} fontWeight="900" axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} tickFormatter={(v) => v >= 1000 ? `${v/1000}k` : v} />
                <Tooltip 
                  contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', fontSize: '11px', fontWeight: '900'}}
                  formatter={(val: number) => formatMoney(val)} 
                />
                <Area type="monotone" dataKey="entradas" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorEnt)" dot={false} />
                <Area type="monotone" dataKey="saidas" stroke="#f43f5e" strokeWidth={2} strokeDasharray="5 5" fill="transparent" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm flex flex-col">
          <div className="mb-8 text-center">
            <h3 className="text-[12px] font-black uppercase tracking-[0.2em] text-slate-800">Mix de Recebíveis</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Participação na Receita Bruta</p>
          </div>
          <div className="flex-1 flex items-center justify-center">
             <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={stats.mixData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={8}
                    dataKey="value"
                  >
                    {stats.mixData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val: number) => formatMoney(val)} />
                </PieChart>
             </ResponsiveContainer>
          </div>
          <div className="mt-6 space-y-2">
             {stats.mixData.map((item, idx) => (
               <div key={idx} className="flex items-center justify-between text-[11px] font-bold">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-sm" style={{backgroundColor: item.color}}></div>
                    <span className="text-slate-500 uppercase tracking-tight">{item.name}</span>
                  </div>
                  <span className="font-mono text-slate-800">{formatPercent(item.percent)}</span>
               </div>
             ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const MainKPICard = ({ title, value, icon, bg, isDark }: any) => (
  <div className={`${bg} border border-slate-200 p-6 rounded-[2rem] shadow-sm transition-all hover:scale-[1.02] flex flex-col gap-4`}>
     <div className="flex items-center justify-between">
        <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{title}</span>
        {icon}
     </div>
     <p className={`text-xl font-mono font-black tracking-tighter ${isDark ? 'text-green-400' : 'text-slate-900'}`}>
       {formatMoney(value)}
     </p>
  </div>
);

const RefactoredPaymentCard = ({ label, value, percent, icon, color }: any) => (
  <div className="relative group">
     <div className="flex items-center gap-4 mb-4">
        <div className="p-3 rounded-2xl bg-slate-50 text-slate-400 group-hover:bg-slate-100 transition-colors">
          {icon}
        </div>
        <div>
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{label}</p>
           <p className="text-lg font-mono font-black text-slate-800 tracking-tighter">{formatMoney(value)}</p>
        </div>
     </div>
     <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div 
          className="h-full transition-all duration-1000 ease-out" 
          style={{ width: `${percent * 100}%`, backgroundColor: color }}
        ></div>
     </div>
     <div className="flex justify-between items-center mt-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">
        <span>Participação</span>
        <span style={{ color }}>{formatPercent(percent)}</span>
     </div>
  </div>
);

export default Dashboard;
