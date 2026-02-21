
import React, { useMemo, useState } from 'react';
import { 
  CartesianGrid, Tooltip, ResponsiveContainer,
  XAxis, YAxis, Area, AreaChart, PieChart, Pie, Cell
} from 'recharts';
import { CashEntry, Expense, ShiftType } from '../types';
import { SHIFTS } from '../constants';
import { 
  Wallet, QrCode, CreditCard, Landmark, TrendingUp, 
  ArrowUpRight, ArrowDownLeft, AlertCircle, 
  CheckCircle2, Calendar, Filter, MousePointer2, Layers,
  ChevronDown, CalendarRange, Clock
} from 'lucide-react';

interface DashboardProps {
  entries: CashEntry[];
  expenses: Expense[];
}

const formatMoney = (val: number) => 
  val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatPercent = (val: number) => 
  val.toLocaleString('pt-BR', { style: 'percent', minimumFractionDigits: 1 });

const Dashboard: React.FC<DashboardProps> = ({ entries, expenses }) => {
  // Estados de Filtro Avançado
  const [dateMode, setDateMode] = useState<'CURRENT_MONTH' | 'CUSTOM'>('CURRENT_MONTH');
  
  const [dateStart, setDateStart] = useState(() => {
    const d = new Date();
    d.setDate(1); // Primeiro dia do mês
    return d.toISOString().split('T')[0];
  });
  const [dateEnd, setDateEnd] = useState(new Date().toISOString().split('T')[0]);
  
  const [selectedShifts, setSelectedShifts] = useState<ShiftType[]>(Array.from(SHIFTS));
  const [paymentFilters, setPaymentFilters] = useState({
    cash: true, pix: true, credit: true, debit: true
  });

  const stats = useMemo(() => {
    // Determina o intervalo real baseado no modo
    let finalStart = dateStart;
    let finalEnd = dateEnd;

    if (dateMode === 'CURRENT_MONTH') {
      const d = new Date();
      d.setDate(1);
      finalStart = d.toISOString().split('T')[0];
      finalEnd = new Date().toISOString().split('T')[0];
    }

    // 1. Filtragem Base
    const filteredEntries = entries.filter(e => {
      const matchDate = e.date >= finalStart && e.date <= finalEnd;
      const matchShift = selectedShifts.includes(e.shift);
      return matchDate && matchShift;
    });

    const filteredExpenses = expenses.filter(e => 
      e.dueDate >= finalStart && e.dueDate <= finalEnd
    );

    // 2. Cálculos de Faturamento Respeitando Toggles de Modalidade
    const faturamentoRaw = {
      dinheiro: filteredEntries.reduce((acc, e) => acc + (e.cash || 0), 0),
      pix: filteredEntries.reduce((acc, e) => acc + (e.pix || 0), 0),
      debito: filteredEntries.reduce((acc, e) => acc + (e.debit || 0), 0),
      credito: filteredEntries.reduce((acc, e) => acc + (e.credit || 0), 0),
    };

    const totalIn = 
      (paymentFilters.cash ? faturamentoRaw.dinheiro : 0) +
      (paymentFilters.pix ? faturamentoRaw.pix : 0) +
      (paymentFilters.debito ? faturamentoRaw.debito : 0) +
      (paymentFilters.credit ? faturamentoRaw.credito : 0);

    const totalOutPaid = filteredExpenses.filter(e => e.status === 'Pago').reduce((acc, e) => acc + e.value, 0);
    const totalOutPending = expenses.filter(e => e.status === 'Pendente').reduce((acc, e) => acc + e.value, 0);
    
    const netBalance = totalIn - totalOutPaid;

    // 3. Média Diária
    const uniqueDaysCount = new Set(filteredEntries.map(e => e.date)).size;
    const averageDaily = uniqueDaysCount > 0 ? totalIn / uniqueDaysCount : 0;

    // 4. Timeline para Gráfico
    const timelineMap: Record<string, any> = {};
    const dStart = new Date(finalStart + 'T12:00:00');
    const dEnd = new Date(finalEnd + 'T12:00:00');
    
    for (let d = new Date(dStart); d <= dEnd; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      timelineMap[dateStr] = { 
        label: dateStr.split('-').reverse().slice(0, 2).join('/'), 
        fullDate: dateStr,
        entradas: 0, 
        saidas: 0 
      };
    }

    filteredEntries.forEach(curr => {
      if (timelineMap[curr.date]) {
        let dayIn = 0;
        if (paymentFilters.cash) dayIn += curr.cash;
        if (paymentFilters.pix) dayIn += curr.pix;
        if (paymentFilters.credit) dayIn += curr.credit;
        if (paymentFilters.debit) dayIn += curr.debit;
        timelineMap[curr.date].entradas += dayIn;
      }
    });

    filteredExpenses.filter(exp => exp.status === 'Pago').forEach(exp => {
      if (timelineMap[exp.dueDate]) {
        timelineMap[exp.dueDate].saidas += exp.value;
      }
    });

    // 5. Mix de Dados
    const mixData = [
      { name: 'Dinheiro', value: faturamentoRaw.dinheiro, active: paymentFilters.cash, color: '#10b981' },
      { name: 'PIX', value: faturamentoRaw.pix, active: paymentFilters.pix, color: '#06b6d4' },
      { name: 'Débito', value: faturamentoRaw.debito, active: paymentFilters.debit, color: '#3b82f6' },
      { name: 'Crédito', value: faturamentoRaw.credito, active: paymentFilters.credit, color: '#8b5cf6' }
    ].filter(d => d.value > 0);

    return { 
      totalIn, totalOutPaid, totalOutPending, netBalance, averageDaily, uniqueDaysCount,
      faturamento: faturamentoRaw,
      chartData: Object.values(timelineMap),
      mixData,
      label: dateMode === 'CURRENT_MONTH' ? 'Mês Corrente' : 'Personalizado'
    };
  }, [entries, expenses, dateStart, dateEnd, selectedShifts, paymentFilters, dateMode]);

  const toggleShift = (shift: ShiftType) => {
    setSelectedShifts(prev => prev.includes(shift) ? prev.filter(s => s !== shift) : [...prev, shift]);
  };

  return (
    <div className="flex-1 flex flex-col gap-6 overflow-y-auto custom-scrollbar h-full pb-8 pr-2">
      
      {/* PAINEL DE CONTROLE DE FILTROS */}
      <div className="bg-white border border-slate-200 rounded-[2.5rem] p-6 shadow-sm flex flex-col gap-6 shrink-0">
        <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl">
              <Filter size={24} />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-800 tracking-tighter uppercase leading-none mb-1">Filtros Avançados</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Painel de controle de inteligência</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {/* Seletor de Período Inteligente */}
            <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-2xl border border-slate-200 shadow-inner">
               <button 
                onClick={() => setDateMode('CURRENT_MONTH')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${dateMode === 'CURRENT_MONTH' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
               >
                 <Clock size={14} /> Mês Corrente
               </button>
               <button 
                onClick={() => setDateMode('CUSTOM')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${dateMode === 'CUSTOM' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
               >
                 <CalendarRange size={14} /> Personalizar Data
               </button>
            </div>

            {/* Inputs de Data (Apenas se Personalizado) */}
            {dateMode === 'CUSTOM' && (
              <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-blue-200 shadow-lg animate-in slide-in-from-right-4 duration-300">
                <div className="flex items-center gap-2 px-3">
                  <input type="date" className="bg-transparent border-none outline-none text-[10px] font-black uppercase w-28 text-blue-600" value={dateStart} onChange={e => setDateStart(e.target.value)} />
                </div>
                <div className="text-slate-300">|</div>
                <div className="flex items-center gap-2 px-3">
                  <input type="date" className="bg-transparent border-none outline-none text-[10px] font-black uppercase w-28 text-blue-600" value={dateEnd} onChange={e => setDateEnd(e.target.value)} />
                </div>
              </div>
            )}

            {/* Caixas */}
            <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
               {SHIFTS.map(s => (
                 <button 
                  key={s} 
                  onClick={() => toggleShift(s)} 
                  className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${selectedShifts.includes(s) ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                 >
                   {s.split(' ')[1]}
                 </button>
               ))}
            </div>
          </div>
        </div>

        <div className="h-px bg-slate-100 w-full"></div>

        {/* Modalidades Toggle */}
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">Considerar no faturamento:</span>
          <PaymentToggle 
            label="Dinheiro" 
            active={paymentFilters.cash} 
            color="bg-emerald-500" 
            onClick={() => setPaymentFilters({...paymentFilters, cash: !paymentFilters.cash})} 
          />
          <PaymentToggle 
            label="Pix" 
            active={paymentFilters.pix} 
            color="bg-cyan-500" 
            onClick={() => setPaymentFilters({...paymentFilters, pix: !paymentFilters.pix})} 
          />
          <PaymentToggle 
            label="Crédito" 
            active={paymentFilters.credit} 
            color="bg-indigo-500" 
            onClick={() => setPaymentFilters({...paymentFilters, credit: !paymentFilters.credit})} 
          />
          <PaymentToggle 
            label="Débito" 
            active={paymentFilters.debit} 
            color="bg-blue-500" 
            onClick={() => setPaymentFilters({...paymentFilters, debit: !paymentFilters.debit})} 
          />
        </div>
      </div>

      {/* KPIs DE ALTO NÍVEL */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <MainKPICard title="Faturamento Bruto" value={stats.totalIn} icon={<ArrowUpRight className="text-emerald-500"/>} bg="bg-white" />
        <MainKPICard title="Média Diária" value={stats.averageDaily} icon={<TrendingUp className="text-cyan-500" size={18}/>} bg="bg-white" />
        <MainKPICard title="Despesas Pagas" value={stats.totalOutPaid} icon={<CheckCircle2 className="text-blue-500" size={18}/>} bg="bg-white" />
        <MainKPICard title="Contas Pendentes" value={stats.totalOutPending} icon={<AlertCircle className="text-orange-500" size={18}/>} bg="bg-white" />
        <MainKPICard title="Saldo Líquido" value={stats.netBalance} icon={<Layers className="text-white" size={18}/>} bg="bg-slate-900" isDark />
      </div>

      {/* DETALHAMENTO POR MODALIDADE */}
      <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm">
        <div className="flex items-center justify-between mb-8">
           <div>
              <h3 className="text-[12px] font-black uppercase tracking-[0.2em] text-slate-800">Performance por Modalidade</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Comparativo de volume no período: <span className="text-blue-600">{stats.label}</span></p>
           </div>
           <div className="flex items-center gap-3">
              <div className="px-4 py-2 bg-slate-50 rounded-xl border border-slate-100 text-[10px] font-black text-slate-500 uppercase">
                {stats.uniqueDaysCount} dias ativos
              </div>
           </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
           <RefactoredPaymentCard 
             label="Dinheiro em Espécie" 
             value={stats.faturamento.dinheiro} 
             percent={stats.totalIn > 0 ? stats.faturamento.dinheiro / stats.totalIn : 0} 
             icon={<Wallet size={20}/>} 
             color="#10b981"
             inactive={!paymentFilters.cash}
           />
           <RefactoredPaymentCard 
             label="Recebimentos via PIX" 
             value={stats.faturamento.pix} 
             percent={stats.totalIn > 0 ? stats.faturamento.pix / stats.totalIn : 0} 
             icon={<QrCode size={20}/>} 
             color="#06b6d4"
             inactive={!paymentFilters.pix}
           />
           <RefactoredPaymentCard 
             label="Vendas no Crédito" 
             value={stats.faturamento.credito} 
             percent={stats.totalIn > 0 ? stats.faturamento.credito / stats.totalIn : 0} 
             icon={<Landmark size={20}/>} 
             color="#8b5cf6"
             inactive={!paymentFilters.credit}
           />
           <RefactoredPaymentCard 
             label="Vendas no Débito" 
             value={stats.faturamento.debito} 
             percent={stats.totalIn > 0 ? stats.faturamento.debito / stats.totalIn : 0} 
             icon={<CreditCard size={20}/>} 
             color="#3b82f6"
             inactive={!paymentFilters.debit}
           />
        </div>
      </div>

      {/* GRÁFICOS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm min-h-[400px] flex flex-col">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="text-[12px] font-black uppercase tracking-[0.2em] text-slate-800">Fluxo Diário</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Visão histórica ({stats.label})</p>
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
                <XAxis dataKey="label" fontSize={10} fontWeight="900" axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} />
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
            <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Distribuição percentual ativa</p>
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
                    {stats.mixData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.active ? entry.color : '#f1f5f9'} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val: number) => formatMoney(val)} />
                </PieChart>
             </ResponsiveContainer>
          </div>
          <div className="mt-6 space-y-2">
             {stats.mixData.map((item: any, idx: number) => (
               <div key={idx} className={`flex items-center justify-between text-[11px] font-bold ${item.active ? 'opacity-100' : 'opacity-30'}`}>
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-sm" style={{backgroundColor: item.color}}></div>
                    <span className="text-slate-500 uppercase tracking-tight">{item.name}</span>
                  </div>
                  <span className="font-mono text-slate-800">{formatPercent(item.percent || 0)}</span>
               </div>
             ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const PaymentToggle = ({ label, active, color, onClick }: any) => (
  <button 
    onClick={onClick}
    className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase flex items-center gap-2 transition-all border ${
      active ? 'bg-white border-slate-200 text-slate-700 shadow-sm' : 'bg-slate-50 border-transparent text-slate-300'
    }`}
  >
    <div className={`w-2 h-2 rounded-full ${active ? color : 'bg-slate-200'}`}></div>
    {label}
  </button>
);

const MainKPICard = ({ title, value, icon, bg, isDark, isCount }: any) => (
  <div className={`${bg} border border-slate-200 p-5 rounded-[2rem] shadow-sm transition-all hover:scale-[1.02] flex flex-col gap-3`}>
     <div className="flex items-center justify-between">
        <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{title}</span>
        {icon}
     </div>
     <p className={`text-[1.2rem] font-mono font-black tracking-tighter ${isDark ? 'text-green-400' : 'text-slate-900'}`}>
       {isCount ? value : formatMoney(value)}
     </p>
  </div>
);

const RefactoredPaymentCard = ({ label, value, percent, icon, color, inactive }: any) => (
  <div className={`relative group transition-opacity duration-300 ${inactive ? 'opacity-30' : 'opacity-100'}`}>
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
          style={{ width: `${percent * 100}%`, backgroundColor: inactive ? '#e2e8f0' : color }}
        ></div>
     </div>
     <div className="flex justify-between items-center mt-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">
        <span>Participação</span>
        <span style={{ color: inactive ? '#94a3b8' : color }}>{formatPercent(percent)}</span>
     </div>
  </div>
);

export default Dashboard;
