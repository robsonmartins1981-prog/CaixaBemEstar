
import React, { useState, useEffect, useRef } from 'react';
import { Expense, ExpenseNature, CostType, Supplier } from '../types';
import { db } from '../services/db';
import { NATURES, COST_TYPES } from '../constants';
import { 
  Plus, Trash2, Receipt, List, CheckCircle, Clock, 
  Calendar as CalendarIcon, DollarSign, User, Edit2, X, Layers, Timer, ChevronDown, Search
} from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';

interface AccountsPayableProps {
  onSuccess: () => void;
  expenses: Expense[];
}

const formatMoney = (val: number) => 
  val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });

const AccountsPayable: React.FC<AccountsPayableProps> = ({ onSuccess, expenses }) => {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [installments, setInstallments] = useState<number>(1);
  const [installmentDates, setInstallmentDates] = useState<string[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const [formData, setFormData] = useState<Omit<Expense, 'id'>>({
    description: '',
    supplier: '',
    dueDate: new Date().toISOString().split('T')[0],
    value: 0,
    nature: 'Compras',
    costType: 'Variável',
    status: 'Pendente',
  });

  useEffect(() => {
    setSuppliers(db.getSuppliers());
    
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowSupplierDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Atualiza as datas das parcelas quando a quantidade ou a data base muda
  useEffect(() => {
    if (!editingId && installments > 0) {
      generateDates(30); // Padrão mensal ao mudar qtde
    }
  }, [installments, formData.dueDate, editingId]);

  const generateDates = (days: number) => {
    const newDates = [];
    for (let i = 0; i < installments; i++) {
      const baseDate = new Date(formData.dueDate + 'T12:00:00');
      if (days === 30) {
        baseDate.setMonth(baseDate.getMonth() + i);
      } else {
        baseDate.setDate(baseDate.getDate() + (i * days));
      }
      newDates.push(baseDate.toISOString().split('T')[0]);
    }
    setInstallmentDates(newDates);
  };

  const resetForm = () => {
    setFormData({
      description: '',
      supplier: '',
      dueDate: new Date().toISOString().split('T')[0],
      value: 0,
      nature: 'Compras',
      costType: 'Variável',
      status: 'Pendente',
    });
    setEditingId(null);
    setInstallments(1);
    setInstallmentDates([]);
  };

  const handleEdit = (expense: Expense) => {
    setFormData({
      description: expense.description,
      supplier: expense.supplier,
      dueDate: expense.dueDate,
      value: expense.value,
      nature: expense.nature,
      costType: expense.costType,
      status: expense.status
    });
    setEditingId(expense.id);
    setInstallments(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDateChange = (index: number, value: string) => {
    const updated = [...installmentDates];
    updated[index] = value;
    setInstallmentDates(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingId) {
      db.updateExpense(editingId, formData);
    } else {
      if (installments > 1) {
        const valuePerInstallment = formData.value / installments;
        installmentDates.forEach((date, i) => {
          db.saveExpense({
            ...formData,
            description: `${formData.description} (${i + 1}/${installments})`,
            value: valuePerInstallment,
            dueDate: date
          });
        });
      } else {
        db.saveExpense(formData);
      }
    }
    
    onSuccess();
    resetForm();
  };

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    const numericValue = parseInt(raw, 10) / 100 || 0;
    setFormData({ ...formData, value: numericValue });
  };

  const filteredSuppliers = suppliers.filter(s => 
    formData.supplier && s.name.toLowerCase().includes(formData.supplier.toLowerCase())
  );

  const today = new Date().toISOString().split('T')[0];
  const sortedExpenses = [...expenses].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const pendingTotal = expenses.filter(e => e.status === 'Pendente').reduce((acc, curr) => acc + curr.value, 0);

  return (
    <div className="flex-1 flex flex-col lg:flex-row gap-6 h-full overflow-hidden pb-4 lg:pb-0">
      <ConfirmationModal 
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={() => { db.deleteExpense(deletingId!); onSuccess(); setDeletingId(null); }}
        title="Estornar Compromisso"
        message="Deseja remover este título do contas a pagar?"
      />

      {/* FORMULÁRIO */}
      <div className="w-full lg:w-[460px] bg-white border border-slate-200 shadow-sm flex flex-col shrink-0 rounded-2xl overflow-hidden order-2 lg:order-1">
        <div className={`p-4 border-b flex items-center justify-between ${editingId ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
          <div className="flex items-center gap-2">
            {editingId ? <Edit2 size={18} className="text-amber-600"/> : <Receipt size={18} className="text-blue-600"/>}
            <h3 className={`text-[11px] font-black uppercase tracking-widest ${editingId ? 'text-amber-800' : 'text-slate-700'}`}>
              {editingId ? 'Editando Compromisso' : 'Novo Título Financeiro'}
            </h3>
          </div>
          {editingId && (
            <button onClick={resetForm} className="p-1 hover:bg-amber-100 rounded text-amber-600 transition-colors">
              <X size={16}/>
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4 bg-white overflow-y-auto custom-scrollbar">
          <div className="space-y-1 relative" ref={dropdownRef}>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <User size={10}/> Fornecedor / Beneficiário
            </label>
            <div className="relative">
              <input 
                type="text" required 
                className="w-full h-11 px-4 bg-slate-50 border border-slate-200 text-sm font-bold focus:border-blue-500 focus:bg-white outline-none rounded-xl transition-all" 
                value={formData.supplier} 
                onChange={e => {
                  setFormData({ ...formData, supplier: e.target.value });
                  setShowSupplierDropdown(true);
                }}
                onFocus={() => setShowSupplierDropdown(true)}
                placeholder="Pesquise ou digite o nome..."
              />
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" size={16}/>
            </div>
            
            {showSupplierDropdown && filteredSuppliers.length > 0 && (
              <div className="absolute z-50 left-0 right-0 top-[100%] mt-1 bg-white border border-slate-200 shadow-xl rounded-xl overflow-hidden animate-in fade-in slide-in-from-top-1">
                <div className="max-h-[200px] overflow-y-auto custom-scrollbar">
                  {filteredSuppliers.map(s => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, supplier: s.name, nature: s.category as ExpenseNature });
                        setShowSupplierDropdown(false);
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-blue-50 border-b border-slate-50 last:border-0 flex items-center justify-between group"
                    >
                      <div>
                        <p className="text-[11px] font-black text-slate-700 uppercase group-hover:text-blue-600 transition-colors">{s.name}</p>
                        <p className="text-[8px] font-bold text-slate-400 uppercase">{s.category}</p>
                      </div>
                      <ChevronDown size={14} className="text-slate-200 -rotate-90"/>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <List size={10}/> Descrição Curta
            </label>
            <input 
              type="text" required 
              className="w-full h-11 px-4 bg-slate-50 border border-slate-200 text-sm font-bold focus:border-blue-500 focus:bg-white outline-none rounded-xl transition-all" 
              value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} 
              placeholder="Ex: Compra de Castanhas"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                <CalendarIcon size={10}/> {editingId ? 'Vencimento' : 'Data Base / 1ª Parcela'}
              </label>
              <input 
                type="date" required 
                className="w-full h-11 px-4 bg-slate-50 border border-slate-200 text-[11px] font-bold rounded-xl focus:border-blue-500 focus:bg-white outline-none transition-all" 
                value={formData.dueDate} onChange={e => setFormData({ ...formData, dueDate: e.target.value })} 
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                <DollarSign size={10}/> {editingId ? 'Valor R$' : 'Valor Total R$'}
              </label>
              <div className="relative flex items-center h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl focus-within:border-blue-500 focus-within:bg-white transition-all">
                <input 
                  type="text" inputMode="numeric" required 
                  className="w-full bg-transparent border-none outline-none font-mono font-black text-sm text-slate-800" 
                  value={formData.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} 
                  onChange={handleValueChange} 
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                <Layers size={10}/> Natureza
              </label>
              <select 
                className="w-full h-11 px-3 bg-slate-50 border border-slate-200 text-[10px] font-black uppercase outline-none rounded-xl focus:border-blue-500 transition-all" 
                value={formData.nature} onChange={e => setFormData({ ...formData, nature: e.target.value as ExpenseNature })}
              >
                {NATURES.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo de Custo</label>
              <select 
                className="w-full h-11 px-3 bg-slate-50 border border-slate-200 text-[10px] font-black uppercase outline-none rounded-xl focus:border-blue-500 transition-all" 
                value={formData.costType} onChange={e => setFormData({ ...formData, costType: e.target.value as CostType })}
              >
                {COST_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          {!editingId && (
            <div className="space-y-4 pt-4 border-t border-slate-100 bg-slate-50/50 -mx-5 px-5 pb-5">
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                  <Timer size={10}/> Parcelamento (Qtde Boletos)
                </label>
                <div className="grid grid-cols-6 gap-1.5">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(num => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setInstallments(num)}
                      className={`h-7 text-[9px] font-black rounded border transition-all ${
                        installments === num 
                          ? 'bg-slate-900 border-slate-900 text-white shadow-sm' 
                          : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              {installments > 1 && (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex items-center justify-between">
                     <span className="text-[9px] font-black text-blue-600 uppercase italic">Sugestões de Intervalo:</span>
                     <div className="flex gap-1">
                        {[7, 14, 21, 30].map(d => (
                           <button 
                              key={d} type="button" 
                              onClick={() => generateDates(d)}
                              className="px-2 py-1 bg-white border border-slate-200 rounded text-[8px] font-black uppercase hover:bg-blue-50 hover:text-blue-600 transition-all"
                           >
                              {d === 30 ? 'Mensal' : `${d}d`}
                           </button>
                        ))}
                     </div>
                  </div>

                  <div className="max-h-[220px] overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                    {installmentDates.map((date, idx) => (
                      <div key={idx} className="flex items-center gap-3 bg-white p-2 border border-slate-200 rounded-xl shadow-sm">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400 shrink-0">
                          #{idx + 1}
                        </div>
                        <div className="flex-1">
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Vencimento</p>
                          <input 
                            type="date" 
                            className="w-full bg-transparent border-none outline-none text-[11px] font-bold text-slate-700"
                            value={date}
                            onChange={(e) => handleDateChange(idx, e.target.value)}
                          />
                        </div>
                        <div className="text-right">
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Valor</p>
                          <p className="text-[10px] font-mono font-black text-slate-900">{formatMoney(formData.value / installments)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="pt-4 mt-auto">
            <button 
              type="submit" 
              className={`w-full h-12 text-white font-black uppercase tracking-widest text-[10px] shadow-lg transition-all flex items-center justify-center gap-3 rounded-xl active:scale-95 ${
                editingId ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-100' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-100'
              }`}
            >
              {editingId ? <CheckCircle size={16}/> : <Plus size={16}/>}
              {editingId ? 'Salvar Alterações' : installments > 1 ? `Confirmar ${installments} Lançamentos` : 'Agendar Pagamento'}
            </button>
          </div>
        </form>
      </div>

      {/* LISTAGEM */}
      <div className="flex-1 bg-white border border-slate-200 shadow-sm flex flex-col overflow-hidden rounded-2xl order-1 lg:order-2">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <List size={18} className="text-slate-400"/>
            <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-700">Controle de Saídas</h3>
          </div>
          <div className="text-[9px] font-black text-blue-600 bg-blue-50 border border-blue-100 px-3 py-1 rounded-lg">
            A Pagar: {formatMoney(pendingTotal)}
          </div>
        </div>

        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full border-collapse min-w-[900px]">
            <thead className="sticky top-0 bg-slate-50 z-10 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-[9px] font-black text-slate-500 uppercase border-r border-slate-100">Venc.</th>
                <th className="px-4 py-3 text-left text-[9px] font-black text-slate-500 uppercase border-r border-slate-100">Fornecedor</th>
                <th className="px-4 py-3 text-left text-[9px] font-black text-slate-500 uppercase border-r border-slate-100">Natureza</th>
                <th className="px-4 py-3 text-center text-[9px] font-black text-slate-500 uppercase border-r border-slate-100">Custo</th>
                <th className="px-4 py-3 text-right text-[9px] font-black text-slate-500 uppercase border-r border-slate-100">Valor R$</th>
                <th className="px-4 py-3 text-center text-[9px] font-black text-slate-500 uppercase border-r border-slate-100">Status</th>
                <th className="px-4 py-3 text-center text-[9px] font-black text-slate-500 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedExpenses.map((exp, idx) => {
                const isLate = exp.status === 'Pendente' && exp.dueDate < today;
                const isBeingEdited = editingId === exp.id;
                return (
                  <tr key={exp.id} className={`transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'} hover:bg-blue-50/50 ${isBeingEdited ? 'bg-amber-50 ring-2 ring-amber-400 ring-inset' : ''}`}>
                    <td className={`px-4 py-3 text-[10px] font-mono font-bold border-r border-slate-100 ${isLate ? 'text-red-500' : 'text-slate-600'}`}>
                      {exp.dueDate.split('-').reverse().slice(0, 2).join('/')}
                    </td>
                    <td className="px-4 py-3 text-[10px] font-bold border-r border-slate-100 uppercase truncate max-w-[150px]">
                      {exp.supplier || exp.description}
                    </td>
                    <td className="px-4 py-3 text-[8px] font-black text-slate-400 uppercase border-r border-slate-100">
                      {exp.nature}
                    </td>
                    <td className="px-4 py-3 text-center border-r border-slate-100">
                      <span className={`text-[8px] font-black px-2 py-0.5 rounded ${exp.costType === 'Fixo' ? 'bg-slate-100 text-slate-600' : 'bg-amber-50 text-amber-700'}`}>
                        {exp.costType}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-right text-[11px] font-mono font-black border-r border-slate-100 ${isLate ? 'text-red-600' : 'text-slate-900'}`}>
                      {formatMoney(exp.value)}
                    </td>
                    <td className="px-4 py-3 text-center border-r border-slate-100">
                      <button 
                        onClick={() => { db.updateExpenseStatus(exp.id, exp.status === 'Pendente' ? 'Pago' : 'Pendente'); onSuccess(); }}
                        className={`flex items-center justify-center gap-1 px-2 py-1 rounded-lg text-[8px] font-black uppercase transition-all mx-auto border ${
                          exp.status === 'Pago' ? 'bg-green-500 text-white border-green-600' : 'bg-white text-slate-400 border-slate-200'
                        }`}
                      >
                        {exp.status === 'Pago' ? <CheckCircle size={10}/> : <Clock size={10}/>} {exp.status}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button 
                          onClick={() => handleEdit(exp)} 
                          className={`p-2 transition-colors rounded-lg ${isBeingEdited ? 'text-amber-600 bg-amber-100' : 'text-slate-300 hover:text-blue-500 hover:bg-blue-50'}`}
                          title="Editar Registro"
                        >
                          <Edit2 size={14}/>
                        </button>
                        <button 
                          onClick={() => setDeletingId(exp.id)} 
                          className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Excluir Registro"
                        >
                          <Trash2 size={14}/>
                        </button>
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
  );
};

export default AccountsPayable;
