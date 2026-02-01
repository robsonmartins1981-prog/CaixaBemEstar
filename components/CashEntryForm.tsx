
import React, { useState, useMemo, useRef } from 'react';
import { CashEntry, ShiftType } from '../types.ts';
import { db } from '../services/db.ts';
import { SHIFTS } from '../constants.tsx';
import { Save, Eye, X } from 'lucide-react';
import ConfirmationModal from './ConfirmationModal.tsx';

interface CashEntryFormProps {
  onSuccess: () => void;
  entries: CashEntry[];
}

const formatMoney = (val: number) => 
  val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });

const CashEntryForm: React.FC<CashEntryFormProps> = ({ onSuccess, entries }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [detailEntry, setDetailEntry] = useState<CashEntry | null>(null);
  const [filterType, setFilterType] = useState('MES');

  // Referências para navegação por Enter
  const dateRef = useRef<HTMLInputElement>(null);
  const shiftRef = useRef<HTMLSelectElement>(null);
  const cashRef = useRef<HTMLInputElement>(null);
  const pixRef = useRef<HTMLInputElement>(null);
  const creditRef = useRef<HTMLInputElement>(null);
  const debitRef = useRef<HTMLInputElement>(null);
  const sangriaRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<Omit<CashEntry, 'id' | 'code'>>({
    date: new Date().toISOString().split('T')[0],
    shift: 'CAIXA 01 (MANHÃ)',
    cash: 0, credit: 0, debit: 0, pix: 0, sangria: 0,
  });

  const filteredEntries = useMemo(() => {
    const monthStr = new Date().toISOString().substring(0, 7);
    return entries
      .filter(e => filterType === 'MES' ? e.date.startsWith(monthStr) : true)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [entries, filterType]);

  const validateAndSave = () => {
    if (!formData.date || !formData.shift) {
      dateRef.current?.focus();
      return;
    }
    
    if (editingId) db.updateEntry(editingId, formData);
    else db.saveEntry({ ...formData, id: db.generateId() } as any);
    
    onSuccess();
    setEditingId(null);
    setFormData({ ...formData, cash: 0, credit: 0, debit: 0, pix: 0, sangria: 0 });
    dateRef.current?.focus();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    validateAndSave();
  };

  const handleKeyDown = (e: React.KeyboardEvent, nextRef: React.RefObject<any> | null) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      
      if (nextRef && nextRef.current) {
        nextRef.current.focus();
        if (nextRef.current.select) nextRef.current.select();
      } else {
        validateAndSave();
      }
    }
  };

  const brutoTotal = (formData.cash + formData.credit + formData.debit + formData.pix);
  const liquidoTotal = brutoTotal - (formData.sangria || 0);

  return (
    <div className="flex-1 flex flex-col lg:flex-row gap-4 h-full overflow-hidden">
      <ConfirmationModal 
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={() => { db.deleteEntry(deletingId!); onSuccess(); setDeletingId(null); }}
        title="Excluir Lançamento"
        message="Deseja realmente remover este registro de caixa?"
      />

      {detailEntry && <DetailViewModal entry={detailEntry} onClose={() => setDetailEntry(null)} />}

      <div className="lg:w-96 bg-white border border-slate-200 shadow-sm flex flex-col shrink-0 rounded-2xl overflow-hidden">
        <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
          <h3 className="text-[12px] font-black uppercase text-slate-700 tracking-widest">Lançamento Diário</h3>
          {editingId && <button onClick={() => setEditingId(null)} className="text-[10px] font-black text-red-500 uppercase">Cancelar Edição</button>}
        </div>

        <form onSubmit={handleSubmit} className="flex-1 p-4 flex flex-col gap-3 overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-black text-slate-400 uppercase ml-1">Data</label>
              <input 
                ref={dateRef}
                type="date" 
                className="h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-blue-500 focus:bg-white" 
                value={formData.date} 
                onChange={e => setFormData({...formData, date: e.target.value})} 
                onKeyDown={(e) => handleKeyDown(e, shiftRef)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-black text-slate-400 uppercase ml-1">Caixa</label>
              <select 
                ref={shiftRef}
                className="h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-black uppercase outline-none focus:border-blue-500 focus:bg-white" 
                value={formData.shift} 
                onChange={e => setFormData({...formData, shift: e.target.value as ShiftType})}
                onKeyDown={(e) => handleKeyDown(e, cashRef)}
              >
                {SHIFTS.map(s => <option key={s} value={s}>{s.split(' ')[1]}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-3 mt-2">
            <CompactInput 
              inputRef={cashRef}
              label="Dinheiro" 
              value={formData.cash} 
              onChange={(v: number) => setFormData({...formData, cash: v})} 
              color="border-l-green-600" 
              onKeyDown={(e: any) => handleKeyDown(e, pixRef)}
            />
            <CompactInput 
              inputRef={pixRef}
              label="Pix" 
              value={formData.pix} 
              onChange={(v: number) => setFormData({...formData, pix: v})} 
              color="border-l-cyan-500" 
              onKeyDown={(e: any) => handleKeyDown(e, creditRef)}
            />
            <CompactInput 
              inputRef={creditRef}
              label="Cartão Crédito" 
              value={formData.credit} 
              onChange={(v: number) => setFormData({...formData, credit: v})} 
              color="border-l-blue-600" 
              onKeyDown={(e: any) => handleKeyDown(e, debitRef)}
            />
            <CompactInput 
              inputRef={debitRef}
              label="Cartão Débito" 
              value={formData.debit} 
              onChange={(v: number) => setFormData({...formData, debit: v})} 
              color="border-l-blue-400" 
              onKeyDown={(e: any) => handleKeyDown(e, sangriaRef)}
            />
            <CompactInput 
              inputRef={sangriaRef}
              label="Sangria (Saída)" 
              value={formData.sangria} 
              onChange={(v: number) => setFormData({...formData, sangria: v})} 
              color="border-l-orange-600" 
              onKeyDown={(e: any) => handleKeyDown(e, null)}
            />
          </div>

          <div className="mt-auto pt-4 border-t">
            <div className="flex justify-between items-center p-4 bg-slate-900 rounded-2xl text-white mb-3 shadow-inner">
               <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">Total Líquido</span>
               <span className="text-lg font-mono font-black text-green-400">{formatMoney(liquidoTotal)}</span>
            </div>
            <button type="submit" className="w-full h-12 bg-green-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-green-700 active:scale-95 transition-all shadow-lg shadow-green-900/10">
              <Save size={18}/> {editingId ? 'Salvar Alteração' : 'Gravar Lançamento'}
            </button>
          </div>
        </form>
      </div>

      <div className="flex-1 bg-white border border-slate-200 shadow-sm flex flex-col overflow-hidden rounded-2xl">
        <div className="p-4 bg-slate-50 border-b flex items-center justify-between shrink-0">
          <h3 className="text-[12px] font-black uppercase text-slate-500 tracking-widest">Histórico de Movimentação</h3>
          <div className="flex bg-white border border-slate-200 p-1 rounded-xl shadow-sm">
            <button onClick={() => setFilterType('MES')} className={`px-4 py-2 rounded-lg text-[10px] font-black transition-all ${filterType === 'MES' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>MÊS ATUAL</button>
            <button onClick={() => setFilterType('TUDO')} className={`px-4 py-2 rounded-lg text-[10px] font-black transition-all ${filterType === 'TUDO' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>TUDO</button>
          </div>
        </div>

        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full border-collapse min-w-[600px]">
            <thead className="sticky top-0 bg-slate-50 text-[11px] font-black uppercase text-slate-400 border-b z-10">
              <tr>
                <th className="px-5 py-4 text-left">Data do Registro</th>
                <th className="px-5 py-4 text-right">Faturamento (In)</th>
                <th className="px-5 py-4 text-right">Sangrias (Out)</th>
                <th className="px-5 py-4 text-right">Saldo Líquido</th>
                <th className="px-5 py-4 text-center w-28">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredEntries.map((e) => {
                const totalIn = e.cash + e.pix + e.credit + e.debit;
                return (
                  <tr key={e.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span className="text-[13px] font-mono font-black text-slate-700">{e.date.split('-').reverse().join('/')}</span>
                        <span className="px-2 py-0.5 bg-slate-100 text-[10px] font-black text-slate-400 rounded-md uppercase border border-slate-200">{e.shift.split(' ')[1]}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right text-[13px] font-mono font-black text-green-600">{formatMoney(totalIn)}</td>
                    <td className="px-5 py-4 text-right text-[13px] font-mono font-black text-rose-500">{formatMoney(e.sangria)}</td>
                    <td className="px-5 py-4 text-right text-[14px] font-mono font-black text-slate-900">{formatMoney(totalIn - e.sangria)}</td>
                    <td className="px-5 py-4 text-center">
                       <div className="flex justify-center gap-2">
                          <button onClick={() => setDetailEntry(e)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-xl transition-all" title="Ver Detalhes"><Eye size={18}/></button>
                          <button onClick={() => setDeletingId(e.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all" title="Excluir"><X size={18}/></button>
                       </div>
                    </td>
                  </tr>
                );
              })}
              {filteredEntries.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-20 text-center text-[12px] font-black text-slate-300 uppercase italic tracking-widest">Nenhum registro de caixa encontrado</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const CompactInput = ({ label, value, onChange, color, onKeyDown, inputRef }: any) => {
  const handleRawChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, ''); 
    onChange(parseInt(raw, 10) / 100 || 0);
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
  };

  return (
    <div className={`p-3 bg-slate-50 border-l-4 ${color} rounded-r-2xl group focus-within:border-l-blue-500 focus-within:bg-white transition-all border border-transparent border-l-inherit shadow-sm`}>
      <label className="block text-[10px] font-black text-slate-400 uppercase leading-none mb-1.5 tracking-wider">{label}</label>
      <div className="flex items-baseline gap-1.5">
        <span className="text-[12px] font-black text-slate-300 uppercase">R$</span>
        <input 
          ref={inputRef}
          type="text" 
          inputMode="numeric" 
          className="w-full bg-transparent border-none outline-none font-mono font-black text-xl text-slate-800" 
          value={value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} 
          onChange={handleRawChange}
          onKeyDown={onKeyDown}
          onFocus={handleFocus}
        />
      </div>
    </div>
  );
};

const DetailViewModal = ({ entry, onClose }: any) => {
  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-[2rem] shadow-2xl max-w-sm w-full overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-5 border-b flex justify-between items-center bg-slate-50">
          <h2 className="text-[12px] font-black uppercase text-slate-800 tracking-widest">Detalhamento do Caixa</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={24}/></button>
        </div>
        <div className="p-8 space-y-5">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Data</p>
              <p className="text-sm font-black text-slate-800">{entry.date.split('-').reverse().join('/')}</p>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Turno</p>
              <p className="text-sm font-black text-slate-800">{entry.shift.split(' ')[1]}</p>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 space-y-3">
             <div className="flex justify-between text-sm font-bold text-slate-600"><span>Dinheiro</span> <span className="font-mono">{formatMoney(entry.cash)}</span></div>
             <div className="flex justify-between text-sm font-bold text-slate-600"><span>Pix</span> <span className="font-mono">{formatMoney(entry.pix)}</span></div>
             <div className="flex justify-between text-sm font-bold text-slate-600"><span>Crédito</span> <span className="font-mono">{formatMoney(entry.credit)}</span></div>
             <div className="flex justify-between text-sm font-bold text-slate-600"><span>Débito</span> <span className="font-mono">{formatMoney(entry.debit)}</span></div>
             <div className="flex justify-between text-sm font-black text-rose-500 pt-2 border-t border-dashed border-slate-200"><span>Sangrias</span> <span className="font-mono">-{formatMoney(entry.sangria)}</span></div>
          </div>

          <div className="mt-6 p-6 bg-slate-900 rounded-[1.5rem] text-center shadow-xl">
            <p className="text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest">Saldo Final em Caixa</p>
            <p className="text-3xl font-mono font-black text-green-400 leading-none">{formatMoney(entry.cash + entry.pix + entry.credit + entry.debit - entry.sangria)}</p>
          </div>
        </div>
        <button onClick={onClose} className="w-full py-5 bg-slate-50 text-[11px] font-black uppercase text-slate-500 hover:bg-slate-100 transition-colors border-t border-slate-100">Fechar Resumo</button>
      </div>
    </div>
  );
};

export default CashEntryForm;