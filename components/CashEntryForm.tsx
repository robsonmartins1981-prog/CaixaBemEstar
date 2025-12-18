
import React, { useState, useRef } from 'react';
import { CashEntry, ShiftType } from '../types';
import { db } from '../services/db';
import { COLORS, SHIFTS } from '../constants';
import { Plus, Trash2, Edit2, X, Save, Calendar, Clock, ChevronLeft, ChevronRight, LayoutGrid, Hash } from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';

interface CashEntryFormProps {
  onSuccess: () => void;
  entries: CashEntry[];
}

const CashEntryForm: React.FC<CashEntryFormProps> = ({ onSuccess, entries }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<Omit<CashEntry, 'id' | 'code'>>({
    date: new Date().toISOString().split('T')[0],
    shift: 'CAIXA 01 (MANHÃ)',
    cash: 0,
    credit: 0,
    debit: 0,
    pix: 0,
    sangria: 0,
  });

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      date: new Date().toISOString().split('T')[0],
      shift: 'CAIXA 01 (MANHÃ)',
      cash: 0,
      credit: 0,
      debit: 0,
      pix: 0,
      sangria: 0,
    });
  };

  const adjustDate = (days: number) => {
    const current = new Date(formData.date + 'T12:00:00');
    current.setDate(current.getDate() + days);
    setFormData({ ...formData, date: current.toISOString().split('T')[0] });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      db.updateEntry(editingId, formData);
    } else {
      db.saveEntry({ ...formData, id: crypto.randomUUID() });
    }
    onSuccess();
    resetForm();
  };

  const handleEdit = (entry: CashEntry) => {
    setEditingId(entry.id);
    setFormData({
      date: entry.date,
      shift: entry.shift,
      cash: entry.cash,
      credit: entry.credit,
      debit: entry.debit,
      pix: entry.pix,
      sangria: entry.sangria,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const totalCalculated = (formData.cash + formData.credit + formData.debit + formData.pix - formData.sangria);
  const selectedDateObj = new Date(formData.date + 'T12:00:00');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start animate-in fade-in duration-500">
      <ConfirmationModal 
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={() => { db.deleteEntry(deletingId!); onSuccess(); setDeletingId(null); }}
        title="Confirmar Exclusão"
        message="Deseja remover este registro de caixa?"
      />

      {/* Sidebar Form - Suave e Alinhada */}
      <div className={`lg:col-span-4 bg-white p-8 rounded-[32px] border border-gray-100 shadow-subtle transition-all duration-300 ${editingId ? 'ring-2 ring-green-100' : ''}`}>
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white shadow-subtle shrink-0" style={{ backgroundColor: COLORS.green }}>
              {editingId ? <Edit2 size={20} /> : <Plus size={20} />}
            </div>
            <div>
              <h3 className="text-lg font-black text-gray-900 tracking-tight">{editingId ? 'Editar Lançamento' : 'Novo Lançamento'}</h3>
              <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mt-1">
                {editingId ? 'Alterando registro existente' : `Próximo código: ${db.getNextCode()}`}
              </p>
            </div>
          </div>
          {editingId && (
            <button onClick={resetForm} className="w-10 h-10 flex items-center justify-center text-red-400 hover:bg-red-50 rounded-xl transition-colors">
              <X size={20} />
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Enhanced Date Picker - Clique abre o calendário */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
              <Calendar size={12} className="text-green-600" /> Data do Movimento
            </label>
            <div className="bg-gray-50 p-2 rounded-2xl border border-gray-100 flex items-center gap-2">
              <button 
                type="button" 
                onClick={() => adjustDate(-1)} 
                className="w-12 h-12 flex items-center justify-center bg-white border border-gray-200 rounded-xl hover:bg-green-50 transition-colors shadow-subtle active:scale-95"
              >
                <ChevronLeft size={18} />
              </button>
              
              <div 
                className="flex-1 relative flex items-center justify-center h-12 bg-white border border-gray-100 rounded-xl px-4 cursor-pointer hover:border-green-300 transition-colors shadow-subtle"
                onClick={() => dateInputRef.current?.showPicker()}
              >
                <input 
                  ref={dateInputRef}
                  type="date" 
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10" 
                  value={formData.date} 
                  onChange={e => setFormData({ ...formData, date: e.target.value })} 
                />
                <span className="text-xs font-black text-gray-700 uppercase tracking-wider">
                  {selectedDateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </span>
              </div>

              <button 
                type="button" 
                onClick={() => adjustDate(1)} 
                className="w-12 h-12 flex items-center justify-center bg-white border border-gray-200 rounded-xl hover:bg-green-50 transition-colors shadow-subtle active:scale-95"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
              <Clock size={12} className="text-green-600" /> Turno Operacional
            </label>
            <select 
              className="w-full h-14 px-5 rounded-2xl bg-gray-50 border border-gray-100 font-black text-xs uppercase focus:bg-white outline-none cursor-pointer transition-all" 
              value={formData.shift} 
              onChange={e => setFormData({ ...formData, shift: e.target.value as ShiftType })}
            >
              {SHIFTS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <ValueField label="Espécie" value={formData.cash} onChange={v => setFormData({...formData, cash: v})} color={COLORS.green} />
            <ValueField label="Pix" value={formData.pix} onChange={v => setFormData({...formData, pix: v})} color={COLORS.cyan} />
            <ValueField label="Crédito" value={formData.credit} onChange={v => setFormData({...formData, credit: v})} color={COLORS.blue} />
            <ValueField label="Débito" value={formData.debit} onChange={v => setFormData({...formData, debit: v})} color={COLORS.yellow} />
          </div>

          <div className="p-6 rounded-2xl bg-orange-50/50 border border-orange-100">
            <label className="block text-[9px] font-black text-orange-600 uppercase tracking-widest mb-3">Retirada (Sangria)</label>
            <div className="relative">
              <span className="absolute left-0 top-1/2 -translate-y-1/2 text-orange-400 font-black text-[10px]">R$</span>
              <input 
                type="number" 
                step="0.01" 
                className="w-full pl-6 bg-transparent border-b-2 border-orange-200 outline-none font-black text-xl text-orange-600 focus:border-orange-500 transition-all pb-1" 
                value={formData.sangria || ''} 
                onChange={e => setFormData({...formData, sangria: parseFloat(e.target.value) || 0})} 
                placeholder="0,00" 
              />
            </div>
          </div>

          <div className="pt-6 border-t border-gray-50 space-y-6">
            <div className="flex justify-between items-end px-1">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Saldo Turno</span>
              <span className="text-3xl font-black text-green-600 tracking-tighter">R$ {totalCalculated.toFixed(2)}</span>
            </div>
            <button 
              type="submit" 
              className="w-full h-14 rounded-2xl text-white font-black uppercase tracking-[0.2em] text-[11px] shadow-subtle hover:brightness-105 transition-all flex items-center justify-center gap-3 active:scale-95" 
              style={{ backgroundColor: COLORS.green }}
            >
              {editingId ? <Save size={18} /> : <Plus size={18} />}
              {editingId ? 'Salvar Alterações' : 'Confirmar Caixa'}
            </button>
          </div>
        </form>
      </div>

      {/* History Table - Suave e Alinhada */}
      <div className="lg:col-span-8 bg-white rounded-[32px] border border-gray-100 shadow-subtle overflow-hidden flex flex-col">
        <div className="px-10 py-10 border-b border-gray-50 flex justify-between items-center bg-[#FBFDFF]">
          <div className="flex items-center gap-5">
            <div className="w-12 h-12 rounded-xl bg-green-50 text-green-600 flex items-center justify-center border border-green-100 shrink-0 shadow-subtle"><LayoutGrid size={24} /></div>
            <div>
              <h3 className="text-xl font-black text-gray-900 tracking-tight uppercase tracking-wider">Fluxo Diário</h3>
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1 opacity-60">Histórico de Fechamento</p>
            </div>
          </div>
          <div className="flex gap-3">
             <span className="px-5 py-2.5 bg-gray-50 text-gray-400 rounded-full text-[9px] font-black uppercase tracking-widest border border-gray-100">{entries.length} Lançamentos</span>
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 text-[9px] font-black text-gray-400 uppercase tracking-[0.3em]">
                <th className="px-10 py-5 border-b border-gray-100"><div className="flex items-center gap-2"><Hash size={12} /> Cód</div></th>
                <th className="px-10 py-5 border-b border-gray-100">Data / Turno</th>
                <th className="px-10 py-5 border-b border-gray-100 text-center">Faturamento</th>
                <th className="px-10 py-5 border-b border-gray-100 text-center text-orange-500">Sangria</th>
                <th className="px-10 py-5 border-b border-gray-100 text-right">Saldo Líquido</th>
                <th className="px-10 py-5 border-b border-gray-100 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {entries.sort((a,b) => b.code.localeCompare(a.code)).map(e => {
                const total = (e.cash + e.pix + e.credit + e.debit);
                return (
                  <tr key={e.id} className="hover:bg-green-50/20 transition-all group">
                    <td className="px-10 py-6">
                      <span className="px-3 py-1 bg-gray-100 text-gray-500 rounded-lg font-black text-[10px]">{e.code}</span>
                    </td>
                    <td className="px-10 py-6">
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-gray-800 uppercase tracking-widest">{new Date(e.date + 'T12:00:00').toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'})}</span>
                        <span className="text-[9px] text-gray-400 font-black uppercase mt-0.5">{e.shift}</span>
                      </div>
                    </td>
                    <td className="px-10 py-6 text-center text-xs font-bold text-gray-600">R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td className="px-10 py-6 text-center text-xs font-bold text-orange-500">R$ {e.sangria.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td className="px-10 py-6 text-right text-sm font-black text-green-600 tracking-tight">R$ {(total - e.sangria).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td className="px-10 py-6">
                      <div className="flex justify-center gap-3 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                        <button onClick={() => handleEdit(e)} className="w-10 h-10 flex items-center justify-center bg-white border border-gray-100 text-gray-400 hover:text-green-600 hover:border-green-200 rounded-xl shadow-subtle transition-all active:scale-95"><Edit2 size={16} /></button>
                        <button onClick={() => setDeletingId(e.id)} className="w-10 h-10 flex items-center justify-center bg-white border border-gray-100 text-gray-400 hover:text-red-500 hover:border-red-200 rounded-xl shadow-subtle transition-all active:scale-95"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {entries.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-10 py-20 text-center">
                    <p className="text-[10px] font-black uppercase text-gray-300 tracking-[0.4em]">Nenhum registro encontrado</p>
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

const ValueField = ({ label, value, onChange, color }: any) => (
  <div className="p-4 rounded-2xl border border-gray-100 bg-gray-50/50 space-y-1 transition-all hover:bg-white hover:border-gray-200 hover:shadow-subtle">
    <label className="block text-[8px] font-black text-gray-400 uppercase tracking-widest">{label}</label>
    <div className="relative">
      <span className="absolute left-0 top-1/2 -translate-y-1/2 text-[9px] font-black opacity-30" style={{ color }}>R$</span>
      <input 
        type="number" 
        step="0.01" 
        className="w-full pl-5 bg-transparent outline-none font-bold text-sm text-gray-800" 
        value={value || ''} 
        onChange={e => onChange(parseFloat(e.target.value) || 0)} 
        placeholder="0,00" 
      />
    </div>
  </div>
);

export default CashEntryForm;
