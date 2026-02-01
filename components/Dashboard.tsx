
import React, { useMemo, useState } from 'react';
import { 
  CartesianGrid, Tooltip, ResponsiveContainer,
  XAxis, YAxis, Bar, Area, AreaChart, PieChart, Pie, Cell, BarChart, LabelList, Legend
} from 'recharts';
import { CashEntry, Expense } from '../types.ts';
import { db } from '../services/db.ts';

interface DashboardProps {
  entries: CashEntry[];
  expenses: Expense[];
}

const COLORS_MIX = ['#10b981', '#06b6d4', '#3b82f6', '#6366f1'];
const formatMoney = (val: number) => 
  val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatCompact = (val: number) => 
  val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 });

const Dashboard: React.FC<DashboardProps> = ({ entries, expenses }) => {
  const [filterMonth, setFilterMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const stats = useMemo(() => {
    const filteredEntries = entries.filter(e => e.date && e.date.startsWith(filterMonth));
    const filteredExpenses = expenses.filter(e => e.dueDate && e.dueDate.startsWith(filterMonth));

    // Cálculos DRE Simplificado (E/S)
    const faturamento = {
      dinheiro: filteredEntries.reduce((acc, e) => acc + (e.cash || 0), 0),
      pix: filteredEntries.reduce((acc, e) => acc + (e.pix || 0), 0),
      cartao: filteredEntries.reduce((acc, e) => acc + (e.credit || 0) + (e.debit || 0), 0),
    };

    const totalIn = faturamento.dinheiro + faturamento.pix + faturamento.cartao;
    const totalOutPaid = filteredExpenses.filter(e => e.status === 'Pago').reduce((acc, e) => acc + e.value, 0);
    const totalOutPending = filteredExpenses.filter(e => e.status === 'Pendente').reduce((acc, e) => acc + e.value, 0);
    const totalSangrias = filteredEntries.reduce((acc, e) => acc + (e.sangria || 0), 0);
    
    // Lucro Líquido = Receita Bruta - (Despesas Pagas + Sangrias)
    const netBalance = totalIn - totalOutPaid - totalSangrias;

    // Dados do Gráfico de Fluxo Diário
    const timelineMap: Record<string, any> = {};
    const [year, month] = filterMonth.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${filterMonth}-${String(i).padStart(2, '0')}`;
      timelineMap[dateStr] = { dia: String(i).padStart(2, '0'), entradas: 0, saidas: 0 };
    }

    filteredEntries.forEach(curr => {
      if (timelineMap[curr.date]) timelineMap[curr.date].entradas += (curr.cash + curr.pix + (curr.credit || 0) + (curr.debit || 0));
    });

    filteredExpenses.filter(exp => exp.status === 'Pago').forEach(exp => {
      if (timelineMap[exp.dueDate]) timelineMap[exp.dueDate].saidas += exp.value;
    });

    // Mix de Entradas (Donut com Valores)
    const mixData = [
      { name: 'Dinheiro', value: faturamento.dinheiro },
      { name: 'PIX', value: faturamento.pix },
      { name: 'Cartões', value: faturamento.cartao }
    ].filter(d => d.value > 0);

    // Distribuição de Despesas (Barra Horizontal com Valores)
    const expenseMap: Record<string, number> = {};
    filteredExpenses.filter(e => e.status === 'Pago').forEach(exp => {
      expenseMap[exp.nature] = (expenseMap[exp.nature] || 0) + exp.value;
    });
    const expenseData = Object.entries(expenseMap)
      .map(([nature, value]) => ({ nature, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    return { 
      totalIn, totalOutPaid, totalOutPending, netBalance, totalSangrias,
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

  // Label Customizada para o Pie Chart mostrar valores
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, value, name }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = outerRadius + 30;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
      <text x={x} y={y} fill="#1e293b" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize="10" fontWeight="900">
        {`${name}: ${formatCompact(value)}`}
      </text>
    );
  };

  return (
    <div className="flex-1 flex flex-col gap-5 overflow-y-auto custom-scrollbar h-full pb-8">
      {/* HEADER DASHBOARD */}
      <div className="bg-white border border-slate-200 p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0 rounded-[2rem] shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-lg">
            <span className="text-2xl">📊</span>
          </div>
          <div>
            <h2 className="text-[14px] font-black uppercase tracking-[0.2em] text-slate-800 leading-none mb-1.5">Consolidado de Performance</h2>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Acompanhamento de Fluxo Bruto vs Custo</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
          <button onClick={() => handleAdjustMonth(-1)} className="w-12 h-12 flex items-center justify-center bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all shadow-sm active:scale-90 text-lg">◀</button>
          <div className="px-6 font-mono font-black text-[15px] text-slate-700 min-w-[160px] text-center uppercase tracking-tighter">
            {new Date(parseInt(filterMonth.split('-')[0]), parseInt(filterMonth.split('-')[1]) - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          </div>
          <button onClick={() => handleAdjustMonth(1)} className="w-12 h-12 flex items-center justify-center bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all shadow-sm active:scale-90 text-lg">▶</button>
        </div>
      </div>

      {/* CARDS INDICADORES */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 shrink-0">
        <IndicatorCard title="Receita Bruta" value={stats.totalIn} color="border-emerald-100" valColor="text-emerald-600" />
        <IndicatorCard title="Sangrias" value={stats.totalSangrias} color="border-rose-100" valColor="text-rose-500" />
        <IndicatorCard title="Custo Pago" value={stats.totalOutPaid} color="border-blue-100" valColor="text-blue-600" />
        <IndicatorCard title="Pendente" value={stats.totalOutPending} color="border-orange-100" valColor="text-orange-600" />
        <IndicatorCard title="Lucro Líquido" value={stats.netBalance} color="border-slate-300" valColor="text-slate-900" isMain />
      </div>

      {/* GRÁFICO 1: FLUXO DIÁRIO (ÁREA) */}
      <div className="bg-white border border-slate-200 shadow-sm flex flex-col rounded-[2.5rem] overflow-hidden min-h-[400px]">
        <div className="p-8 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-[13px] font-black uppercase tracking-[0.2em] text-slate-800">Tendência de Liquidez Diária</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Comparativo direto entre Entradas Brutas e Saídas</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2"><div className="w-4 h-4 bg-emerald-500 rounded-lg"></div> <span className="text-[11px] font-black uppercase text-slate-500">Entradas</span></div>
            <div className="flex items-center gap-2"><div className="w-4 h-4 bg-rose-500 rounded-lg"></div> <span className="text-[11px] font-black uppercase text-slate-500">Saídas</span></div>
          </div>
        </div>
        <div className="flex-1 p-8">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={stats.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gradEnt" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="gradSai" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="dia" fontSize={11} fontWeight="900" axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} dy={10} />
              <YAxis fontSize={11} fontWeight="900" axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} tickFormatter={(v) => v > 0 ? `R$${v/1000}k` : '0'} />
              <Tooltip 
                contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)', fontSize: '12px', fontWeight: '900', padding: '20px'}}
                formatter={(val: number) => formatMoney(val)} 
              />
              <Area type="monotone" name="Entradas" dataKey="entradas" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#gradEnt)" dot={{ r: 4, fill: '#10b981' }} />
              <Area type="monotone" name="Saídas" dataKey="saidas" stroke="#f43f5e" strokeWidth={4} fillOpacity={1} fill="url(#gradSai)" dot={{ r: 4, fill: '#f43f5e' }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* GRÁFICO 2: MIX DE RECEITAS (DONUT COM VALORES) */}
        <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm h-[450px] flex flex-col">
          <div className="mb-2">
            <h3 className="text-[13px] font-black uppercase tracking-[0.2em] text-slate-800">Origem do Capital</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Valores brutos por modalidade de entrada</p>
          </div>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.mixData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={10}
                  dataKey="value"
                  label={renderCustomizedLabel}
                  labelLine={true}
                >
                  {stats.mixData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS_MIX[index % COLORS_MIX.length]} stroke="none" />
                  ))}
                </Pie>
                <Tooltip formatter={(val: number) => formatMoney(val)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* GRÁFICO 3: TOP DESPESAS (BARRAS COM VALORES) */}
        <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm h-[450px] flex flex-col">
          <div className="mb-8">
            <h3 className="text-[13px] font-black uppercase tracking-[0.2em] text-slate-800">Principais Destinos</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Naturezas com maior concentração de pagamentos</p>
          </div>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.expenseData} layout="vertical" margin={{ left: 50, right: 80 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} vertical={false} />
                <XAxis type="number" hide />
                <YAxis dataKey="nature" type="category" fontSize={10} fontWeight="900" axisLine={false} tickLine={false} width={80} tick={{fill: '#64748b'}} />
                <Tooltip formatter={(val: number) => formatMoney(val)} cursor={{fill: '#f1f5f9'}} />
                <Bar dataKey="value" fill="#3b82f6" radius={[0, 12, 12, 0]} barSize={28}>
                  <LabelList 
                    dataKey="value" 
                    position="right" 
                    formatter={(v: number) => formatCompact(v)} 
                    style={{ fill: '#1e293b', fontSize: '11px', fontWeight: '900', fontFamily: 'monospace' }} 
                    offset={15}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
};

const IndicatorCard = ({ title, value, color, valColor, isMain }: any) => (
  <div className={`bg-white border ${color} p-6 shadow-subtle rounded-[2rem] flex flex-col justify-between gap-3 transition-all hover:shadow-md hover:-translate-y-1 ${isMain ? 'md:bg-slate-900 border-slate-800' : ''}`}>
    <p className={`text-[11px] font-black uppercase tracking-[0.15em] leading-none ${isMain ? 'text-slate-500' : 'text-slate-400'}`}>{title}</p>
    <p className={`text-xl sm:text-2xl font-mono font-black tracking-tighter leading-none ${isMain ? 'text-green-400' : valColor}`}>
      {formatMoney(value)}
    </p>
  </div>
);

export default Dashboard;
