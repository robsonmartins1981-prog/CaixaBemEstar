
import React, { useState, useMemo } from 'react';
import { Supplier, Expense } from '../types';
import { db } from '../services/db';
import { NATURES } from '../constants';
import { 
  Plus, Trash2, UserPlus, List, Search, ArrowUpDown, ChevronUp, ChevronDown, 
  Edit2, X, Phone, Mail, User, Users, ArrowLeft, Receipt, CheckCircle2, AlertCircle, Save
} from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';

interface SuppliersProps {
  onSuccess: () => void;
  suppliers: Supplier[];
}

const formatMoney = (val: number) => 
  val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });

const Suppliers: React.FC<SuppliersProps> = ({ onSuccess, suppliers }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingSupplier, setDeletingSupplier] = useState<Supplier | null>(null);
  const [errorModal, setErrorModal] = useState<{title: string, message: string} | null>(null);
  const [selectedSupplierForDetails, setSelectedSupplierForDetails] = useState<Supplier | null>(null);
  
  const [formData, setFormData] = useState<Omit<Supplier, 'id'>>({
    name: '',
    category: 'Outros',
    contactName: '',
    contactPhone: '',
    contactEmail: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof Supplier, direction: 'asc' | 'desc' } | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nameTrimmed = formData.name.trim();
    if (!nameTrimmed) return;

    if (editingId) {
      const exists = suppliers.some(s => s.id !== editingId && s.name.toLowerCase() === nameTrimmed.toLowerCase());
      if (exists) {
        setErrorModal({
          title: "Fornecedor Duplicado",
          message: `Já existe outro fornecedor cadastrado com o nome "${nameTrimmed}".`
        });
        return;
      }
      db.updateSupplier(editingId, { ...formData, name: nameTrimmed });
    } else {
      const exists = suppliers.some(s => s.name.toLowerCase() === nameTrimmed.toLowerCase());
      if (exists) {
        setErrorModal({
          title: "Fornecedor Duplicado",
          message: `Já existe um fornecedor cadastrado com o nome "${nameTrimmed}".`
        });
        return;
      }
      db.saveSupplier({ ...formData, name: nameTrimmed });
    }
    
    resetForm();
    onSuccess();
  };

  const handleEdit = (supplier: Supplier) => {
    setEditingId(supplier.id);
    setFormData({
      name: supplier.name,
      category: supplier.category,
      contactName: supplier.contactName || '',
      contactPhone: supplier.contactPhone || '',
      contactEmail: supplier.contactEmail || ''
    });
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({ name: '', category: 'Outros', contactName: '', contactPhone: '', contactEmail: '' });
  };

  const confirmDelete = () => {
    if (!deletingSupplier) return;
    
    const expenses = db.getExpenses();
    const hasExpenses = expenses.some(exp => exp.supplier.toLowerCase() === deletingSupplier.name.toLowerCase());
    
    if (hasExpenses) {
      setErrorModal({
        title: "Bloqueio de Segurança",
        message: `Não é possível excluir o fornecedor "${deletingSupplier.name}" pois existem títulos vinculados a ele.`
      });
      setDeletingSupplier(null);
      return;
    }

    db.deleteSupplier(deletingSupplier.id);
    onSuccess();
    setDeletingSupplier(null);
  };

  const handleSort = (key: keyof Supplier) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const filteredAndSortedSuppliers = useMemo(() => {
    let result = suppliers.filter(s => 
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (sortConfig) {
      result.sort((a, b) => {
        const valA = (a[sortConfig.key] || '').toString().toLowerCase();
        const valB = (b[sortConfig.key] || '').toString().toLowerCase();
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [suppliers, searchTerm, sortConfig]);

  const SortIcon = ({ column }: { column: keyof Supplier }) => {
    if (sortConfig?.key !== column) return <ArrowUpDown size={14} className="opacity-30 ml-2" />;
    return sortConfig.direction === 'asc' ? <ChevronUp size={14} className="ml-2 text-blue-600" /> : <ChevronDown size={14} className="ml-2 text-blue-600" />;
  };

  if (selectedSupplierForDetails) {
    return (
      <SupplierDetailView 
        supplier={selectedSupplierForDetails} 
        onBack={() => {
          setSelectedSupplierForDetails(null);
          onSuccess();
        }} 
      />
    );
  }

  return (
    <div className="flex-1 flex flex-col lg:flex-row gap-6 h-full overflow-hidden">
      <ConfirmationModal 
        isOpen={!!deletingSupplier}
        onClose={() => setDeletingSupplier(null)}
        onConfirm={confirmDelete}
        title="Excluir Fornecedor"
        message={`Confirma a exclusão de "${deletingSupplier?.name}"?`}
      />

      <ConfirmationModal 
        isOpen={!!errorModal}
        onClose={() => setErrorModal(null)}
        onConfirm={() => setErrorModal(null)}
        title={errorModal?.title || ""}
        message={errorModal?.message || ""}
      />

      <div className="w-full lg:w-[420px] bg-white border border-slate-200 shadow-sm flex flex-col shrink-0 rounded-2xl overflow-hidden">
        <div className="p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <UserPlus size={22} className={editingId ? "text-orange-500" : "text-blue-600"}/>
            <h3 className="text-[12px] font-black uppercase tracking-widest text-slate-700">
              {editingId ? "Editar Cadastro" : "Novo Fornecedor"}
            </h3>
          </div>
          {editingId && (
            <button onClick={resetForm} className="text-slate-400 hover:text-slate-600 transition-colors">
              <X size={20}/>
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-5 overflow-y-auto custom-scrollbar">
          <div className="space-y-2">
            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Nome ou Razão Social</label>
            <input 
              type="text" required
              className="w-full h-12 px-5 bg-slate-50 border border-slate-200 text-sm font-bold focus:border-blue-500 focus:bg-white outline-none rounded-2xl transition-all shadow-sm"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Fruteira da Esquina"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Categoria Padrão</label>
            <select 
              className="w-full h-12 px-4 bg-slate-50 border border-slate-200 text-[11px] font-black uppercase outline-none rounded-2xl focus:border-blue-500 focus:bg-white transition-all shadow-sm"
              value={formData.category}
              onChange={e => setFormData({ ...formData, category: e.target.value as any })}
            >
              {NATURES.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          <div className="pt-4 border-t border-slate-100 space-y-5">
             <div className="space-y-2">
               <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Pessoa de Contato</label>
               <div className="relative">
                 <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18}/>
                 <input 
                   type="text"
                   className="w-full h-12 pl-12 pr-5 bg-slate-50 border border-slate-200 text-sm font-medium rounded-2xl outline-none focus:bg-white transition-all shadow-sm"
                   value={formData.contactName}
                   onChange={e => setFormData({ ...formData, contactName: e.target.value })}
                 />
               </div>
             </div>
             <div className="space-y-2">
               <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">WhatsApp / Fone</label>
               <div className="relative">
                 <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18}/>
                 <input 
                   type="text"
                   className="w-full h-12 pl-12 pr-5 bg-slate-50 border border-slate-200 text-sm font-medium rounded-2xl outline-none focus:bg-white transition-all shadow-sm"
                   value={formData.contactPhone}
                   onChange={e => setFormData({ ...formData, contactPhone: e.target.value })}
                 />
               </div>
             </div>
             <div className="space-y-2">
               <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Endereço de E-mail</label>
               <div className="relative">
                 <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18}/>
                 <input 
                   type="email"
                   className="w-full h-12 pl-12 pr-5 bg-slate-50 border border-slate-200 text-sm font-medium rounded-2xl outline-none focus:bg-white transition-all shadow-sm"
                   value={formData.contactEmail}
                   onChange={e => setFormData({ ...formData, contactEmail: e.target.value })}
                 />
               </div>
             </div>
          </div>

          <div className="flex flex-col gap-3 pt-4">
            <button 
              type="submit"
              className={`w-full h-14 text-white font-black uppercase tracking-widest text-[11px] shadow-xl transition-all flex items-center justify-center gap-3 rounded-2xl active:scale-95 ${editingId ? 'bg-orange-500 hover:bg-orange-600 shadow-orange-200' : 'bg-slate-900 hover:bg-slate-800 shadow-slate-200'}`}
            >
              {editingId ? <Edit2 size={20}/> : <Plus size={20}/>} 
              {editingId ? 'Salvar Alterações' : 'Cadastrar Agora'}
            </button>
          </div>
        </form>
      </div>

      <div className="flex-1 bg-white border border-slate-200 shadow-sm flex flex-col overflow-hidden rounded-2xl">
        <div className="p-5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-3">
            <List size={22} className="text-slate-400"/>
            <h3 className="text-[12px] font-black uppercase tracking-widest text-slate-700">Homologação de Parceiros</h3>
          </div>
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
            <input 
              type="text"
              placeholder="Pesquisar fornecedor ou categoria..."
              className="w-full h-12 pl-12 pr-6 bg-white border border-slate-200 rounded-[1.2rem] text-xs font-bold outline-none focus:border-blue-500 shadow-sm transition-all"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full border-collapse min-w-[700px]">
            <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 z-10">
              <tr>
                <th 
                  onClick={() => handleSort('name')}
                  className="px-8 py-5 text-left text-[11px] font-black text-slate-500 uppercase border-r border-slate-200 cursor-pointer hover:bg-slate-200 transition-colors"
                >
                  <div className="flex items-center">Razão Social <SortIcon column="name" /></div>
                </th>
                <th className="px-8 py-5 text-left text-[11px] font-black text-slate-500 uppercase border-r border-slate-200">Dados de Contato</th>
                <th 
                  onClick={() => handleSort('category')}
                  className="px-8 py-5 text-left text-[11px] font-black text-slate-500 uppercase border-r border-slate-200 cursor-pointer hover:bg-slate-200 transition-colors"
                >
                  <div className="flex items-center">Categoria Contábil <SortIcon column="category" /></div>
                </th>
                <th className="px-8 py-5 text-center text-[11px] font-black text-slate-500 uppercase w-48">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAndSortedSuppliers.map((s, idx) => (
                <tr key={s.id} className={`hover:bg-blue-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'} ${editingId === s.id ? 'bg-orange-50' : ''}`}>
                  <td className="px-8 py-5">
                    <div className="text-[13px] font-black text-slate-800 uppercase tracking-tight">{s.name}</div>
                  </td>
                  <td className="px-8 py-5 space-y-2">
                    {s.contactName && <div className="text-[12px] font-bold text-slate-700 flex items-center gap-2"><User size={14} className="text-slate-400"/> {s.contactName}</div>}
                    <div className="flex flex-col gap-1">
                      {s.contactPhone && <div className="text-[11px] font-medium text-slate-400 flex items-center gap-2"><Phone size={12}/> {s.contactPhone}</div>}
                      {s.contactEmail && <div className="text-[11px] font-medium text-slate-400 flex items-center gap-2"><Mail size={12}/> {s.contactEmail}</div>}
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className="text-[10px] font-black px-4 py-2 bg-white border border-slate-200 text-slate-500 rounded-full uppercase shadow-xs tracking-tight">
                      {s.category}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex justify-center gap-2">
                      <button 
                        onClick={() => setSelectedSupplierForDetails(s)}
                        className="p-2.5 text-blue-500 hover:bg-blue-50 rounded-xl transition-all"
                        title="Ver Histórico de Contas"
                      >
                        <Receipt size={20}/>
                      </button>
                      <button 
                        onClick={() => handleEdit(s)}
                        className="p-2.5 text-slate-300 hover:text-orange-500 hover:bg-orange-50 rounded-xl transition-all"
                        title="Editar Fornecedor"
                      >
                        <Edit2 size={20}/>
                      </button>
                      <button 
                        onClick={() => setDeletingSupplier(s)}
                        className="p-2.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                        title="Excluir"
                      >
                        <Trash2 size={20}/>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredAndSortedSuppliers.length === 0 && (
                <tr>
                   <td colSpan={4} className="py-32 text-center grayscale opacity-30">
                     <Users size={64} className="mx-auto mb-4"/>
                     <p className="text-sm font-black uppercase tracking-[0.2em]">Nenhum fornecedor cadastrado</p>
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

/**
 * COMPONENTE DE DETALHE E CRUD DE CONTAS DO FORNECEDOR
 */
const SupplierDetailView = ({ supplier, onBack }: { supplier: Supplier, onBack: () => void }) => {
  const [expenses, setExpenses] = useState<Expense[]>(() => db.getExpenses().filter(e => e.supplier.toLowerCase() === supplier.name.toLowerCase()));
  const [showQuickForm, setShowQuickForm] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [deletingExpId, setDeletingExpId] = useState<string | null>(null);

  const [formData, setFormData] = useState<Omit<Expense, 'id'>>({
    description: '',
    supplier: supplier.name,
    dueDate: new Date().toISOString().split('T')[0],
    value: 0,
    nature: (supplier.category as any) || 'Outros',
    costType: 'Variável',
    status: 'Pendente'
  });

  const stats = useMemo(() => {
    const pago = expenses.filter(e => e.status === 'Pago').reduce((a,c) => a + c.value, 0);
    const pendente = expenses.filter(e => e.status === 'Pendente').reduce((a,c) => a + c.value, 0);
    return { pago, pendente, total: pago + pendente };
  }, [expenses]);

  const refreshExpenses = () => {
    setExpenses(db.getExpenses().filter(e => e.supplier.toLowerCase() === supplier.name.toLowerCase()));
  };

  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const expenseToSave = { ...formData, supplier: supplier.name.trim() };
    if (editingExpenseId) {
      db.updateExpense(editingExpenseId, expenseToSave);
    } else {
      db.saveExpense(expenseToSave);
    }
    setEditingExpenseId(null);
    setShowQuickForm(false);
    setFormData({ ...formData, description: '', value: 0 });
    refreshExpenses();
  };

  const toggleStatus = (id: string, current: string) => {
    db.updateExpenseStatus(id, current === 'Pago' ? 'Pendente' : 'Pago');
    refreshExpenses();
  };

  const startEdit = (exp: Expense) => {
    setEditingExpenseId(exp.id);
    setFormData({
      description: exp.description,
      supplier: exp.supplier,
      dueDate: exp.dueDate,
      value: exp.value,
      nature: exp.nature,
      costType: exp.costType,
      status: exp.status
    });
    setShowQuickForm(true);
  };

  return (
    <div className="flex-1 flex flex-col gap-5 h-full overflow-hidden animate-in fade-in slide-in-from-right-10 duration-500">
      <ConfirmationModal 
        isOpen={!!deletingExpId}
        onClose={() => setDeletingExpId(null)}
        onConfirm={() => {
          db.deleteExpense(deletingExpId!);
          setDeletingExpId(null);
          refreshExpenses();
        }}
        title="Remover Título"
        message="Deseja excluir permanentemente este registro financeiro?"
      />

      {/* HEADER DETALHE */}
      <div className="bg-white border border-slate-200 p-6 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm shrink-0">
        <div className="flex items-center gap-5">
           <button onClick={onBack} className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all active:scale-90">
             <ArrowLeft size={24}/>
           </button>
           <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Central do Fornecedor</p>
              <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter leading-none">{supplier.name}</h2>
              <p className="text-[11px] font-bold text-blue-600 uppercase mt-1 tracking-widest">{supplier.category}</p>
           </div>
        </div>

        <div className="flex gap-4">
           <div className="px-5 py-3 bg-emerald-50 border border-emerald-100 rounded-2xl text-center min-w-[140px]">
              <p className="text-[9px] font-black text-emerald-600 uppercase mb-1">Total Liquidado</p>
              <p className="text-lg font-mono font-black text-emerald-700">{formatMoney(stats.pago)}</p>
           </div>
           <div className="px-5 py-3 bg-orange-50 border border-orange-100 rounded-2xl text-center min-w-[140px]">
              <p className="text-[9px] font-black text-orange-600 uppercase mb-1">A Pagar</p>
              <p className="text-lg font-mono font-black text-orange-700">{formatMoney(stats.pendente)}</p>
           </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-5 overflow-hidden">
        
        {/* FORMULÁRIO RÁPIDO DE CRUD */}
        <div className={`w-full lg:w-[380px] bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col shrink-0 overflow-hidden transition-all ${showQuickForm ? 'h-auto opacity-100' : 'h-[64px] opacity-100'}`}>
          <button 
            onClick={() => {
              if (showQuickForm) setEditingExpenseId(null);
              setShowQuickForm(!showQuickForm);
            }} 
            className="w-full h-16 px-6 bg-slate-900 text-white flex items-center justify-between font-black uppercase tracking-widest text-[11px]"
          >
            <div className="flex items-center gap-3">
              {editingExpenseId ? <Edit2 size={18}/> : <Plus size={18}/>}
              {editingExpenseId ? 'Editando Título' : 'Lançar Nova Conta'}
            </div>
            {showQuickForm ? <X size={20}/> : <ChevronDown size={20}/>}
          </button>
          
          <div className={`p-6 space-y-4 overflow-y-auto custom-scrollbar ${showQuickForm ? 'block' : 'hidden'}`}>
             <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Descrição</label>
                <input 
                  type="text" required
                  className="w-full h-11 px-4 bg-slate-50 border border-slate-200 text-sm font-bold rounded-xl outline-none focus:bg-white focus:border-blue-500"
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  placeholder="NF-e, Serviço, etc..."
                />
             </div>
             <div className="grid grid-cols-2 gap-4">
               <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vencimento</label>
                  <input 
                    type="date" required
                    className="w-full h-11 px-3 bg-slate-50 border border-slate-200 text-sm font-bold rounded-xl outline-none focus:border-blue-500"
                    value={formData.dueDate}
                    onChange={e => setFormData({...formData, dueDate: e.target.value})}
                  />
               </div>
               <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor (R$)</label>
                  <input 
                    type="number" step="0.01" required
                    className="w-full h-11 px-4 bg-slate-50 border border-slate-200 text-sm font-black font-mono rounded-xl outline-none focus:border-blue-500"
                    value={formData.value || ''}
                    onChange={e => setFormData({...formData, value: parseFloat(e.target.value) || 0})}
                  />
               </div>
             </div>
             <div className="grid grid-cols-2 gap-4">
               <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</label>
                  <select 
                    className="w-full h-11 px-3 bg-slate-50 border border-slate-200 text-[10px] font-black uppercase rounded-xl outline-none focus:border-blue-500"
                    value={formData.status}
                    onChange={e => setFormData({...formData, status: e.target.value as any})}
                  >
                    <option value="Pendente">Pendente</option>
                    <option value="Pago">Pago</option>
                  </select>
               </div>
               <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Natureza</label>
                  <select 
                    className="w-full h-11 px-3 bg-slate-50 border border-slate-200 text-[10px] font-black uppercase rounded-xl outline-none focus:border-blue-500"
                    value={formData.nature}
                    onChange={e => setFormData({...formData, nature: e.target.value as any})}
                  >
                    {NATURES.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
               </div>
             </div>
             <button 
               onClick={handleSaveExpense}
               className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest text-[10px] rounded-xl shadow-lg shadow-blue-200 transition-all active:scale-95 flex items-center justify-center gap-2"
             >
               <Save size={18}/> {editingExpenseId ? 'Salvar Alteração' : 'Registrar Título'}
             </button>
          </div>
        </div>

        {/* LISTAGEM DE CONTAS */}
        <div className="flex-1 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-[12px] font-black uppercase tracking-widest text-slate-500">Histórico Financeiro Dedicado</h3>
          </div>
          <div className="flex-1 overflow-auto custom-scrollbar">
            <table className="w-full border-collapse">
               <thead className="sticky top-0 bg-slate-50 border-b text-[10px] font-black uppercase text-slate-400 z-10">
                 <tr>
                    <th className="px-6 py-4 text-left">Vencimento</th>
                    <th className="px-6 py-4 text-left">Descrição</th>
                    <th className="px-6 py-4 text-right">Valor</th>
                    <th className="px-6 py-4 text-center w-32">Status</th>
                    <th className="px-6 py-4 text-center w-24">Ações</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                 {expenses.length > 0 ? expenses.map(exp => (
                   <tr key={exp.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-6 py-4 text-[13px] font-mono font-black text-slate-700">{exp.dueDate.split('-').reverse().join('/')}</td>
                      <td className="px-6 py-4">
                        <p className="text-[13px] font-black text-slate-800 uppercase leading-none mb-1">{exp.description}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{exp.nature}</p>
                      </td>
                      <td className="px-6 py-4 text-right text-[14px] font-mono font-black text-slate-900">{formatMoney(exp.value)}</td>
                      <td className="px-6 py-4 text-center">
                        <button 
                          onClick={() => toggleStatus(exp.id, exp.status)}
                          className={`w-full py-2 rounded-lg text-[9px] font-black uppercase transition-all border ${exp.status === 'Pago' ? 'bg-emerald-500 border-emerald-400 text-white' : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'}`}
                        >
                          {exp.status}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center gap-2">
                          <button onClick={() => startEdit(exp)} className="p-2 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"><Edit2 size={16}/></button>
                          <button onClick={() => setDeletingExpId(exp.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={16}/></button>
                        </div>
                      </td>
                   </tr>
                 )) : (
                   <tr>
                      <td colSpan={5} className="py-24 text-center grayscale opacity-30">
                        <AlertCircle size={48} className="mx-auto mb-4 text-slate-400"/>
                        <p className="text-[11px] font-black uppercase tracking-widest">Nenhuma conta vinculada encontrada</p>
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

export default Suppliers;
