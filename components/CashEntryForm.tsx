
import React, { useState, useRef } from 'react';
import { CashEntry, ShiftType } from '../types';
import { db } from '../services/db';
import { COLORS, SHIFTS } from '../constants';
import { Plus, Trash2, Edit2, X, Save, Calendar, Clock, ChevronLeft, ChevronRight, Hash } from 'lucide-react';
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
      db.saveEntry({ ...formData, id: db.generateId() });
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
  };

  const totalCalculated = (formData.cash + formData.credit + formData.debit + formData.pix - formData.sangria);
  const selectedDateObj = new Date(formData.date + 'T12:00:00');

  return (
    <div className="h-full flex flex-col gap-6 overflow-hidden">
      <ConfirmationModal 
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={() => { db.deleteEntry(deletingId!); onSuccess(); setDeletingId(null); }}
        title="Confirmar"
        message="Excluir este registro?"
      />

      <div className="flex-1 grid grid-cols-12 gap-6 min-h-0 overflow-hidden">
        {/* Form Column */}
        <div className="col-span-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-subtle flex flex-col overflow-y-auto custom-scrollbar">
          <div className="flex items-center gap-4 mb-6 shrink-0">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0" style={{ backgroundColor: COLORS.green }}>
              {editingId ? <Edit2 size={18} /> : <Plus size={18} />}
            </div>
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">{editingId ? 'Editar Movimento' : 'Novo Lançamento'}</h3>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-gray-50 p-2 rounded-2xl flex items-center gap-2">
              <button type="button" onClick={() => adjustDate(-1)} className="w-10 h-10 flex items-center justify-center bg-white rounded-lg hover:bg-green-50 transition-colors border border-gray-100"><ChevronLeft size={16} /></button>
              <div className="flex-1 text-center font-black text-[11px] uppercase tracking-tighter text-gray-700">
                {selectedDateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
              </div>
              <button type="button" onClick={() => adjustDate(1)} className="w-10 h-10 flex items-center justify-center bg-white rounded-lg hover:bg-green-50 transition-colors border border-gray-100"><ChevronRight size={16} /></button>
            </div>

            <select className="w-full h-12 px-4 rounded-xl bg-gray-50 border border-gray-100 font-black text-[10px] uppercase tracking-widest outline-none focus:bg-white" value={formData.shift} onChange={e => setFormData({ ...formData, shift: e.target.value as ShiftType })}>
              {SHIFTS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            <div className="grid grid-cols-2 gap-3">
              <CompactField label="Espécie" value={formData.cash} onChange={v => setFormData({...formData, cash: v})} />
              <CompactField label="Pix" value={formData.pix} onChange={v => setFormData({...formData, pix: v})} />
              <CompactField label="Crédito" value={formData.credit} onChange={v => setFormData({...formData, credit: v})} />
              <CompactField label="Débito" value={formData.debit} onChange={v => setFormData({...formData, debit: v})} />
            </div>

            <div className="p-4 rounded-2xl bg-orange-50/50 border border-orange-100">
              <label className="text-[9px] font-black text-orange-600 uppercase mb-1 block">Sangria</label>
              <input type="number" step="0.01" className="w-full bg-transparent outline-none font-black text-lg text-orange-600" value={formData.sangria || ''} onChange={e => setFormData({...formData, sangria: parseFloat(e.target.value) || 0})} placeholder="0,00" />
            </div>

            <div className="pt-4 border-t border-gray-50 flex justify-between items-center px-2">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Saldo Líquido</span>
              <span className="text-2xl font-black text-green-600 tracking-tighter">R$ {totalCalculated.toFixed(2)}</span>
            </div>

            <button type="submit" className="w-full h-12 rounded-xl text-white font-black uppercase tracking-widest text-[10px] shadow-subtle hover:brightness-105 active:scale-95 transition-all" style={{ backgroundColor: COLORS.green }}>
              {editingId ? 'Salvar Alteração' : 'Confirmar Caixa'}
            </button>
          </form>
        </div>

        {/* History Column */}
        <div className="col-span-8 bg-white rounded-3xl border border-gray-100 shadow-subtle flex flex-col overflow-hidden">
          <div className="px-8 py-5 border-b border-gray-50 bg-[#FBFDFF] flex justify-between items-center shrink-0">
             <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest">Fluxo Diário</h3>
             <span className="text-[9px] font-black text-gray-400 uppercase border border-gray-100 px-3 py-1 rounded-full">{entries.length} Movimentos</span>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-white z-10 shadow-sm shadow-gray-100">
                <tr className="bg-gray-50/50 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                  <th className="px-8 py-4">Data / Turno</th>
                  <th className="px-8 py-4 text-right">Faturamento</th>
                  <th className="px-8 py-4 text-right text-orange-500">Sangria</th>
                  <th className="px-8 py-4 text-right">Saldo</th>
                  <th className="px-8 py-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {[...entries].sort((a,b) => b.code.localeCompare(a.code)).map(e => {
                  const total = (e.cash + e.pix + e.credit + e.debit);
                  return (
                    <tr key={e.id} className="hover:bg-green-50/20 group transition-colors">
                      <td className="px-8 py-4">
                        <div className="flex flex-col">
                          <span className="text-[11px] font-black text-gray-800 uppercase tracking-tighter">{new Date(e.date + 'T12:00:00').toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'})}</span>
                          <span className="text-[8px] text-gray-400 font-bold uppercase truncate max-w-[120px]">{e.shift}</span>
                        </div>
                      </td>
                      <td className="px-8 py-4 text-right text-[11px] font-bold text-gray-600">R$ {total.toFixed(0)}</td>
                      <td className="px-8 py-4 text-right text-[11px] font-bold text-orange-500">R$ {e.sangria.toFixed(0)}</td>
                      <td className="px-8 py-4 text-right text-[11px] font-black text-green-600">R$ {(total - e.sangria).toLocaleString('pt-BR')}</td>
                      <td className="px-8 py-4">
                        <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100">
                          <button onClick={() => handleEdit(e)} className="w-8 h-8 flex items-center justify-center bg-white border border-gray-100 text-gray-400 hover:text-green-600 rounded-lg transition-all"><Edit2 size={14} /></button>
                          <button onClick={() => setDeletingId(e.id)} className="w-8 h-8 flex items-center justify-center bg-white border border-gray-100 text-gray-400 hover:text-red-500 rounded-lg transition-all"><Trash2 size={14} /></button>
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

const CompactField = ({ label, value, onChange }: any) => (
  <div className="p-3 rounded-xl border border-gray-100 bg-gray-50/30">
    <label className="block text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">{label}</label>
    <div className="relative">
      <span className="absolute left-0 top-1/2 -translate-y-1/2 text-[9px] font-black opacity-30 text-gray-400">R$</span>
      <input type="number" step="0.01" className="w-full pl-5 bg-transparent outline-none font-bold text-xs text-gray-800" value={value || ''} onChange={e => onChange(parseFloat(e.target.value) || 0)} placeholder="0,00" />
    </div>
  </div>
);

export default CashEntryForm;
