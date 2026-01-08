
import React, { useMemo, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend
} from 'recharts';
import { 
  Wallet, TrendingUp, BarChart3, PieChart as PieIcon, 
  Calendar, Clock, Zap, Target, ArrowUpRight, ArrowDownRight, Filter, ChevronLeft, ChevronRight, Info, Eye, EyeOff, Trophy, Activity
} from 'lucide-react';
import { CashEntry, Expense } from '../types';
import { COLORS } from '../constants';

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

  const [visibleShifts, setVisibleShifts] = useState<string[]>(['Manhã', 'Tarde', 'Noite']);

  const toggleShiftVisibility = (shift: string) => {
    setVisibleShifts(prev => 
      prev.includes(shift) ? prev.filter(s => s !== shift) : [...prev, shift]
    );
  };

  const stats = useMemo(() => {
    const filteredEntries = entries.filter(e => e.date && e.date.startsWith(filterMonth));
    const filteredExpenses = expenses.filter(e => e.dueDate && e.dueDate.startsWith(filterMonth));

    const totalIn = filteredEntries.reduce((acc, e) => acc + (e.cash + e.pix + e.credit + e.debit), 0);
    const totalOut = filteredExpenses.filter(e => e.status === 'Pago').reduce((acc, e) => acc + e.value, 0);
    const totalPending = filteredExpenses.filter(e => e.status === 'Pendente').reduce((acc, e) => acc + e.value, 0);
    const netBalance = totalIn - totalOut;

    const paymentData = [
      { name: 'Dinheiro', value: filteredEntries.reduce((acc, e) => acc + e.cash, 0), color: COLORS.green, liquidity: 'Imediata', cost: 'Isento' },
      { name: 'Pix', value: filteredEntries.reduce((acc, e) => acc + e.pix, 0), color: COLORS.cyan, liquidity: 'Imediata', cost: 'Baixo' },
      { name: 'Débito', value: filteredEntries.reduce((acc, e) => acc + e.debit, 0), color: '#94a3b8', liquidity: '1 Dia', cost: 'Médio' },
      { name: 'Crédito', value: filteredEntries.reduce((acc, e) => acc + e.credit, 0), color: COLORS.blue, liquidity: '30 Dias', cost: 'Alto' },
    ].filter(p => p.value > 0);

    // Processamento de Dados por Turno
    const rawShiftValues = {
      Manhã: filteredEntries.filter(e => e.shift.includes('MANHÃ')).reduce((acc, e) => acc + (e.cash + e.pix + e.credit + e.debit), 0),
      Tarde: filteredEntries.filter(e => e.shift.includes('TARDE')).reduce((acc, e) => acc + (e.cash + e.pix + e.credit + e.debit), 0),
      Noite: filteredEntries.filter(e => e.shift.includes('NOITE')).reduce((acc, e) => acc + (e.cash + e.pix + e.credit + e.debit), 0)
    };

    const maxShiftVal = Math.max(...Object.values(rawShiftValues));
    const bestShift = Object.entries(rawShiftValues).find(([_, v]) => v === maxShiftVal && v > 0)?.[0] || 'N/A';

    const shiftData = [
      { 
        subject: 'Manhã', 
        fullValue: rawShiftValues.Manhã,
        A: visibleShifts.includes('Manhã') ? rawShiftValues.Manhã : 0,
        percentage: totalIn > 0 ? (rawShiftValues.Manhã / totalIn) * 100 : 0
      },
      { 
        subject: 'Tarde', 
        fullValue: rawShiftValues.Tarde,
        A: visibleShifts.includes('Tarde') ? rawShiftValues.Tarde : 0,
        percentage: totalIn > 0 ? (rawShiftValues.Tarde / totalIn) * 100 : 0
      },
      { 
        subject: 'Noite', 
        fullValue: rawShiftValues.Noite,
        A: visibleShifts.includes('Noite') ? rawShiftValues.Noite : 0,
        percentage: totalIn > 0 ? (rawShiftValues.Noite / totalIn) * 100 : 0
      },
    ];

    const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const weekdayData = weekdays.map((day, idx) => {
      const dayEntries = filteredEntries.filter(e => {
        const d = new Date(e.date + 'T12:00:00');
        return !isNaN(d.getTime()) && d.getDay() === idx;
      });
      return {
        day,
        total: dayEntries.reduce((acc, e) => acc + (e.cash + e.pix + e.credit + e.debit), 0)
      };
    });

    // Timeline combinando Entradas e Saídas Pagas
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
      totalIn, totalOut, totalPending, netBalance, 
      chartTimeline, paymentData, shiftData, weekdayData,
      bestShift,
      avgTicket: filteredEntries.length > 0 ? totalIn / filteredEntries.length : 0
    };
  }, [entries, expenses, filterMonth, visibleShifts]);

  const handleAdjustMonth = (delta: number) => {
    const [year, month] = filterMonth.split('-').map(Number);
    const d = new Date(year, (month - 1) + delta, 1);
    if (!isNaN(d.getTime())) {
      setFilterMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
  };

  const currentMonthLabel = useMemo(() => {
    const [year, month] = filterMonth.split('-').map(Number);
    const d = new Date(year, month - 1, 1);
    return isNaN(d.getTime()) ? 'Mês Inválido' : d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  }, [filterMonth]);

  return (
    <div className="flex-1 flex flex-col gap-4 overflow-hidden h-full">
      
      {/* HEADER DE FILTROS */}
      <div className="bg-white border border-slate-200 p-3 flex flex-col md:flex-row items-center justify-between gap-4 shrink-0 shadow-sm rounded-xl no-print">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-slate-900 text-white rounded-lg shadow-lg">
            <Filter size={18}/>
          </div>
          <div>
            <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-800">Painel de Performance</h2>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Visão estratégica do mês selecionado</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => handleAdjustMonth(-1)} className="p-2 bg-slate-50 border border-slate-200 rounded-lg hover:bg-white transition-all text-slate-600 shadow-sm">
            <ChevronLeft size={16}/>
          </button>
          <div className="px-6 py-2 bg-slate-100 border border-slate-200 rounded-lg font-mono font-black text-xs text-slate-700 min-w-[200px] text-center uppercase shadow-inner">
            {currentMonthLabel}
          </div>
          <button onClick={() => handleAdjustMonth(1)} className="p-2 bg-slate-50 border border-slate-200 rounded-lg hover:bg-white transition-all text-slate-600 shadow-sm">
            <ChevronRight size={16}/>
          </button>
        </div>
      </div>

      {/* CARDS INDICADORES */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
        <IndicatorCard title="Faturamento Bruto" value={stats.totalIn} sub="Total de vendas no mês" icon={<TrendingUp size={20}/>} color="bg-green-500" trend="up" />
        <IndicatorCard title="Custos Pagos" value={stats.totalOut} sub="Despesas liquidadas" icon={<Wallet size={20}/>} color="bg-blue-500" trend="down" />
        <IndicatorCard title="Obrigações Pendentes" value={stats.totalPending} sub="A pagar no período" icon={<Calendar size={20}/>} color="bg-orange-500" />
        <IndicatorCard title="Resultado Líquido" value={stats.netBalance} sub="Saldo em conta (Estimado)" icon={<Zap size={20}/>} color="bg-slate-900" />
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0 overflow-y-auto custom-scrollbar pr-1">
        
        {/* GRÁFICO TIMELINE - FLUXO DIÁRIO (IN vs OUT) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 shadow-sm flex flex-col rounded-2xl overflow-hidden min-h-[350px]">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
             <div className="flex items-center gap-2">
                <BarChart3 size={16} className="text-slate-400"/>
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-600">Fluxo Diário: Entradas vs Saídas</h3>
             </div>
             <div className="flex items-center gap-4 text-[8px] font-black uppercase">
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 bg-green-500 rounded-sm"></div> Entradas</div>
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 bg-red-500 rounded-sm"></div> Saídas</div>
             </div>
          </div>
          <div className="flex-1 p-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.chartTimeline} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} fontSize={9} fontStyle="italic" fontWeight="900" tickFormatter={(val) => val.split('-').reverse()[0]} />
                <YAxis axisLine={false} tickLine={false} fontSize={9} fontWeight="900" tickFormatter={(val) => `R$ ${val}`} />
                <Tooltip 
                  formatter={(val: number) => formatMoney(val)}
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', fontSize: '11px', fontWeight: 'bold'}}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '9px', fontWeight: 'black', textTransform: 'uppercase', paddingTop: '10px' }} />
                <Bar name="Entradas" dataKey="entradas" fill={COLORS.green} radius={[3, 3, 0, 0]} barSize={12} />
                <Bar name="Saídas" dataKey="saidas" fill={COLORS.orange} radius={[3, 3, 0, 0]} barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* EFICIÊNCIA POR TURNO */}
        <div className="lg:col-span-5 bg-white border border-slate-200 shadow-sm flex flex-col rounded-2xl overflow-hidden min-h-[350px]">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-slate-400"/>
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-600">Eficiência por Turno</h3>
              </div>
              {stats.bestShift !== 'N/A' && (
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-yellow-400/10 text-yellow-600 rounded-full border border-yellow-400/20 animate-pulse">
                  <Trophy size={10}/>
                  <span className="text-[8px] font-black uppercase">Pico: {stats.bestShift}</span>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2 bg-slate-200/50 p-1.5 rounded-xl border border-slate-200">
              {['Manhã', 'Tarde', 'Noite'].map(s => {
                const isActive = visibleShifts.includes(s);
                return (
                  <button
                    key={s}
                    onClick={() => toggleShiftVisibility(s)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[9px] font-black uppercase transition-all shadow-sm ${
                      isActive 
                        ? 'bg-white text-slate-900 shadow-md ring-1 ring-slate-200' 
                        : 'text-slate-400 hover:bg-slate-100 opacity-60'
                    }`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-blue-500' : 'bg-slate-300'}`} />
                    {s}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex-1 p-2 relative">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={stats.shiftData}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="subject" fontSize={10} fontWeight="black" />
                <PolarRadiusAxis angle={30} domain={[0, 'auto']} hide />
                <Radar 
                  name="Vendas" 
                  dataKey="A" 
                  stroke={COLORS.blue} 
                  strokeWidth={3}
                  fill={COLORS.blue} 
                  fillOpacity={0.5} 
                  animationDuration={800}
                />
                <Tooltip 
                  formatter={(val: number) => formatMoney(val)}
                  contentStyle={{borderRadius: '12px', fontSize: '10px', fontWeight: 'bold'}}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          
          <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-2">
             {stats.shiftData.map(s => (
               <div 
                  key={s.subject} 
                  className={`group flex flex-col gap-1 transition-all ${
                    visibleShifts.includes(s.subject) ? 'opacity-100' : 'opacity-20 grayscale'
                  }`}
                >
                 <div className="flex justify-between items-center text-[10px] font-black uppercase">
                    <span className="text-slate-500">{s.subject}</span>
                    <span className="text-slate-900 font-mono">{formatMoney(s.fullValue)}</span>
                 </div>
                 <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden shadow-inner">
                    <div 
                      className={`h-full transition-all duration-1000 ${s.subject === stats.bestShift ? 'bg-blue-500' : 'bg-slate-400'}`}
                      style={{ width: `${s.percentage}%` }}
                    />
                 </div>
                 <div className="flex justify-between items-center">
                    <span className="text-[8px] font-bold text-slate-400 uppercase">Participação</span>
                    <span className="text-[9px] font-black text-slate-600">{s.percentage.toFixed(1)}%</span>
                 </div>
               </div>
             ))}
          </div>
        </div>

        {/* SAZONALIDADE */}
        <div className="lg:col-span-6 bg-white border border-slate-200 shadow-sm flex flex-col rounded-2xl overflow-hidden min-h-[320px]">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-slate-400"/>
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-600">Melhores Dias da Semana</h3>
            </div>
            <Activity size={14} className="text-slate-300"/>
          </div>
          <div className="flex-1 p-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.weekdayData} layout="vertical">
                <XAxis type="number" hide />
                <YAxis dataKey="day" type="category" axisLine={false} tickLine={false} fontSize={10} fontWeight="900" width={40} />
                <Tooltip cursor={{fill: 'transparent'}} formatter={(val: number) => formatMoney(val)} />
                <Bar dataKey="total" fill="#94a3b8" radius={[0, 4, 4, 0]} barSize={18}>
                  {stats.weekdayData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.total === Math.max(...stats.weekdayData.map(d => d.total)) ? COLORS.green : '#e2e8f0'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* MIX DE LIQUIDEZ E CUSTO */}
        <div className="lg:col-span-6 bg-white border border-slate-200 shadow-sm flex flex-col rounded-2xl overflow-hidden min-h-[320px]">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PieIcon size={16} className="text-slate-400"/>
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-600">Liquidez vs Custo de Taxas</h3>
            </div>
            <div title="Análise de impacto financeiro por meio de pagamento" className="text-slate-300 cursor-help"><Info size={14}/></div>
          </div>
          <div className="flex-1 p-4 overflow-x-auto">
             <table className="w-full text-left">
               <thead>
                 <tr className="border-b border-slate-100">
                   <th className="pb-3 text-[9px] font-black text-slate-400 uppercase">Meio</th>
                   <th className="pb-3 text-center text-[9px] font-black text-slate-400 uppercase">Recebimento</th>
                   <th className="pb-3 text-center text-[9px] font-black text-slate-400 uppercase">Custo Médio</th>
                   <th className="pb-3 text-right text-[9px] font-black text-slate-400 uppercase">Total Bruto</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-50">
                 {stats.paymentData.map(p => (
                   <tr key={p.name} className="hover:bg-slate-50/50 transition-colors">
                     <td className="py-3 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{backgroundColor: p.color}} />
                        <span className="text-[10px] font-black text-slate-700 uppercase">{p.name}</span>
                     </td>
                     <td className="py-3 text-center">
                       <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${p.liquidity === 'Imediata' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{p.liquidity}</span>
                     </td>
                     <td className="py-3 text-center">
                       <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${p.cost === 'Isento' ? 'bg-blue-100 text-blue-700' : p.cost === 'Alto' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{p.cost}</span>
                     </td>
                     <td className="py-3 text-right font-mono text-[10px] font-black text-slate-900">
                       {formatMoney(p.value)}
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
          </div>
          <div className="p-4 bg-slate-900 text-white flex justify-between items-center rounded-b-2xl">
             <span className="text-[9px] font-black uppercase tracking-widest">Saldo Auditado no Mês</span>
             <span className="text-sm font-mono font-black text-green-400">{formatMoney(stats.totalIn)}</span>
          </div>
        </div>

      </div>
    </div>
  );
};

const IndicatorCard = ({ title, value, sub, icon, color, trend }: any) => (
  <div className="bg-white border border-slate-200 p-5 shadow-sm flex items-center gap-5 rounded-2xl group hover:border-slate-400 transition-all">
    <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-white shrink-0 shadow-lg ${color} group-hover:scale-110 transition-transform`}>
      {icon}
    </div>
    <div className="min-w-0">
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">{title}</p>
      <div className="flex items-baseline gap-2">
        <p className="text-lg font-mono font-black text-slate-800 tracking-tighter">
          {formatMoney(value)}
        </p>
        {trend && (
          <span className={`text-[10px] font-black ${trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
            {trend === 'up' ? <ArrowUpRight size={12}/> : <ArrowDownRight size={12}/>}
          </span>
        )}
      </div>
      <p className="text-[9px] font-bold text-slate-400 uppercase mt-1 truncate">{sub}</p>
    </div>
  </div>
);

export default Dashboard;
