
import React, { useMemo, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { 
  Wallet, TrendingUp, BarChart3, PieChart as PieIcon, 
  Calendar, Clock, Zap, Target, ArrowUpRight, ArrowDownRight, Filter, ChevronLeft, ChevronRight, Info
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
  // Inicializa com o mês atual de forma segura
  const [filterMonth, setFilterMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const stats = useMemo(() => {
    const filteredEntries = entries.filter(e => e.date && e.date.startsWith(filterMonth));
    const filteredExpenses = expenses.filter(e => e.dueDate && e.dueDate.startsWith(filterMonth));

    const totalIn = filteredEntries.reduce((acc, e) => acc + (e.cash + e.pix + e.credit + e.debit), 0);
    const totalOut = filteredExpenses.filter(e => e.status === 'Pago').reduce((acc, e) => acc + e.value, 0);
    const totalPending = filteredExpenses.filter(e => e.status === 'Pendente').reduce((acc, e) => acc + e.value, 0);
    const netBalance = totalIn - totalOut;

    // 1. Mix de Pagamentos (Análise de Liquidez e Custo)
    const paymentData = [
      { name: 'Dinheiro', value: filteredEntries.reduce((acc, e) => acc + e.cash, 0), color: COLORS.green, liquidity: 'Imediata', cost: 'Isento' },
      { name: 'Pix', value: filteredEntries.reduce((acc, e) => acc + e.pix, 0), color: COLORS.cyan, liquidity: 'Imediata', cost: 'Baixo' },
      { name: 'Débito', value: filteredEntries.reduce((acc, e) => acc + e.debit, 0), color: '#94a3b8', liquidity: '1 Dia', cost: 'Médio' },
      { name: 'Crédito', value: filteredEntries.reduce((acc, e) => acc + e.credit, 0), color: COLORS.blue, liquidity: '30 Dias', cost: 'Alto' },
    ].filter(p => p.value > 0);

    // 2. Eficiência por Turno
    const shiftData = [
      { subject: 'Manhã', A: filteredEntries.filter(e => e.shift.includes('MANHÃ')).reduce((acc, e) => acc + (e.cash + e.pix + e.credit + e.debit), 0) },
      { subject: 'Tarde', A: filteredEntries.filter(e => e.shift.includes('TARDE')).reduce((acc, e) => acc + (e.cash + e.pix + e.credit + e.debit), 0) },
      { subject: 'Noite', A: filteredEntries.filter(e => e.shift.includes('NOITE')).reduce((acc, e) => acc + (e.cash + e.pix + e.credit + e.debit), 0) },
    ];

    // 3. Sazonalidade Semanal
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

    const timelineData = filteredEntries.reduce((acc: any, curr) => {
      const date = curr.date;
      if (!acc[date]) acc[date] = { date, valor: 0 };
      acc[date].valor += (curr.cash + curr.pix + curr.credit + curr.debit);
      return acc;
    }, {});
    const chartTimeline = Object.values(timelineData).sort((a: any, b: any) => a.date.localeCompare(b.date));

    return { 
      totalIn, totalOut, totalPending, netBalance, 
      chartTimeline, paymentData, shiftData, weekdayData,
      avgTicket: filteredEntries.length > 0 ? totalIn / filteredEntries.length : 0
    };
  }, [entries, expenses, filterMonth]);

  const handleAdjustMonth = (delta: number) => {
    const [year, month] = filterMonth.split('-').map(Number);
    // Cria data usando componentes numéricos para evitar erros de parsing de string
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
        
        {/* GRÁFICO TIMELINE */}
        <div className="lg:col-span-8 bg-white border border-slate-200 shadow-sm flex flex-col rounded-2xl overflow-hidden min-h-[320px]">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
             <div className="flex items-center gap-2">
                <BarChart3 size={16} className="text-slate-400"/>
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-600">Fluxo Diário de Entradas</h3>
             </div>
          </div>
          <div className="flex-1 p-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.chartTimeline}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} fontSize={9} fontWeight="900" tickFormatter={(val) => val.split('-').reverse()[0]} />
                <YAxis axisLine={false} tickLine={false} fontSize={9} fontWeight="900" tickFormatter={(val) => `R$ ${val}`} />
                <Tooltip 
                  formatter={(val: number) => formatMoney(val)}
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', fontSize: '11px', fontWeight: 'bold'}}
                />
                <Bar dataKey="valor" fill={COLORS.green} radius={[4, 4, 0, 0]} barSize={25} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* RADAR DE TURNOS */}
        <div className="lg:col-span-4 bg-white border border-slate-200 shadow-sm flex flex-col rounded-2xl overflow-hidden min-h-[320px]">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
            <Clock size={16} className="text-slate-400"/>
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-600">Eficiência por Turno</h3>
          </div>
          <div className="flex-1 p-2">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={stats.shiftData}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="subject" fontSize={10} fontWeight="black" />
                <PolarRadiusAxis angle={30} domain={[0, 'auto']} hide />
                <Radar name="Vendas" dataKey="A" stroke={COLORS.blue} fill={COLORS.blue} fillOpacity={0.6} />
                <Tooltip formatter={(val: number) => formatMoney(val)} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="p-4 bg-slate-50 border-t border-slate-100 space-y-2">
             {stats.shiftData.map(s => (
               <div key={s.subject} className="flex justify-between items-center text-[10px] font-bold">
                 <span className="text-slate-500 uppercase">{s.subject}</span>
                 <span className="text-slate-900 font-mono">{formatMoney(s.A)}</span>
               </div>
             ))}
          </div>
        </div>

        {/* SAZONALIDADE */}
        <div className="lg:col-span-6 bg-white border border-slate-200 shadow-sm flex flex-col rounded-2xl overflow-hidden min-h-[320px]">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
            <Calendar size={16} className="text-slate-400"/>
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-600">Melhores Dias da Semana</h3>
          </div>
          <div className="flex-1 p-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.weekdayData} layout="vertical">
                <XAxis type="number" hide />
                <YAxis dataKey="day" type="category" axisLine={false} tickLine={false} fontSize={10} fontWeight="900" width={40} />
                <Tooltip cursor={{fill: 'transparent'}} formatter={(val: number) => formatMoney(val)} />
                <Bar dataKey="total" fill="#94a3b8" radius={[0, 4, 4, 0]} barSize={20}>
                  {stats.weekdayData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.total === Math.max(...stats.weekdayData.map(d => d.total)) ? COLORS.green : '#cbd5e1'} />
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
          <div className="flex-1 p-4">
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
