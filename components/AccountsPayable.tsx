
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Expense, ExpenseNature, Supplier } from '../types.ts';
import { db } from '../services/db.ts';
import { NATURES } from '../constants.tsx';
import { 
  Plus, Trash2, Search, Filter, X, CheckSquare, Square, 
  ChevronDown, User, Calendar, Edit2, Info, Calculator, Layers,
  TrendingUp, AlertCircle, CheckCircle2
} from 'lucide-react';
import ConfirmationModal from './ConfirmationModal.tsx';

interface AccountsPayableProps {
  onSuccess: () => void;
  expenses: Expense[];
}

const formatMoney = (val: number) => 
  val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });

const AccountsPayable: React.FC<AccountsPayableProps> = ({ onSuccess, expenses }) => {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState('Todos');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Fornecedores e Sugestões
  const [allSuppliers, setAllSuppliers] = useState<Supplier[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionRef = useRef<HTMLDivElement>(null);

  // Parcelamento
  const [isInstallment, setIsInstallment] = useState(false);
  const [installmentCount, setInstallmentCount] = useState(2);
  const [intervalDays, setIntervalDays] = useState(30);
  const [valueMode, setValueMode] = useState<'total' | 'parcel'>('total');

  // Filtros
  const [selectedNatures, setSelectedNatures] = useState<string[]>(Array.from(NATURES));
  const [showNatureFilter, setShowNatureFilter] = useState(false);

  const [formData, setFormData] = useState<Omit<Expense, 'id'>>({
    description: '', supplier: '', dueDate: new Date().toISOString().split('T')[0],
    value: 0, nature: 'Outros', costType: 'Variável', status: 'Pendente',
  });

  useEffect(() => {
    setAllSuppliers(db.getSuppliers());
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionRef.current && !suggestionRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredSuppliers = useMemo(() => {
    if (!formData.supplier.trim()) return [];
    return allSuppliers.filter(s => 
      s.name.toLowerCase().includes(formData.supplier.toLowerCase())
    ).slice(0, 5);
  }, [formData.supplier, allSuppliers]);

  const processedExpenses = useMemo(() => {
    return expenses.filter(exp => {
      const matchSearch = exp.supplier.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          exp.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchNature = selectedNatures.includes(exp.nature);
      const matchStatus = filterStatus === 'Todos' || exp.status === filterStatus || (filterStatus === 'Agendadas' && exp.status === 'Pendente');
      return matchSearch && matchNature && matchStatus;
    }).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }, [expenses, filterStatus, searchTerm, selectedNatures]);

  const handleSelectSupplier = (s: Supplier) => {
    setFormData(prev => ({ 
      ...prev, 
      supplier: s.name, 
      nature: (s.category as any) || prev.nature 
    }));
    setShowSuggestions(false);
  };

  const addDays = (dateStr: string, days: number) => {
    const date = new Date(dateStr + 'T12:00:00');
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  };

  const handleEdit = (expense: Expense) => {
    setEditingId(expense.id);
    setFormData({
      description: expense.description,
      supplier: expense.supplier,
      dueDate: expense.dueDate,
      value: expense.value,
      nature: expense.nature,
      costType: expense.costType,
      status: expense.status
    });
    setIsInstallment(false);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetFormState = () => {
    setEditingId(null);
    setIsInstallment(false);
    setInstallmentCount(2);
    setValueMode('total');
    setFormData({
      description: '', supplier: '', dueDate: new Date().toISOString().split('T')[0],
      value: 0, nature: 'Outros', costType: 'Variável', status: 'Pendente',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingId) {
      db.updateExpense(editingId, formData);
    } else if (isInstallment && installmentCount > 1) {
      const valuePerParcel = valueMode === 'total' ? (formData.value / installmentCount) : formData.value;
      const baseDescription = formData.description;
      
      for (let i = 0; i < installmentCount; i++) {
        const parcelDate = addDays(formData.dueDate, i * intervalDays);
        db.saveExpense({
          ...formData,
          description: `${baseDescription} (${i + 1}/${installmentCount})`,
          dueDate: parcelDate,
          value: valuePerParcel
        });
      }
    } else {
      db.saveExpense(formData);
    }

    onSuccess();
    resetFormState();
    setShowForm(false);
  };

  const totals = useMemo(() => {
    const pendente = processedExpenses.filter(e => e.status === 'Pendente').reduce((a,c) => a+c.value, 0);
    const pago = processedExpenses.filter(e => e.status === 'Pago').reduce((a,c) => a+c.value, 0);
    return { pendente, pago, total: pendente + pago };
  }, [processedExpenses]);

  return (
    <div className="flex-1 flex flex-col gap-2 h-full overflow-hidden">
      <ConfirmationModal 
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={() => { db.deleteExpense(deletingId!); onSuccess(); setDeletingId(null); }}
        title="Excluir Registro"
        message="Tem certeza que deseja remover esta conta permanentemente?"
      />

      {/* PAINEL DE TOTAIS CONSOLIDADOS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 shrink-0">
        <div className="bg-white border p-3 rounded-2xl shadow-sm flex items-center gap-3 border-l-4 border-l-orange-500">
           <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-orange-500 shrink-0">
             <AlertCircle size={18}/>
           </div>
           <div>
             <p className="text-[8px] font-black text-slate-400 uppercase leading-none mb-1">A Pagar (Pendentes)</p>
             <p className="text-sm font-mono font-black text-slate-800 leading-none">{formatMoney(totals.pendente)}</p>
           </div>
        </div>
        <div className="bg-white border p-3 rounded-2xl shadow-sm flex items-center gap-3 border-l-4 border-l-green-500">
           <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center text-green-500 shrink-0">
             <CheckCircle2 size={18}/>
           </div>
           <div>
             <p className="text-[8px] font-black text-slate-400 uppercase leading-none mb-1">Contas Pagas</p>
             <p className="text-sm font-mono font-black text-green-600 leading-none">{formatMoney(totals.pago)}</p>
           </div>
        </div>
        <div className="bg-white border p-3 rounded-2xl shadow-sm flex items-center gap-3 border-l-4 border-l-blue-600">
           <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
             <TrendingUp size={18}/>
           </div>
           <div>
             <p className="text-[8px] font-black text-slate-400 uppercase leading-none mb-1">Total Movimentado</p>
             <p className="text-sm font-mono font-black text-slate-900 leading-none">{formatMoney(totals.total)}</p>
           </div>
        </div>
        <button 
          onClick={() => { if(showForm) resetFormState(); setShowForm(!showForm); }} 
          className={`col-span-2 lg:col-span-1 text-white rounded-2xl text-[10px] font-black uppercase flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all ${showForm ? 'bg-slate-500' : 'bg-blue-600 hover:bg-blue-700'}`}
        >
          {showForm ? <X size={16}/> : <Plus size={16}/>} {showForm ? 'Cancelar' : 'Novo Título'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border p-4 rounded-3xl shadow-xl grid grid-cols-2 lg:grid-cols-4 gap-3 shrink-0 animate-in slide-in-from-top-2 overflow-visible relative">
          <div className="col-span-4 flex items-center gap-2 mb-1">
             <div className={`w-2 h-2 rounded-full ${editingId ? 'bg-orange-500' : 'bg-blue-500'}`}></div>
             <h4 className="text-[10px] font-black uppercase text-slate-600 tracking-widest">
               {editingId ? `Edição de Lançamento` : 'Cadastro de Novo Compromisso'}
             </h4>
          </div>

          <div className="col-span-2 relative">
            <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Fornecedor</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14}/>
              <input 
                placeholder="Busca automática..." 
                className="w-full h-10 pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-blue-400" 
                value={formData.supplier} 
                onChange={e => {
                  setFormData({...formData, supplier: e.target.value});
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                required 
              />
            </div>
            
            {showSuggestions && filteredSuppliers.length > 0 && (
              <div ref={suggestionRef} className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 shadow-2xl rounded-2xl z-[100] overflow-hidden">
                {filteredSuppliers.map(s => (
                  <button 
                    key={s.id} 
                    type="button"
                    onClick={() => handleSelectSupplier(s)}
                    className="w-full text-left px-4 py-3 hover:bg-blue-50 flex flex-col border-b border-slate-50 last:border-0"
                  >
                    <span className="text-[11px] font-black text-slate-800 uppercase leading-none">{s.name}</span>
                    <span className="text-[8px] font-bold text-slate-400 uppercase mt-1">{s.category}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="col-span-2">
            <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Natureza do Gasto</label>
            <select className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-black uppercase outline-none focus:border-blue-400" value={formData.nature} onChange={e => setFormData({...formData, nature: e.target.value as any})} required>
              {NATURES.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          <div className="col-span-2">
            <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Descrição</label>
            <input placeholder="Ex: NF 123 - Bebidas" className="w-full h-10 px-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-blue-400" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} required />
          </div>

          <div>
            <label className="text-[8px] font-black text-slate-400 uppercase ml-1">{editingId ? 'Vencimento' : 'Data de Início'}</label>
            <input type="date" className="w-full h-10 px-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-blue-400" value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} required />
          </div>

          <div>
            <label className="text-[8px] font-black text-slate-400 uppercase ml-1">
              {editingId ? 'Valor' : (valueMode === 'total' ? 'Valor Total da Nota' : 'Valor de Cada Parcela')}
            </label>
            <input placeholder="0,00" type="number" step="0.01" className="w-full h-10 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black font-mono outline-none focus:border-blue-400" value={formData.value || ''} onChange={e => setFormData({...formData, value: parseFloat(e.target.value) || 0})} required />
          </div>

          {/* Módulo de Parcelamento */}
          {!editingId && (
            <div className="col-span-4 bg-slate-50 p-4 rounded-2xl border border-slate-200 mt-1">
               <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
                  <button 
                    type="button"
                    onClick={() => setIsInstallment(!isInstallment)}
                    className={`flex items-center gap-2 text-[10px] font-black uppercase transition-all ${isInstallment ? 'text-blue-600' : 'text-slate-400'}`}
                  >
                    {isInstallment ? <CheckSquare size={18}/> : <Square size={18}/>}
                    Gerar Parcelas em Massa
                  </button>

                  {isInstallment && (
                    <div className="flex bg-white border border-slate-200 p-1 rounded-xl shadow-sm">
                      <button 
                        type="button"
                        onClick={() => setValueMode('total')}
                        className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase transition-all ${valueMode === 'total' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400'}`}
                      >
                        Valor Total
                      </button>
                      <button 
                        type="button"
                        onClick={() => setValueMode('parcel')}
                        className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase transition-all ${valueMode === 'parcel' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400'}`}
                      >
                        Valor Unitário
                      </button>
                    </div>
                  )}
               </div>
               
               {isInstallment && (
                 <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-in slide-in-from-left-2">
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Nº de Parcelas</label>
                      <input 
                        type="number" min="2" max="60" 
                        className="w-full h-9 px-3 bg-white border border-slate-200 rounded-xl text-xs font-black outline-none focus:border-blue-400"
                        value={installmentCount}
                        onChange={e => setInstallmentCount(parseInt(e.target.value) || 2)}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Prazo entre Parcelas</label>
                      <select 
                        className="w-full h-9 px-3 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase outline-none focus:border-blue-400"
                        value={intervalDays}
                        onChange={e => setIntervalDays(parseInt(e.target.value))}
                      >
                        <option value="7">7 Dias (Semanal)</option>
                        <option value="10">10 Dias (Dezena)</option>
                        <option value="15">15 Dias (Quinzenal)</option>
                        <option value="30">30 Dias (Mensal)</option>
                      </select>
                    </div>
                    <div className="col-span-2 flex items-center gap-3 bg-white p-3 border border-slate-200 rounded-xl shadow-inner">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
                        {valueMode === 'total' ? <Calculator size={18}/> : <Layers size={18}/>}
                      </div>
                      <p className="text-[9px] font-bold text-slate-500 uppercase leading-tight">
                        {valueMode === 'total' ? (
                          <>Serão {installmentCount} de <span className="text-blue-600 font-black">{formatMoney(formData.value / installmentCount)}</span></>
                        ) : (
                          <>Total Final: <span className="text-blue-600 font-black">{formatMoney(formData.value * installmentCount)}</span> em {installmentCount}x.</>
                        )}
                        <br/>
                        <span className="text-[7px] text-slate-400 italic">Projeção até {addDays(formData.dueDate, (installmentCount-1) * intervalDays).split('-').reverse().join('/')}</span>
                      </p>
                    </div>
                 </div>
               )}
            </div>
          )}

          <div className="col-span-4 flex justify-end gap-3 mt-2">
            <button 
              type="submit" 
              className={`w-full lg:w-auto px-12 h-11 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 ${editingId ? 'bg-orange-500' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
              {editingId ? <Edit2 size={16}/> : <Calendar size={16}/>} 
              {editingId ? 'Salvar Alterações' : 'Confirmar Lançamento'}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white border p-2 rounded-2xl flex flex-col gap-2 shrink-0 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex bg-slate-100 p-1 rounded-xl overflow-x-auto no-scrollbar shrink-0">
            {['Todos', 'Agendadas', 'Pagas'].map(s => (
              <button key={s} onClick={() => setFilterStatus(s)} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase whitespace-nowrap transition-all ${filterStatus === s ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>{s}</button>
            ))}
          </div>
          
          <button 
            onClick={() => setShowNatureFilter(!showNatureFilter)}
            className={`flex items-center justify-between px-4 h-9 rounded-xl text-[9px] font-black uppercase border transition-all ${showNatureFilter ? 'bg-slate-800 text-white border-slate-700' : 'bg-white text-slate-500 border-slate-200 hover:border-blue-300'}`}
          >
            <div className="flex items-center gap-2"><Filter size={14}/> Filtrar Natureza ({selectedNatures.length})</div>
            <ChevronDown size={14} className={`transition-transform ${showNatureFilter ? 'rotate-180' : ''}`}/>
          </button>

          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14}/>
            <input placeholder="Pesquisar..." className="w-full h-9 pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-bold outline-none focus:border-blue-400" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
        </div>

        {showNatureFilter && (
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 animate-in slide-in-from-top-2">
            <div className="flex justify-between items-center mb-3 px-1">
               <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Seletor de Natureza</span>
               <div className="flex gap-4">
                 <button onClick={() => setSelectedNatures(Array.from(NATURES))} className="text-[8px] font-black text-blue-600 uppercase hover:underline">Marcar Todos</button>
                 <button onClick={() => setSelectedNatures([])} className="text-[8px] font-black text-slate-400 uppercase hover:underline">Limpar</button>
               </div>
            </div>
            <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto custom-scrollbar p-1">
              {NATURES.map(nature => (
                <button
                  key={nature}
                  onClick={() => toggleNature(nature)}
                  className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all border ${
                    selectedNatures.includes(nature) 
                      ? 'bg-blue-600 text-white border-blue-500 shadow-md' 
                      : 'bg-white text-slate-400 border-slate-200'
                  }`}
                >
                  {nature}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 bg-white border shadow-sm rounded-3xl overflow-hidden flex flex-col">
        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full border-collapse min-w-[600px]">
            <thead className="sticky top-0 bg-slate-50 border-b text-[9px] font-black uppercase text-slate-400 z-10">
              <tr>
                <th className="px-6 py-4 text-left">Vencimento</th>
                <th className="px-6 py-4 text-left">Fornecedor / Detalhes</th>
                <th className="px-6 py-4 text-left">Natureza</th>
                <th className="px-6 py-4 text-right">Valor</th>
                <th className="px-6 py-4 text-center w-28">Status</th>
                <th className="px-6 py-4 text-center w-20">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {processedExpenses.map((exp) => (
                <tr key={exp.id} className={`hover:bg-slate-50/50 transition-colors ${editingId === exp.id ? 'bg-orange-50' : ''}`}>
                  <td className="px-6 py-4 text-xs font-mono font-black text-slate-700">
                    {exp.dueDate.split('-').reverse().slice(0,2).join('/')}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-[11px] font-black text-slate-900 uppercase truncate max-w-[180px] leading-tight">{exp.supplier}</div>
                    <div className="text-[9px] font-bold text-slate-400 truncate max-w-[180px] leading-tight mt-0.5">{exp.description}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[8px] font-black bg-slate-100 text-slate-500 px-2.5 py-1 rounded-lg border border-slate-200 uppercase whitespace-nowrap shadow-xs">
                      {exp.nature}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-mono font-black text-xs text-slate-900">{formatMoney(exp.value)}</td>
                  <td className="px-6 py-4 text-center">
                    <button 
                      onClick={() => { db.updateExpenseStatus(exp.id, exp.status === 'Pendente' ? 'Pago' : 'Pendente'); onSuccess(); }} 
                      className={`w-full py-2 rounded-xl text-[8px] font-black uppercase transition-all shadow-sm border ${exp.status === 'Pago' ? 'bg-green-500 border-green-400 text-white' : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'}`}
                    >
                      {exp.status}
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <button 
                        onClick={() => handleEdit(exp)} 
                        className={`p-2 transition-all rounded-lg ${editingId === exp.id ? 'bg-orange-500 text-white' : 'text-slate-300 hover:text-blue-500'}`}
                        title="Editar Conta"
                      >
                        <Edit2 size={16}/>
                      </button>
                      <button 
                        onClick={() => setDeletingId(exp.id)} 
                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        title="Remover Título"
                      >
                        <Trash2 size={16}/>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {processedExpenses.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-24 text-center opacity-20">
                    <Search size={48} className="mx-auto mb-2"/>
                    <p className="text-xs font-black uppercase">Nenhum título encontrado</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  function toggleNature(nature: string) {
    setSelectedNatures(prev => 
      prev.includes(nature) ? prev.filter(n => n !== nature) : [...prev, nature]
    );
  }
};

export default AccountsPayable;
