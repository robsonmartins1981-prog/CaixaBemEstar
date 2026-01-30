
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Expense, ExpenseNature, CostType, Supplier } from '../types.ts';
import { db } from '../services/db.ts';
import { NATURES, COST_TYPES } from '../constants.tsx';
import { 
  Plus, Trash2, Receipt, List, CheckCircle, Clock, 
  Calendar as CalendarIcon, DollarSign, User, Edit2, X, Layers, Timer, ChevronDown, Search, Filter, AlertTriangle, ArrowUpDown, ChevronUp, Repeat,
  CalendarDays
} from 'lucide-react';
import ConfirmationModal from './ConfirmationModal.tsx';

interface AccountsPayableProps {
  onSuccess: () => void;
  expenses: Expense[];
}

const formatMoney = (val: number) => 
  val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });

type FilterStatus = 'Todos' | 'Agendadas' | 'Pagas' | 'Vencidas' | 'Vencendo (7 dias)';
type SortConfig = { key: keyof Expense; direction: 'asc' | 'desc' } | null;

const AccountsPayable: React.FC<AccountsPayableProps> = ({ onSuccess, expenses }) => {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState<Supplier[]>([]);
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('Todos');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'dueDate', direction: 'asc' });
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isInstallment, setIsInstallment] = useState(false);
  const [installmentsCount, setInstallmentsCount] = useState(2);
  const [intervalDays, setIntervalDays] = useState(30);

  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const [formData, setFormData] = useState<Omit<Expense, 'id'>>({
    description: '',
    supplier: '',
    dueDate: new Date().toISOString().split('T')[0],
    value: 0,
    nature: 'Outros',
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

  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.supplier.trim().length > 0) {
        const query = formData.supplier.toLowerCase();
        const results = suppliers.filter(s => 
          s.name.toLowerCase().includes(query) || 
          s.category.toLowerCase().includes(query)
        );
        setFilteredSuppliers(results);
      } else {
        setFilteredSuppliers(suppliers.slice(0, 5));
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [formData.supplier, suppliers]);

  const resetForm = () => {
    setFormData({
      description: '',
      supplier: '',
      dueDate: new Date().toISOString().split('T')[0],
      value: 0,
      nature: 'Outros',
      costType: 'Variável',
      status: 'Pendente',
    });
    setEditingId(null);
    setShowForm(false);
    setIsInstallment(false);
    setInstallmentsCount(2);
    setIntervalDays(30);
  };

  const handleEdit = (expense: Expense) => {
    setFormData({ ...expense });
    setEditingId(expense.id);
    setShowForm(true);
    setIsInstallment(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      db.updateExpense(editingId, formData);
    } else {
      if (isInstallment && installmentsCount > 1) {
        const valuePerInstallment = formData.value / installmentsCount;
        const baseDate = new Date(formData.dueDate + 'T12:00:00');
        for (let i = 0; i < installmentsCount; i++) {
          const installmentDate = new Date(baseDate);
          installmentDate.setDate(baseDate.getDate() + (i * intervalDays));
          const installmentData = {
            ...formData,
            description: `${formData.description} [${String(i + 1).padStart(2, '0')}/${String(installmentsCount).padStart(2, '0')}]`,
            dueDate: installmentDate.toISOString().split('T')[0],
            value: valuePerInstallment
          };
          db.saveExpense(installmentData);
        }
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

  const getVencimentoStatus = (dueDate: string, status: string) => {
    if (status === 'Pago') return 'none';
    const today = new Date();
    today.setHours(0,0,0,0);
    const due = new Date(dueDate + 'T12:00:00');
    due.setHours(0,0,0,0);
    const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return 'late';
    if (diffDays <= 7) return 'warning';
    return 'none';
  };

  const handleSort = (key: keyof Expense) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const processedExpenses = useMemo(() => {
    let filtered = expenses.filter(exp => {
      const vStatus = getVencimentoStatus(exp.dueDate, exp.status);
      const searchMatch = 
        exp.supplier.toLowerCase().includes(searchTerm.toLowerCase()) || 
        exp.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exp.nature.toLowerCase().includes(searchTerm.toLowerCase());

      if (!searchMatch) return false;

      const today = new Date();
      today.setHours(0,0,0,0);
      const limit7Days = new Date(today);
      limit7Days.setDate(today.getDate() + 7);
      const due = new Date(exp.dueDate + 'T12:00:00');
      due.setHours(0,0,0,0);

      if (filterStatus === 'Agendadas') return exp.status === 'Pendente' && due >= today;
      if (filterStatus === 'Pagas') return exp.status === 'Pago';
      if (filterStatus === 'Vencidas') return exp.status === 'Pendente' && due < today;
      if (filterStatus === 'Vencendo (7 dias)') return exp.status === 'Pendente' && due >= today && due <= limit7Days;
      return true;
    });

    if (sortConfig) {
      filtered.sort((a, b) => {
        const valA = a[sortConfig.key];
        const valB = b[sortConfig.key];
        
        if (typeof valA === 'string' && typeof valB === 'string') {
          return sortConfig.direction === 'asc' 
            ? valA.localeCompare(valB) 
            : valB.localeCompare(valA);
        }
        
        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
        }
        
        return 0;
      });
    }

    return filtered;
  }, [expenses, filterStatus, sortConfig, searchTerm]);

  const pendingTotal = expenses.filter(e => e.status === 'Pendente').reduce((acc, curr) => acc + curr.value, 0);
  const paidTotal = expenses.filter(e => e.status === 'Pago').reduce((acc, curr) => acc + curr.value, 0);

  const SortIndicator = ({ column }: { column: keyof Expense }) => {
    if (sortConfig?.key !== column) return <ArrowUpDown size={12} className="ml-1 opacity-20" />;
    return sortConfig.direction === 'asc' 
      ? <ChevronUp size={12} className="ml-1 text-blue-600" /> 
      : <ChevronDown size={12} className="ml-1 text-blue-600" />;
  };

  return (
    <div className="flex-1 flex flex-col gap-4 h-full overflow-hidden">
      <ConfirmationModal 
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={() => { db.deleteExpense(deletingId!); onSuccess(); setDeletingId(null); }}
        title="Excluir Título"
        message="Deseja remover este compromisso financeiro permanentemente?"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
        <div className="bg-white border border-slate-200 p-4 rounded-xl flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><Clock size={18}/></div>
             <div>
               <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Previsão Pendente</p>
               <p className="text-lg font-mono font-black text-slate-800 tracking-tighter">{formatMoney(pendingTotal)}</p>
             </div>
          </div>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-xl flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-green-100 text-green-600 rounded-lg"><CheckCircle size={18}/></div>
             <div>
               <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Liquidado</p>
               <p className="text-lg font-mono font-black text-slate-800 tracking-tighter">{formatMoney(paidTotal)}</p>
             </div>
          </div>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)}
          className={`flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-black uppercase text-[11px] transition-all shadow-md ${showForm ? 'bg-slate-900 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
        >
          {showForm ? <X size={20}/> : <Plus size={20}/>}
          {showForm ? 'Fechar Formulário' : 'Novo Lançamento'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-slate-200 shadow-xl rounded-2xl overflow-visible animate-in slide-in-from-top-4 duration-300 shrink-0">
          <div className="p-4 bg-slate-50 border-b flex items-center justify-between">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-800">
              {editingId ? 'Editar Título' : 'Cadastro de Título'}
            </h3>
          </div>
          <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 md:grid-cols-4 gap-4 overflow-visible">
            <div className="md:col-span-2 space-y-1 relative" ref={dropdownRef}>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Fornecedor</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14}/>
                <input 
                  type="text" required 
                  autoComplete="off"
                  className="w-full h-10 pl-10 pr-4 bg-slate-50 border border-slate-200 text-sm font-bold rounded-lg focus:border-blue-500 outline-none" 
                  value={formData.supplier} 
                  onChange={e => { setFormData({ ...formData, supplier: e.target.value }); setShowSupplierDropdown(true); }}
                  onFocus={() => setShowSupplierDropdown(true)}
                  placeholder="Nome do fornecedor..."
                />
              </div>
              {showSupplierDropdown && filteredSuppliers.length > 0 && (
                <div className="absolute z-[110] left-0 right-0 top-full mt-1 bg-white border border-slate-200 shadow-2xl rounded-xl overflow-hidden max-h-60 overflow-y-auto custom-scrollbar">
                  {filteredSuppliers.map(s => (
                    <button 
                      key={s.id} type="button" 
                      onClick={() => { setFormData({ ...formData, supplier: s.name, nature: s.category as any }); setShowSupplierDropdown(false); }} 
                      className="w-full p-3 text-left hover:bg-blue-50 border-b border-slate-50 last:border-0 transition-colors"
                    >
                      <p className="text-[10px] font-black uppercase text-slate-800">{s.name}</p>
                      <p className="text-[8px] font-bold text-slate-400 uppercase">{s.category}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="md:col-span-2 space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Descrição / Observação</label>
              <input type="text" required className="w-full h-10 px-3 bg-slate-50 border border-slate-200 text-sm font-bold rounded-lg focus:border-blue-500 outline-none" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Vencimento</label>
              <input type="date" required className="w-full h-10 px-3 bg-slate-50 border border-slate-200 text-sm font-bold rounded-lg focus:border-blue-500 outline-none" value={formData.dueDate} onChange={e => setFormData({ ...formData, dueDate: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Valor</label>
              <input type="text" required className="w-full h-10 px-3 bg-slate-50 border border-slate-200 text-sm font-bold rounded-lg focus:border-blue-500 outline-none font-mono" value={formData.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} onChange={handleValueChange} />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Natureza</label>
              <select className="w-full h-10 px-3 bg-slate-50 border border-slate-200 text-[10px] font-black uppercase rounded-lg outline-none" value={formData.nature} onChange={e => setFormData({ ...formData, nature: e.target.value as any })}>
                {NATURES.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>

            <div className="flex items-end gap-3 md:col-span-1">
               <button 
                type="button"
                disabled={!!editingId}
                onClick={() => setIsInstallment(!isInstallment)}
                className={`h-10 px-4 rounded-lg flex items-center gap-2 text-[9px] font-black uppercase transition-all border ${
                  isInstallment 
                    ? 'bg-blue-600 text-white border-blue-500 shadow-md' 
                    : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100 disabled:opacity-30'
                }`}
               >
                 <Repeat size={14}/> {isInstallment ? 'Parcelado' : 'Parcelar?'}
               </button>
            </div>

            {isInstallment && !editingId && (
              <>
                <div className="space-y-1 animate-in zoom-in-95">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Qtd. Parcelas</label>
                  <input 
                    type="number" min="2" max="100"
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 text-sm font-bold rounded-lg focus:border-blue-500 outline-none" 
                    value={installmentsCount} 
                    onChange={e => setInstallmentsCount(parseInt(e.target.value) || 2)} 
                  />
                </div>
                <div className="space-y-1 animate-in zoom-in-95">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Intervalo (Dias)</label>
                  <input 
                    type="number" min="1" max="365"
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 text-sm font-bold rounded-lg focus:border-blue-500 outline-none" 
                    value={intervalDays} 
                    onChange={e => setIntervalDays(parseInt(e.target.value) || 30)} 
                  />
                </div>
              </>
            )}

            <div className={`flex items-end ${isInstallment ? 'md:col-span-4' : 'md:col-span-1'}`}>
              <button type="submit" className="w-full h-10 bg-blue-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-blue-700 active:scale-95 transition-all">
                {editingId ? 'Salvar Alterações' : isInstallment ? 'Confirmar Parcelamento' : 'Confirmar Título'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white border border-slate-200 p-3 rounded-xl flex flex-col xl:flex-row items-center justify-between gap-4 shadow-sm shrink-0">
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 w-full xl:w-auto overflow-x-auto no-scrollbar">
          {(['Todos', 'Agendadas', 'Pagas', 'Vencidas', 'Vencendo (7 dias)'] as FilterStatus[]).map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all whitespace-nowrap ${
                filterStatus === s ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="relative w-full xl:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14}/>
          <input 
            type="text"
            placeholder="Buscar por fornecedor ou descrição..."
            className="w-full h-10 pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-bold outline-none focus:border-blue-500"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 bg-white border border-slate-200 shadow-sm flex flex-col overflow-hidden rounded-2xl">
        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full border-collapse min-w-[800px]">
            <thead className="sticky top-0 bg-slate-100 z-10 border-b">
              <tr>
                <th 
                  onClick={() => handleSort('dueDate')}
                  className="px-6 py-4 text-left text-[9px] font-black text-slate-500 uppercase cursor-pointer hover:bg-slate-200 transition-colors group"
                >
                  <div className="flex items-center">Vencimento <SortIndicator column="dueDate"/></div>
                </th>
                <th 
                  onClick={() => handleSort('supplier')}
                  className="px-6 py-4 text-left text-[9px] font-black text-slate-500 uppercase cursor-pointer hover:bg-slate-200 transition-colors group"
                >
                  <div className="flex items-center">Fornecedor / Descrição <SortIndicator column="supplier"/></div>
                </th>
                <th 
                  onClick={() => handleSort('nature')}
                  className="px-6 py-4 text-left text-[9px] font-black text-slate-500 uppercase cursor-pointer hover:bg-slate-200 transition-colors group"
                >
                  <div className="flex items-center">Natureza <SortIndicator column="nature"/></div>
                </th>
                <th 
                  onClick={() => handleSort('value')}
                  className="px-6 py-4 text-right text-[9px] font-black text-slate-500 uppercase cursor-pointer hover:bg-slate-200 transition-colors group"
                >
                  <div className="flex items-center justify-end">Valor <SortIndicator column="value"/></div>
                </th>
                <th className="px-6 py-4 text-center text-[9px] font-black text-slate-500 uppercase">Status</th>
                <th className="px-6 py-4 text-center text-[9px] font-black text-slate-500 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {processedExpenses.map((exp) => {
                const alertStatus = getVencimentoStatus(exp.dueDate, exp.status);
                const bgClass = 
                  alertStatus === 'late' ? 'bg-red-50/70 hover:bg-red-100/80 transition-colors' : 
                  alertStatus === 'warning' ? 'bg-orange-50/50 hover:bg-orange-100/70 transition-colors' : 
                  'bg-white hover:bg-slate-50/50 transition-colors';

                return (
                  <tr key={exp.id} className={bgClass}>
                    <td className="px-6 py-4">
                       <div className="flex items-center gap-2">
                          {alertStatus !== 'none' && <AlertTriangle size={12} className={alertStatus === 'late' ? 'text-red-500' : 'text-orange-500'} />}
                          <span className={`text-[10px] font-mono font-bold ${alertStatus === 'late' ? 'text-red-600' : 'text-slate-600'}`}>
                            {exp.dueDate.split('-').reverse().join('/')}
                          </span>
                       </div>
                    </td>
                    <td className="px-6 py-4">
                       <div className="text-[10px] font-black text-slate-800 uppercase truncate max-w-[200px]">{exp.supplier}</div>
                       <div className="text-[8px] font-bold text-slate-400 uppercase truncate max-w-[200px]">{exp.description}</div>
                    </td>
                    <td className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase">{exp.nature}</td>
                    <td className={`px-6 py-4 text-right font-mono font-black text-[11px] ${alertStatus === 'late' ? 'text-red-600' : 'text-slate-900'}`}>
                      {formatMoney(exp.value)}
                    </td>
                    <td className="px-6 py-4 text-center">
                       <button 
                        onClick={() => { db.updateExpenseStatus(exp.id, exp.status === 'Pendente' ? 'Pago' : 'Pendente'); onSuccess(); }}
                        className={`px-3 py-1 rounded-full text-[8px] font-black uppercase transition-all shadow-sm ${exp.status === 'Pago' ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-500 hover:bg-slate-300'}`}
                       >
                         {exp.status}
                       </button>
                    </td>
                    <td className="px-6 py-4">
                       <div className="flex justify-center gap-1">
                          <button onClick={() => handleEdit(exp)} className="p-2 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg"><Edit2 size={14}/></button>
                          <button onClick={() => setDeletingId(exp.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={14}/></button>
                       </div>
                    </td>
                  </tr>
                );
              })}
              {processedExpenses.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-[10px] font-black uppercase text-slate-300 tracking-widest italic">
                    Nenhum título encontrado com os filtros atuais
                  </td>
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
