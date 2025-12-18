
import React, { useMemo, useState } from 'react';
import { CashEntry, Expense } from '../types';
import { COLORS } from '../constants';
import { Calendar, Banknote, Landmark, CreditCard, PiggyBank, Download, ArrowRightCircle } from 'lucide-react';

interface ReportsProps {
  entries: CashEntry[];
  expenses: Expense[];
}

const Reports: React.FC<ReportsProps> = ({ entries, expenses }) => {
  const now = new Date();
  const [selectedDailyDate, setSelectedDailyDate] = useState<string>(now.toISOString().split('T')[0]);
  
  const calculatePeriodStats = (filterFn: (date: Date) => boolean) => {
    const periodEntries = entries.filter(e => filterFn(new Date(e.date + 'T12:00:00')));
    const periodPaidExpenses = expenses.filter(e => e.status === 'Pago' && filterFn(new Date(e.dueDate + 'T12:00:00')));

    const totals = periodEntries.reduce((acc, curr) => ({
      cash: acc.cash + curr.cash,
      pix: acc.pix + curr.pix,
      credit: acc.credit + curr.credit,
      debit: acc.debit + curr.debit,
      sangria: acc.sangria + curr.sangria,
    }), { cash: 0, pix: 0, credit: 0, debit: 0, sangria: 0 });

    const totalVendas = totals.cash + totals.pix + totals.credit + totals.debit;
    const totalSaidas = periodPaidExpenses.reduce((acc, curr) => acc + curr.value, 0) + totals.sangria;

    return { 
      ...totals, 
      totalVendas, 
      totalSaidas, 
      saldo: totalVendas - totalSaidas,
      filteredEntries: periodEntries,
      filteredExpenses: periodPaidExpenses
    };
  };

  const stats = useMemo(() => {
    return {
      custom: calculatePeriodStats(d => d.toISOString().split('T')[0] === selectedDailyDate)
    };
  }, [entries, expenses, selectedDailyDate]);

  const handleExportPDF = () => {
    window.print();
  };

  return (
    <div className="h-full flex flex-col gap-6 overflow-hidden">
      <div className="flex items-center justify-between shrink-0">
        <h2 className="text-2xl font-black text-gray-900 tracking-tighter">Auditoria de Dados</h2>
        <div className="flex items-center gap-3">
          <div className="relative flex items-center bg-white border border-gray-100 rounded-xl px-4 py-2 shadow-subtle">
            <Calendar size={14} className="text-green-600 mr-2" />
            <input type="date" value={selectedDailyDate} onChange={(e) => setSelectedDailyDate(e.target.value)} className="bg-transparent border-none outline-none text-[10px] font-black text-gray-700" />
          </div>
          <button onClick={handleExportPDF} className="p-2 bg-green-600 text-white rounded-xl shadow-subtle hover:brightness-105 active:scale-95 transition-all">
            <Download size={18} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4 shrink-0">
        <MiniStat label="Espécie" value={stats.custom.cash} icon={<Banknote size={16} />} color="green" />
        <MiniStat label="Pix" value={stats.custom.pix} icon={<Landmark size={16} />} color="cyan" />
        <MiniStat label="Cartões" value={stats.custom.credit + stats.custom.debit} icon={<CreditCard size={16} />} color="blue" />
        <MiniStat label="Sangrias" value={stats.custom.sangria} icon={<PiggyBank size={16} />} color="orange" />
        <div className="bg-green-600 rounded-2xl p-4 text-white flex flex-col justify-center">
           <span className="text-[8px] font-black uppercase tracking-widest opacity-60">Líquido</span>
           <span className="text-lg font-black tracking-tight">R$ {(stats.custom.totalVendas - stats.custom.sangria).toLocaleString('pt-BR')}</span>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-3xl border border-gray-100 shadow-subtle overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto custom-scrollbar">
           <table className="w-full text-left">
              <thead className="sticky top-0 bg-white z-10 shadow-sm shadow-gray-100">
                 <tr className="bg-gray-50/50 text-[9px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">
                    <th className="px-8 py-5">Operação / Turno</th>
                    <th className="px-8 py-5 text-right">Espécie</th>
                    <th className="px-8 py-5 text-right">Pix</th>
                    <th className="px-8 py-5 text-right">Cartão</th>
                    <th className="px-8 py-5 text-right text-orange-500">Sangria</th>
                    <th className="px-8 py-5 text-right">Saldo</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                 {stats.custom.filteredEntries.map(e => (
                    <tr key={e.id} className="hover:bg-green-50/10 transition-colors">
                       <td className="px-8 py-5 flex items-center gap-3">
                          <ArrowRightCircle size={14} className="text-green-600" />
                          <span className="text-[10px] font-black text-gray-800 uppercase tracking-widest">{e.shift}</span>
                       </td>
                       <td className="px-8 py-5 text-right text-[10px] font-bold text-gray-600">R$ {e.cash.toFixed(0)}</td>
                       <td className="px-8 py-5 text-right text-[10px] font-bold text-gray-600">R$ {e.pix.toFixed(0)}</td>
                       <td className="px-8 py-5 text-right text-[10px] font-bold text-gray-600">R$ {(e.credit + e.debit).toFixed(0)}</td>
                       <td className="px-8 py-5 text-right text-[10px] font-black text-orange-500">-R$ {e.sangria.toFixed(0)}</td>
                       <td className="px-8 py-5 text-right text-[11px] font-black text-gray-900">R$ {(e.cash + e.pix + e.credit + e.debit - e.sangria).toLocaleString('pt-BR')}</td>
                    </tr>
                 ))}
              </tbody>
           </table>
        </div>
      </div>
    </div>
  );
};

const MiniStat = ({ label, value, icon, color }: any) => {
  const colorMap: any = {
    green: 'text-green-600',
    cyan: 'text-cyan-700',
    blue: 'text-blue-600',
    orange: 'text-orange-600'
  };
  return (
    <div className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center gap-3 shadow-subtle">
       <div className={`${colorMap[color]} opacity-40 shrink-0`}>{icon}</div>
       <div className="min-w-0">
          <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest truncate">{label}</p>
          <p className="text-sm font-black text-gray-800 truncate">R$ {value.toFixed(0)}</p>
       </div>
    </div>
  );
};

export default Reports;
