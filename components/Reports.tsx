
import React, { useMemo, useState } from 'react';
import { CashEntry, Expense } from '../types';
import { COLORS } from '../constants';
import { TrendingUp, Calendar, CreditCard, Wallet, Banknote, Landmark, Download, Search, Clock, ArrowRightCircle, PiggyBank, FileText } from 'lucide-react';

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
      daily: calculatePeriodStats(d => d.toDateString() === now.toDateString()),
      weekly: calculatePeriodStats(d => {
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        return d >= startOfWeek;
      }),
      monthly: calculatePeriodStats(d => d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()),
      yearly: calculatePeriodStats(d => d.getFullYear() === now.getFullYear()),
      custom: calculatePeriodStats(d => d.toISOString().split('T')[0] === selectedDailyDate)
    };
  }, [entries, expenses, selectedDailyDate]);

  const handleExportPDF = () => {
    // Adiciona título temporário para o PDF
    const originalTitle = document.title;
    document.title = `Relatorio_Financeiro_${selectedDailyDate.replace(/-/g, '_')}`;
    window.print();
    document.title = originalTitle;
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      {/* Print Header - Only visible on PDF */}
      <div className="hidden print:flex items-center justify-between border-b-2 border-green-600 pb-6 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-green-600 flex items-center justify-center text-white font-black italic">BE</div>
          <div>
            <h1 className="text-xl font-black tracking-tighter" style={{ color: '#8AC926' }}>Bem Estar Controle</h1>
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Relatório Analítico de Fluxo</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black text-gray-400 uppercase">Emissão</p>
          <p className="text-xs font-black text-gray-900">{new Date().toLocaleString('pt-BR')}</p>
        </div>
      </div>

      <div className="flex flex-col gap-2 print:hidden">
        <h2 className="text-3xl font-black text-gray-900 tracking-tight">Inteligência Financeira</h2>
        <p className="text-[11px] text-gray-400 font-black uppercase tracking-[0.3em]">Consolidação e Auditoria de Dados</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 print:hidden">
        <PeriodReportCard title="Diário (Hoje)" data={stats.daily} onExport={handleExportPDF} />
        <PeriodReportCard title="Semana Atual" data={stats.weekly} onExport={handleExportPDF} />
        <PeriodReportCard title="Consolidado Mês" data={stats.monthly} onExport={handleExportPDF} />
        <PeriodReportCard title="Fechamento Ano" data={stats.yearly} onExport={handleExportPDF} />
      </div>

      <section className="bg-white p-12 rounded-[48px] shadow-subtle border border-gray-100 flex flex-col space-y-10 print:p-0 print:border-none print:shadow-none">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 border-b border-gray-100 pb-10">
          <div className="flex items-center gap-6">
             <div className="w-16 h-16 rounded-[24px] bg-green-50 text-green-600 flex items-center justify-center shadow-subtle print:hidden"><ArrowRightCircle size={32} /></div>
             <div>
                <h3 className="text-2xl font-black text-gray-900 tracking-tight uppercase tracking-wider">Detalhamento Analítico</h3>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1 opacity-60">Consolidado para {selectedDailyDate.split('-').reverse().join('/')}</p>
             </div>
          </div>
          
          <div className="flex items-center gap-4 no-print">
             <div className="flex items-center gap-4 bg-gray-50 p-2 rounded-[20px] border border-gray-100">
                <div className="relative">
                   <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-green-600" size={16} />
                   <input type="date" value={selectedDailyDate} onChange={(e) => setSelectedDailyDate(e.target.value)} className="pl-12 pr-6 py-3 bg-white rounded-xl border border-gray-200 text-xs font-black outline-none focus:ring-4 focus:ring-green-500/10 transition-all shadow-subtle" />
                </div>
             </div>
             <button 
                onClick={handleExportPDF}
                className="h-12 px-8 rounded-xl bg-green-600 text-white font-black uppercase tracking-widest text-[10px] flex items-center gap-3 shadow-subtle hover:brightness-105 transition-all active:scale-95"
             >
                <Download size={18} /> Exportar PDF
             </button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-6">
           <DetailKpiCard label="Em Espécie" value={stats.custom.cash} color="green" icon={<Banknote size={18} />} />
           <DetailKpiCard label="Transferência Pix" value={stats.custom.pix} color="cyan" icon={<Landmark size={18} />} />
           <DetailKpiCard label="Cartão Total" value={stats.custom.credit + stats.custom.debit} color="blue" icon={<CreditCard size={18} />} />
           <DetailKpiCard label="Retiradas (Sangria)" value={stats.custom.sangria} color="orange" icon={<PiggyBank size={18} />} />
           <div className="col-span-2 lg:col-span-1 bg-green-600 rounded-[32px] p-8 text-white flex flex-col justify-center shadow-subtle print:bg-white print:text-gray-900 print:border print:border-gray-200">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-80 mb-2 print:text-gray-400">Faturamento Bruto</span>
              <span className="text-3xl font-black tracking-tighter leading-none">R$ {stats.custom.totalVendas.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</span>
              <div className="mt-4 pt-4 border-t border-white/20 print:border-gray-100 flex justify-between items-center opacity-70">
                 <span className="text-[9px] font-black uppercase">Líquido:</span>
                 <span className="text-xs font-black">R$ {(stats.custom.totalVendas - stats.custom.sangria).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
           </div>
        </div>

        <div className="overflow-hidden border border-gray-100 rounded-[32px] bg-white print:rounded-none">
           <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                 <thead>
                    <tr className="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100">
                       <th className="px-10 py-6">Operação / Turno</th>
                       <th className="px-10 py-6 text-center">Espécie</th>
                       <th className="px-10 py-6 text-center">Pix</th>
                       <th className="px-10 py-6 text-center">Cartão</th>
                       <th className="px-10 py-6 text-center text-orange-500">Sangria</th>
                       <th className="px-10 py-6 text-right">Saldo</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-50">
                    {stats.custom.filteredEntries.map(e => (
                       <tr key={e.id} className="hover:bg-green-50/20 transition-colors">
                          <td className="px-10 py-7 flex items-center gap-4">
                             <div className="w-10 h-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center font-black text-xs shadow-subtle print:hidden"><Clock size={16} /></div>
                             <span className="text-xs font-black text-gray-800 uppercase tracking-widest">{e.shift}</span>
                          </td>
                          <td className="px-10 py-7 text-center text-xs font-bold text-gray-600">R$ {e.cash.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                          <td className="px-10 py-7 text-center text-xs font-bold text-gray-600">R$ {e.pix.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                          <td className="px-10 py-7 text-center text-xs font-bold text-gray-600">R$ {(e.credit + e.debit).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                          <td className="px-10 py-7 text-center text-xs font-black text-orange-500">- R$ {e.sangria.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                          <td className="px-10 py-7 text-right text-sm font-black text-gray-900">R$ {(e.cash + e.pix + e.credit + e.debit - e.sangria).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                       </tr>
                    ))}
                    {stats.custom.filteredEntries.length === 0 && (
                       <tr>
                          <td colSpan={6} className="px-10 py-24 text-center">
                             <Search size={48} className="mx-auto mb-4 opacity-10" />
                             <p className="text-[10px] font-black uppercase text-gray-300 tracking-[0.3em]">Nenhum dado consolidado para esta data</p>
                          </td>
                       </tr>
                    )}
                 </tbody>
              </table>
           </div>
        </div>
        
        {/* Print Footer - Only PDF */}
        <div className="hidden print:block text-center pt-12 border-t border-gray-100">
          <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.5em]">Bem Estar Controle - Sistema de Gestão Administrativa</p>
        </div>
      </section>
    </div>
  );
};

const PeriodReportCard = ({ title, data, onExport }: any) => (
  <div className="bg-white p-8 rounded-[32px] shadow-subtle border border-gray-100 flex flex-col group hover:border-green-200 transition-all duration-500 hover:-translate-y-1">
     <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
           <div className="w-11 h-11 rounded-xl bg-green-50 text-green-600 flex items-center justify-center border border-green-100 shadow-subtle"><FileText size={20} /></div>
           <span className="font-black text-gray-900 uppercase tracking-tighter text-xs">{title}</span>
        </div>
        <button 
          onClick={onExport}
          className="w-10 h-10 flex items-center justify-center text-gray-300 hover:text-green-600 hover:bg-green-50 rounded-xl transition-all active:scale-95"
        >
          <Download size={18} />
        </button>
     </div>
     <div className="space-y-4 flex-1">
        <div className="flex justify-between items-center text-xs">
           <span className="text-gray-400 font-black uppercase tracking-widest text-[9px]">Bruto</span>
           <span className="font-black text-gray-900">R$ {data.totalVendas.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</span>
        </div>
        <div className="flex justify-between items-center text-xs">
           <span className="text-gray-400 font-black uppercase tracking-widest text-[9px]">Saídas</span>
           <span className="font-black text-orange-500">- R$ {data.totalSaidas.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</span>
        </div>
        <div className="pt-4 border-t border-gray-50 flex justify-between items-center">
           <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Saldo</span>
           <span className={`text-xl font-black ${data.saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            R$ {data.saldo.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
           </span>
        </div>
     </div>
  </div>
);

const DetailKpiCard = ({ label, value, color, icon }: any) => {
  const colorMap: any = {
    green: 'bg-green-50 text-green-600 border-green-100/50',
    cyan: 'bg-cyan-50 text-cyan-700 border-cyan-100/50',
    blue: 'bg-blue-50 text-blue-600 border-blue-100/50',
    orange: 'bg-orange-50 text-orange-600 border-orange-100/50'
  };
  return (
    <div className={`p-6 rounded-[24px] border flex flex-col gap-4 shadow-subtle transition-all hover:bg-white hover:shadow-subtle-lg duration-500 ${colorMap[color]}`}>
       <div className="flex items-center justify-between opacity-50">
          <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
          {icon}
       </div>
       <span className="text-lg font-black tracking-tight">R$ {value.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
    </div>
  );
};

export default Reports;
