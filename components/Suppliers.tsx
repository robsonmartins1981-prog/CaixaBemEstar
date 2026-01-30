
import React, { useState, useMemo } from 'react';
import { Supplier, Expense } from '../types.ts';
import { db } from '../services/db.ts';
import { NATURES } from '../constants.tsx';
import { Plus, Trash2, UserPlus, List, Search, ArrowUpDown, ChevronUp, ChevronDown, Edit2, X, Phone, Mail, User } from 'lucide-react';
import ConfirmationModal from './ConfirmationModal.tsx';

interface SuppliersProps {
  onSuccess: () => void;
  suppliers: Supplier[];
}

const Suppliers: React.FC<SuppliersProps> = ({ onSuccess, suppliers }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingSupplier, setDeletingSupplier] = useState<Supplier | null>(null);
  const [errorModal, setErrorModal] = useState<{title: string, message: string} | null>(null);
  
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
    if (!formData.name.trim()) return;

    if (editingId) {
      db.updateSupplier(editingId, formData);
    } else {
      db.saveSupplier(formData);
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
    if (sortConfig?.key !== column) return <ArrowUpDown size={12} className="opacity-30 ml-2" />;
    return sortConfig.direction === 'asc' ? <ChevronUp size={12} className="ml-2 text-blue-600" /> : <ChevronDown size={12} className="ml-2 text-blue-600" />;
  };

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

      <div className="w-full lg:w-[380px] bg-white border border-slate-200 shadow-sm flex flex-col shrink-0 rounded-2xl overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserPlus size={18} className={editingId ? "text-orange-500" : "text-blue-600"}/>
            <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-700">
              {editingId ? "Editar Fornecedor" : "Novo Cadastro"}
            </h3>
          </div>
          {editingId && (
            <button onClick={resetForm} className="text-slate-400 hover:text-slate-600 transition-colors">
              <X size={16}/>
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome / Razão Social</label>
            <input 
              type="text" required
              className="w-full h-10 px-4 bg-slate-50 border border-slate-200 text-sm font-bold focus:border-blue-500 focus:bg-white outline-none rounded-xl transition-all"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Fornecedor Ltda"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Categoria Vinculada</label>
            <select 
              className="w-full h-10 px-3 bg-slate-50 border border-slate-200 text-[10px] font-black uppercase outline-none rounded-xl focus:border-blue-500 transition-all"
              value={formData.category}
              onChange={e => setFormData({ ...formData, category: e.target.value as any })}
            >
              {NATURES.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          <div className="pt-2 border-t border-slate-100 space-y-4">
             <div className="space-y-1">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome do Contato</label>
               <div className="relative">
                 <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14}/>
                 <input 
                   type="text"
                   className="w-full h-10 pl-10 pr-4 bg-slate-50 border border-slate-200 text-sm font-medium rounded-xl outline-none"
                   value={formData.contactName}
                   onChange={e => setFormData({ ...formData, contactName: e.target.value })}
                 />
               </div>
             </div>
             <div className="space-y-1">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Telefone / WhatsApp</label>
               <div className="relative">
                 <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14}/>
                 <input 
                   type="text"
                   className="w-full h-10 pl-10 pr-4 bg-slate-50 border border-slate-200 text-sm font-medium rounded-xl outline-none"
                   value={formData.contactPhone}
                   onChange={e => setFormData({ ...formData, contactPhone: e.target.value })}
                 />
               </div>
             </div>
             <div className="space-y-1">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">E-mail</label>
               <div className="relative">
                 <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14}/>
                 <input 
                   type="email"
                   className="w-full h-10 pl-10 pr-4 bg-slate-50 border border-slate-200 text-sm font-medium rounded-xl outline-none"
                   value={formData.contactEmail}
                   onChange={e => setFormData({ ...formData, contactEmail: e.target.value })}
                 />
               </div>
             </div>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <button 
              type="submit"
              className={`w-full h-12 text-white font-black uppercase tracking-widest text-[10px] shadow-lg transition-all flex items-center justify-center gap-2 rounded-xl active:scale-95 ${editingId ? 'bg-orange-500 hover:bg-orange-600' : 'bg-slate-900 hover:bg-slate-800'}`}
            >
              {editingId ? <Edit2 size={16}/> : <Plus size={16}/>} 
              {editingId ? 'Salvar Alterações' : 'Salvar Fornecedor'}
            </button>
          </div>
        </form>
      </div>

      <div className="flex-1 bg-white border border-slate-200 shadow-sm flex flex-col overflow-hidden rounded-2xl">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <List size={18} className="text-slate-400"/>
            <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-700">Homologação de Fornecedores</h3>
          </div>
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14}/>
            <input 
              type="text"
              placeholder="Buscar por nome ou categoria..."
              className="w-full h-10 pl-10 pr-4 bg-white border border-slate-200 rounded-xl text-[10px] font-bold outline-none focus:border-blue-500"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 z-10">
              <tr>
                <th 
                  onClick={() => handleSort('name')}
                  className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase border-r cursor-pointer hover:bg-slate-200 transition-colors"
                >
                  <div className="flex items-center">Nome do Fornecedor <SortIcon column="name" /></div>
                </th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase border-r">Contatos</th>
                <th 
                  onClick={() => handleSort('category')}
                  className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase border-r cursor-pointer hover:bg-slate-200 transition-colors"
                >
                  <div className="flex items-center">Categoria Padrão <SortIcon column="category" /></div>
                </th>
                <th className="px-6 py-4 text-center text-[10px] font-black text-slate-500 uppercase w-32">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAndSortedSuppliers.map((s, idx) => (
                <tr key={s.id} className={`hover:bg-blue-50/50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/20'} ${editingId === s.id ? 'bg-orange-50/50' : ''}`}>
                  <td className="px-6 py-4">
                    <div className="text-[11px] font-black text-slate-700 uppercase">{s.name}</div>
                  </td>
                  <td className="px-6 py-4 space-y-1">
                    {s.contactName && <div className="text-[10px] font-bold text-slate-600 flex items-center gap-1.5"><User size={10}/> {s.contactName}</div>}
                    {s.contactPhone && <div className="text-[9px] font-medium text-slate-400 flex items-center gap-1.5"><Phone size={10}/> {s.contactPhone}</div>}
                    {s.contactEmail && <div className="text-[9px] font-medium text-slate-400 flex items-center gap-1.5"><Mail size={10}/> {s.contactEmail}</div>}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[9px] font-black px-3 py-1 bg-white border border-slate-100 text-slate-500 rounded-full uppercase shadow-sm">
                      {s.category}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center gap-1">
                      <button 
                        onClick={() => handleEdit(s)}
                        className="p-2 text-slate-300 hover:text-orange-500 hover:bg-orange-50 rounded-xl transition-all"
                      >
                        <Edit2 size={16}/>
                      </button>
                      <button 
                        onClick={() => setDeletingSupplier(s)}
                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                      >
                        <Trash2 size={16}/>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Suppliers;
