
import React, { useState } from 'react';
import { Expense, ExpenseCategory } from '../types';
import { db } from '../services/db';
import { COLORS, CATEGORIES } from '../constants';
import { Plus, Trash2, Receipt, DollarSign, Calendar } from 'lucide-react';
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
    db.saveExpense({ ...formData, id: db.generateId() });
    onSuccess();
    setFormData({ ...formData, description: '', value: 0 });
  };

  const today = new Date().toISOString().split('T')[0];
  const sortedExpenses = [...expenses].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const pendingTotal = expenses.filter(e => e.status === 'Pendente').reduce((acc, curr) => acc + curr.value, 0);

  return (
    <div className="h-full flex flex-col gap-5 overflow-hidden">
      <ConfirmationModal 
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={() => { db.deleteExpense(deletingId!); onSuccess(); setDeletingId(null); }}
        title="Apagar"
        message="Excluir este título?"
      />

      <div className="flex-1 grid grid-cols-12 gap-6 min-h-0 overflow-hidden">
        {/* Form Column - Otimizada para evitar scroll */}
        <div className="col-span-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-subtle flex flex-col overflow-y-auto custom-scrollbar">
          <div className="flex items-center gap-4 mb-6 shrink-0">
             <div className="w-10 h-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center border border-green-100 shadow-sm"><Receipt size={20} /></div>
             <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">Novo Título</h3>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
             <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Credor</label>
                <input type="text" required className="w-full h-11 px-4 rounded-xl bg-gray-50 border border-gray-100 font-black text-xs outline-none focus:bg-white transition-colors" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Identificação" />
             </div>

             <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                   <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Vencimento</label>
                   <input type="date" required className="w-full h-11 px-3 rounded-xl bg-gray-50 border border-gray-100 font-black text-[10px] outline-none" value={formData.dueDate} onChange={e => setFormData({ ...formData, dueDate: e.target.value })} />
                </div>
                <div className="space-y-1">
                   <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Valor R$</label>
                   <input type="number" step="0.01" required className="w-full h-11 px-3 rounded-xl bg-gray-50 border border-gray-100 font-black text-xs outline-none" value={formData.value || ''} onChange={e => setFormData({ ...formData, value: parseFloat(e.target.value) || 0 })} placeholder="0,00" />
                </div>
             </div>

             <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Categoria</label>
                <select className="w-full h-11 px-4 rounded-xl bg-gray-50 border border-gray-100 font-black text-xs uppercase outline-none cursor-pointer" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value as ExpenseCategory })}>
                   {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
             </div>

             <div className="pt-2">
                <button 
                  type="submit" 
                  className="w-full h-12 rounded-xl text-white font-black uppercase tracking-widest text-[10px] shadow-subtle hover:brightness-105 active:scale-95 transition-all flex items-center justify-center gap-2" 
                  style={{ backgroundColor: COLORS.green }}
                >
                   <Plus size={16} /> Salvar Título
                </button>
             </div>

             <div className="mt-2 p-4 rounded-2xl bg-green-50 border border-green-100 flex flex-col items-center text-center">
               <span className="text-[9px] font-black text-green-600 uppercase tracking-widest">Saldo Aberto</span>
               <p className="text-xl font-black text-green-700 tracking-tighter leading-none mt-1">R$ {pendingTotal.toLocaleString('pt-BR')}</p>
             </div>
          </form>
        </div>

        {/* List Column */}
        <div className="col-span-8 bg-white rounded-3xl border border-gray-100 shadow-subtle flex flex-col overflow-hidden">
           <div className="px-8 py-5 border-b border-gray-50 bg-[#FBFDFF] flex justify-between items-center shrink-0">
              <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest">Cronograma de Pagamentos</h3>
              <span className="text-[9px] font-black text-gray-400 uppercase border border-gray-100 px-3 py-1 rounded-full">{expenses.length} Títulos</span>
           </div>
           <div className="flex-1 overflow-y-auto custom-scrollbar">
              <table className="w-full text-left">
                 <thead className="sticky top-0 bg-white z-10 shadow-sm shadow-gray-100">
                    <tr className="bg-gray-50/50 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                       <th className="px-8 py-4">Data</th>
                       <th className="px-8 py-4">Credor</th>
                       <th className="px-8 py-4 text-right">Valor</th>
                       <th className="px-8 py-4 text-center">Status</th>
                       <th className="px-8 py-4 text-center">Gestão</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-50">
                    {sortedExpenses.map(exp => {
                       const isLate = exp.status === 'Pendente' && exp.dueDate < today;
                       return (
                          <tr key={exp.id} className={`hover:bg-gray-50 group transition-colors ${isLate ? 'bg-orange-50/20' : ''}`}>
                             <td className="px-8 py-4">
                                <span className={`text-[11px] font-black uppercase tracking-tighter ${isLate ? 'text-orange-600' : 'text-gray-800'}`}>
                                 {exp.dueDate.split('-').reverse().slice(0, 2).join('/')}
                                </span>
                             </td>
                             <td className="px-8 py-4">
                                <div className="flex flex-col">
                                   <span className="text-[11px] font-bold text-gray-800 tracking-tight truncate max-w-[150px]">{exp.description}</span>
                                   <span className="text-[8px] text-gray-400 font-black uppercase">{exp.category}</span>
                                </div>
                             </td>
                             <td className="px-8 py-4 text-right text-[11px] font-black text-gray-900">R$ {exp.value.toLocaleString('pt-BR')}</td>
                             <td className="px-8 py-4 text-center">
                                <button onClick={() => { db.updateExpenseStatus(exp.id, exp.status === 'Pendente' ? 'Pago' : 'Pendente'); onSuccess(); }} className={`px-4 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest border transition-all ${exp.status === 'Pago' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-white text-gray-300 border-gray-100 hover:text-green-600 hover:border-green-200'}`}>
                                   {exp.status}
                                </button>
                             </td>
                             <td className="px-8 py-4">
                                <div className="flex justify-center opacity-0 group-hover:opacity-100">
                                   <button onClick={() => setDeletingId(exp.id)} className="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-red-500 rounded-lg transition-all"><Trash2 size={14} /></button>
                                </div>
                             </td>
                          </tr>
                       );
                    })}
                 </tbody>
              </table>
           </div>
        </div>
      </div>
    </div>
  );
};

export default AccountsPayable;
