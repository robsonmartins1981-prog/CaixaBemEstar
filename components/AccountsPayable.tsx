
import React, { useState } from 'react';
import { Expense, ExpenseCategory, ExpenseStatus } from '../types';
import { db } from '../services/db';
import { COLORS, CATEGORIES } from '../constants';
import { Plus, Trash2, CheckCircle2, AlertTriangle, Clock, Receipt, Tag, DollarSign, Calendar, FileText } from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';

interface AccountsPayableProps {
  onSuccess: () => void;
  expenses: Expense[];
}

const AccountsPayable: React.FC<AccountsPayableProps> = ({ onSuccess, expenses }) => {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Omit<Expense, 'id'>>({
    description: '',
    dueDate: new Date().toISOString().split('T')[0],
    value: 0,
    category: 'Fornecedores',
    status: 'Pendente',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    db.saveExpense({ ...formData, id: crypto.randomUUID() });
    onSuccess();
    setFormData({ ...formData, description: '', value: 0 });
  };

  const today = new Date().toISOString().split('T')[0];
  const sortedExpenses = [...expenses].sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  const lateCount = expenses.filter(e => e.status === 'Pendente' && e.dueDate < today).length;
  const dueTodayCount = expenses.filter(e => e.status === 'Pendente' && e.dueDate === today).length;
  const pendingTotal = expenses.filter(e => e.status === 'Pendente').reduce((acc, curr) => acc + curr.value, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start animate-in fade-in duration-500">
      <ConfirmationModal 
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={() => { db.deleteExpense(deletingId!); onSuccess(); setDeletingId(null); }}
        title="Estornar Conta"
        message="Deseja remover este título permanentemente?"
      />

      {/* Form Sidebar - Suave */}
      <div className="lg:col-span-4 bg-white p-8 rounded-[32px] border border-gray-100 shadow-subtle h-fit">
        <div className="flex items-center gap-4 mb-10">
           <div className="w-11 h-11 rounded-xl bg-green-50 text-green-600 flex items-center justify-center border border-green-100 shadow-subtle shrink-0"><Receipt size={20} /></div>
           <div>
              <h3 className="text-lg font-black text-gray-900 tracking-tight uppercase">Novo Título</h3>
              <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mt-1">Lançamento de Despesa</p>
           </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
           <div className="space-y-2">
              <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1"><FileText size={12} className="text-green-600" /> Descrição da Conta</label>
              <input 
                type="text" 
                required 
                className="w-full h-14 px-5 rounded-xl bg-gray-50 border border-gray-100 font-black text-xs outline-none focus:bg-white focus:ring-4 focus:ring-green-50/10 transition-all" 
                value={formData.description} 
                onChange={e => setFormData({ ...formData, description: e.target.value })} 
                placeholder="Ex: Fornecedor Ambev" 
              />
           </div>

           <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                 <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1"><Calendar size={12} className="text-green-600" /> Vencimento</label>
                 <input 
                  type="date" 
                  required 
                  className="w-full h-14 px-4 rounded-xl bg-gray-50 border border-gray-100 font-black text-xs outline-none focus:bg-white transition-all" 
                  value={formData.dueDate} 
                  onChange={e => setFormData({ ...formData, dueDate: e.target.value })} 
                />
              </div>
              <div className="space-y-2">
                 <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1"><DollarSign size={12} className="text-green-600" /> Valor R$</label>
                 <input 
                  type="number" 
                  step="0.01" 
                  required 
                  className="w-full h-14 px-4 rounded-xl bg-gray-50 border border-gray-100 font-black text-xs outline-none focus:bg-white transition-all" 
                  value={formData.value || ''} 
                  onChange={e => setFormData({ ...formData, value: parseFloat(e.target.value) || 0 })} 
                  placeholder="0,00" 
                />
              </div>
           </div>

           <div className="space-y-2">
              <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1"><Tag size={12} className="text-green-600" /> Categoria</label>
              <select 
                className="w-full h-14 px-5 rounded-xl bg-gray-50 border border-gray-100 font-black text-xs uppercase outline-none cursor-pointer focus:bg-white transition-all" 
                value={formData.category} 
                onChange={e => setFormData({ ...formData, category: e.target.value as ExpenseCategory })}
              >
                 {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
           </div>

           <div className="pt-6">
              <button 
                type="submit" 
                className="w-full h-14 rounded-2xl text-white font-black uppercase tracking-[0.2em] text-[11px] shadow-subtle hover:brightness-105 transition-all flex items-center justify-center gap-3 active:scale-95" 
                style={{ backgroundColor: COLORS.green }}
              >
                 <Plus size={18} /> Salvar Título
              </button>
           </div>
        </form>
      </div>

      {/* Main Area - Sombras Suaves */}
      <div className="lg:col-span-8 space-y-8">
         <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <SummaryBlock label="Em Atraso" value={lateCount.toString()} icon={<AlertTriangle size={18} />} color="orange" />
            <SummaryBlock label="Vencem Hoje" value={dueTodayCount.toString()} icon={<Clock size={18} />} color="yellow" />
            <SummaryBlock label="Em Aberto" value={`R$ ${pendingTotal.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`} icon={<DollarSign size={18} />} color="green" />
         </div>

         <div className="bg-white rounded-[32px] border border-gray-100 shadow-subtle overflow-hidden flex flex-col">
            <div className="px-10 py-10 border-b border-gray-50 bg-[#FBFDFF] flex justify-between items-center">
               <h3 className="text-lg font-black text-gray-900 uppercase tracking-widest">Relação de Contas</h3>
               <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest border border-gray-100 px-4 py-2 rounded-full">{expenses.length} Títulos</span>
            </div>
            <div className="overflow-x-auto custom-scrollbar">
               <table className="w-full text-left">
                  <thead>
                     <tr className="bg-gray-50/50 text-[8px] font-black text-gray-400 uppercase tracking-[0.3em] border-b border-gray-50">
                        <th className="px-10 py-5">Vencimento</th>
                        <th className="px-10 py-5">Descrição / Credor</th>
                        <th className="px-10 py-5 text-right">Valor</th>
                        <th className="px-10 py-5 text-center">Status</th>
                        <th className="px-10 py-5 text-center">Ações</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                     {sortedExpenses.map(exp => {
                        const isLate = exp.status === 'Pendente' && exp.dueDate < today;
                        return (
                           <tr key={exp.id} className={`hover:bg-gray-50 transition-all group ${isLate ? 'bg-orange-50/10' : ''}`}>
                              <td className="px-10 py-7">
                                 <span className={`text-[11px] font-black uppercase tracking-widest ${isLate ? 'text-orange-600' : 'text-gray-800'}`}>
                                  {exp.dueDate.split('-').reverse().slice(0, 2).join('/')}
                                 </span>
                              </td>
                              <td className="px-10 py-7">
                                 <div className="flex flex-col">
                                    <span className="text-xs font-bold text-gray-800 tracking-tight">{exp.description}</span>
                                    <span className="text-[8px] text-gray-400 font-black uppercase mt-1 tracking-widest">{exp.category}</span>
                                 </div>
                              </td>
                              <td className="px-10 py-7 text-right text-sm font-black text-gray-900">R$ {exp.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                              <td className="px-10 py-7 text-center">
                                 <button 
                                  onClick={() => { db.updateExpenseStatus(exp.id, exp.status === 'Pendente' ? 'Pago' : 'Pendente'); onSuccess(); }} 
                                  className={`px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all active:scale-95 min-w-[100px] ${exp.status === 'Pago' ? 'bg-green-50 text-green-600 border-green-100 hover:bg-green-100' : 'bg-white text-gray-300 border-gray-100 hover:text-green-600 hover:border-green-200 hover:shadow-subtle'}`}
                                 >
                                    {exp.status}
                                 </button>
                              </td>
                              <td className="px-10 py-7">
                                 <div className="flex justify-center opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                                    <button onClick={() => setDeletingId(exp.id)} className="w-10 h-10 flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all active:scale-95"><Trash2 size={18} /></button>
                                 </div>
                              </td>
                           </tr>
                        );
                     })}
                     {expenses.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-10 py-20 text-center">
                            <p className="text-[10px] font-black uppercase text-gray-300 tracking-[0.4em]">Nenhuma conta lançada</p>
                          </td>
                        </tr>
                     )}
                  </tbody>
               </table>
            </div>
         </div>
      </div>
    </div>
  );
};

const SummaryBlock = ({ label, value, icon, color }: any) => {
  const colorMap: any = {
    orange: 'bg-orange-50 text-orange-600 border-orange-100',
    yellow: 'bg-yellow-50 text-yellow-600 border-yellow-100',
    green: 'bg-green-50 text-green-600 border-green-100',
  };
  return (
    <div className={`p-6 rounded-[24px] border flex items-center gap-5 bg-white shadow-subtle transition-all hover:-translate-y-1 hover:shadow-subtle-lg ${colorMap[color]}`}>
       <div className={`w-11 h-11 rounded-xl flex items-center justify-center bg-white shadow-subtle shrink-0 ${colorMap[color]}`}>{icon}</div>
       <div className="min-w-0">
          <p className="text-[9px] font-black opacity-50 uppercase tracking-widest truncate">{label}</p>
          <p className="text-xl font-black text-gray-800 tracking-tighter truncate leading-none mt-1">{value}</p>
       </div>
    </div>
  );
};

export default AccountsPayable;
