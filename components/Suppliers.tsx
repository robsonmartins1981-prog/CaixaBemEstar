
import React, { useState, useEffect } from 'react';
import { Supplier } from '../types';
import { db } from '../services/db';
import { NATURES } from '../constants';
import { Plus, Trash2, UserPlus, List, Search, X } from 'lucide-react';

interface SuppliersProps {
  onSuccess: () => void;
  suppliers: Supplier[];
}

const Suppliers: React.FC<SuppliersProps> = ({ onSuccess, suppliers }) => {
  const [formData, setFormData] = useState<Omit<Supplier, 'id'>>({
    name: '',
    category: 'Custo da Mercadoria Vendida (CMV)'
  });
  const [searchTerm, setSearchTerm] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    
    db.saveSupplier(formData);
    setFormData({ name: '', category: 'Custo da Mercadoria Vendida (CMV)' });
    onSuccess();
  };

  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col lg:flex-row gap-6 h-full overflow-hidden">
      {/* FORMULÁRIO */}
      <div className="w-full lg:w-[400px] bg-white border border-slate-200 shadow-sm flex flex-col shrink-0 rounded-2xl overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
          <UserPlus size={18} className="text-blue-600"/>
          <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-700">Novo Fornecedor</h3>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome da Empresa / Fornecedor</label>
            <input 
              type="text" required
              className="w-full h-11 px-4 bg-slate-50 border border-slate-200 text-sm font-bold focus:border-blue-500 focus:bg-white outline-none rounded-xl transition-all"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Distribuidora Bem Estar"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Categoria Principal</label>
            <select 
              className="w-full h-11 px-3 bg-slate-50 border border-slate-200 text-[10px] font-black uppercase outline-none rounded-xl focus:border-blue-500 transition-all"
              value={formData.category}
              onChange={e => setFormData({ ...formData, category: e.target.value })}
            >
              {NATURES.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          <button 
            type="submit"
            className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest text-[10px] shadow-lg shadow-blue-100 transition-all flex items-center justify-center gap-2 rounded-xl active:scale-95"
          >
            <Plus size={16}/> Cadastrar Fornecedor
          </button>
        </form>
      </div>

      {/* LISTAGEM */}
      <div className="flex-1 bg-white border border-slate-200 shadow-sm flex flex-col overflow-hidden rounded-2xl">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <List size={18} className="text-slate-400"/>
            <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-700">Fornecedores Homologados</h3>
          </div>
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14}/>
            <input 
              type="text"
              placeholder="Pesquisar..."
              className="w-full h-9 pl-9 pr-4 bg-white border border-slate-200 rounded-lg text-[10px] font-bold outline-none focus:border-blue-500"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 z-10">
              <tr>
                <th className="px-6 py-3 text-left text-[9px] font-black text-slate-500 uppercase">Nome / Razão Social</th>
                <th className="px-6 py-3 text-left text-[9px] font-black text-slate-500 uppercase">Categoria</th>
                <th className="px-6 py-3 text-center text-[9px] font-black text-slate-500 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSuppliers.map(s => (
                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="text-[11px] font-black text-slate-700 uppercase">{s.name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[9px] font-black px-2 py-0.5 bg-slate-100 text-slate-500 rounded uppercase">{s.category}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button 
                      onClick={() => { db.deleteSupplier(s.id); onSuccess(); }}
                      className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={14}/>
                    </button>
                  </td>
                </tr>
              ))}
              {filteredSuppliers.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-slate-400 text-[10px] font-black uppercase italic">Nenhum fornecedor encontrado</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Suppliers;
