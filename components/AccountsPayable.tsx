
import React, { useState } from 'react';
import { Expense, ExpenseCategory } from '../types';
import { db } from '../services/db';
import { COLORS, CATEGORIES } from '../constants';
import { Plus, Trash2, Receipt, Calendar, List, CheckCircle, Clock } from 'lucide-react';
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
    <div className="flex-1 flex flex-col lg:flex-row gap-4 h-full overflow-hidden">
      <ConfirmationModal 
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={() => { db.deleteExpense(deletingId!); onSuccess(); setDeletingId(null); }}
        title="Apagar Título"
        message="Deseja excluir permanentemente este título do contas a pagar?"
      />

      {/* PAINEL DE INSERÇÃO (ESQUERDA) */}
      <div className="lg:w-[450px] bg-white border border-slate-200 shadow-sm flex flex-col h-full shrink-0">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt size={18} className="text-blue-600"/>
            <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-600">Cadastro de Títulos</h3>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 p-6 flex flex-col gap-6">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase">Descrição / Credor</label>
            <input 
              type="text" 
              required 
              className="w-full h-12 px-4 bg-slate-50 border border-slate-200 text-sm font-bold focus:bg-white outline-none" 
              value={formData.description} 
              onChange={e => setFormData({ ...formData, description: e.target.value })} 
              placeholder="Ex: Aluguel da Loja"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase">Data de Vencimento</label>
              <input 
                type="date" 
                required 
                className="w-full h-12 px-4 bg-slate-50 border border-slate-200 text-sm font-bold outline-none" 
                value={formData.dueDate} 
                onChange={e => setFormData({ ...formData, dueDate: e.target.value })} 
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase">Valor do Título</label>
              <div className="relative flex items-center h-12 px-4 bg-slate-50 border border-slate-200">
                <span className="text-xs font-black text-slate-300 mr-2">R$</span>
                <input 
                  type="number" 
                  step="0.01" 
                  required 
                  className="w-full bg-transparent border-none outline-none font-mono font-black text-lg text-slate-700" 
                  value={formData.value || ''} 
                  onChange={e => setFormData({ ...formData, value: parseFloat(e.target.value) || 0 })} 
                  placeholder="0,00"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase">Categoria Financeira</label>
            <select 
              className="w-full h-12 px-4 bg-slate-50 border border-slate-200 text-[10px] font-black uppercase outline-none" 
              value={formData.category} 
              onChange={e => setFormData({ ...formData, category: e.target.value as ExpenseCategory })}
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="mt-auto pt-6 border-t border-slate-100 flex flex-col gap-4">
            <div className="p-4 bg-blue-50 border border-blue-100 rounded text-center">
              <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Total Pendente</span>
              <p className="text-2xl font-black text-blue-700 tracking-tighter mt-1">
                R$ {pendingTotal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
              </p>
            </div>
            <button type="submit" className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-[0.2em] text-xs shadow-lg transition-all flex items-center justify-center gap-3 active:scale-95">
              <Plus size={18}/> Salvar no Cronograma
            </button>
          </div>
        </form>
      </div>

      {/* GRADE DE PLANILHA (DIREITA) */}
      <div className="flex-1 bg-white border border-slate-200 shadow-sm flex flex-col overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <List size={18} className="text-slate-400"/>
            <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-600">Listagem de Compromissos</h3>
          </div>
        </div>

        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 bg-slate-100 z-10">
              <tr className="border-b border-slate-200">
                <th className="px-4 py-3 text-left text-[9px] font-black text-slate-500 uppercase border-r border-slate-200">Vencimento</th>
                <th className="px-4 py-3 text-left text-[9px] font-black text-slate-500 uppercase border-r border-slate-200">Descrição / Credor</th>
                <th className="px-4 py-3 text-left text-[9px] font-black text-slate-500 uppercase border-r border-slate-200">Categoria</th>
                <th className="px-4 py-3 text-right text-[9px] font-black text-slate-500 uppercase border-r border-slate-200">Valor R$</th>
                <th className="px-4 py-3 text-center text-[9px] font-black text-slate-500 uppercase border-r border-slate-200">Status</th>
                <th className="px-4 py-3 text-center text-[9px] font-black text-slate-500 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedExpenses.map((exp, idx) => {
                const isLate = exp.status === 'Pendente' && exp.dueDate < today;
                return (
                  <tr key={exp.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} hover:bg-blue-50 transition-colors ${isLate ? 'text-red-500 bg-red-50/20' : ''}`}>
                    <td className="px-4 py-3 text-[10px] font-mono font-bold border-r border-slate-100">
                      {exp.dueDate.split('-').reverse().slice(0, 2).join('/')}
                    </td>
                    <td className="px-4 py-3 text-[10px] font-bold border-r border-slate-100 uppercase tracking-tight">{exp.description}</td>
                    <td className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase border-r border-slate-100">{exp.category}</td>
                    <td className="px-4 py-3 text-right text-[11px] font-mono font-black border-r border-slate-100">R$ {exp.value.toFixed(2)}</td>
                    <td className="px-4 py-3 text-center border-r border-slate-100">
                      <button 
                        onClick={() => { db.updateExpenseStatus(exp.id, exp.status === 'Pendente' ? 'Pago' : 'Pendente'); onSuccess(); }}
                        className={`px-3 py-1 rounded text-[8px] font-black uppercase tracking-widest border transition-all ${
                          exp.status === 'Pago' ? 'bg-green-500 text-white border-green-600 shadow-sm' : 'bg-white text-slate-400 border-slate-200 hover:border-blue-400 hover:text-blue-500'
                        }`}
                      >
                        {exp.status === 'Pago' ? <span className="flex items-center gap-1"><CheckCircle size={10}/> Pago</span> : <span className="flex items-center gap-1"><Clock size={10}/> Pendente</span>}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center">
                        <button onClick={() => setDeletingId(exp.id)} className="p-1.5 text-slate-300 hover:text-red-500 transition-all"><Trash2 size={14}/></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {sortedExpenses.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-20 text-center text-[10px] font-black text-slate-300 uppercase tracking-widest">Nenhuma conta lançada no sistema</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AccountsPayable;
