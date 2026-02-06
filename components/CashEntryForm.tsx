
import React, { useState, useMemo, useRef } from 'react';
import { CashEntry, ShiftType } from '../types.ts';
import { db } from '../services/db.ts';
import { SHIFTS } from '../constants.tsx';
import { Save, Eye, X, Calendar, Search, Filter, RotateCcw } from 'lucide-react';
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
  
  // Novos estados para filtragem de data
  const [dateFilterMode, setDateFilterMode] = useState<'MES' | 'HOJE' | 'SEMANA' | 'CUSTOM'>('MES');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

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
    return entries.filter(e => {
      const entryDate = new Date(e.date + 'T12:00:00');
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (dateFilterMode === 'HOJE') {
        return e.date === new Date().toISOString().split('T')[0];
      }
      if (dateFilterMode === 'MES') {
        const monthStr = new Date().toISOString().substring(0, 7);
        return e.date.startsWith(monthStr);
      }
      if (dateFilterMode === 'SEMANA') {
        const weekAgo = new Date();
        weekAgo.setDate(today.getDate() - 7);
        return entryDate >= weekAgo && entryDate <= today;
      }
      if (dateFilterMode === 'CUSTOM') {
        return e.date >= startDate && e.date <= endDate;
      }
      return true;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [entries, dateFilterMode, startDate, endDate]);

  const tableTotals = useMemo(() => {
    return filteredEntries.reduce((acc, curr) => ({
      cash: acc.cash + curr.cash,
      pix: acc.pix + curr.pix,
      credit: acc.credit + curr.credit,
      debit: acc.debit + curr.debit,
      sangria: acc.sangria + curr.sangria,
      bruto: acc.bruto + (curr.cash + curr.pix + curr.credit + curr.debit),
      liquido: acc.liquido + (curr.cash + curr.pix + curr.credit + curr.debit - curr.sangria)
    }), { cash: 0, pix: 0, credit: 0, debit: 0, sangria: 0, bruto: 0, liquido: 0 });
  }, [filteredEntries]);

  const handleEdit = (entry: CashEntry) => {
    setEditingId(entry.id);
    setFormData({
      date: entry.date,
      shift: entry.shift,
      cash: entry.cash,
      pix: entry.pix,
      credit: entry.credit,
      debit: entry.debit,
      sangria: entry.sangria
    });
    dateRef.current?.focus();
  };

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

  const liquidoTotal = (formData.cash + formData.credit + formData.debit + formData.pix) - (formData.sangria || 0);

  return (
    <div className="flex-1 flex flex-col lg:flex-row gap-6 h-full overflow-hidden">
      <ConfirmationModal 
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={() => { db.deleteEntry(deletingId!); onSuccess(); setDeletingId(null); }}
        title="Excluir Lançamento"
        message="Deseja realmente remover este registro de caixa?"
      />

      {detailEntry && <DetailViewModal entry={detailEntry} onClose={() => setDetailEntry(null)} />}

      {/* FORMULÁRIO DE LANÇAMENTO */}
      <div className="lg:w-96 bg-white border border-slate-200 shadow-sm flex flex-col shrink-0 rounded-[2rem] overflow-hidden">
        <div className="p-6 bg-slate-50 border-b flex justify-between items-center">
          <div className="flex items-center gap-3">
             <div className={`w-2 h-2 rounded-full ${editingId ? 'bg-orange-500 animate-pulse' : 'bg-green-500'}`}></div>
             <h3 className="text-[12px] font-black uppercase text-slate-800 tracking-widest">
               {editingId ? 'Editando Lançamento' : 'Novo Lançamento'}
             </h3>
          </div>
          {editingId && (
            <button onClick={() => { setEditingId(null); setFormData({...formData, cash:0, pix:0, credit:0, debit:0, sangria:0}); }} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
              <RotateCcw size={18}/>
            </button>
          )}
        </div>

        <form onSubmit={(e) => { e.preventDefault(); validateAndSave(); }} className="flex-1 p-6 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Data</label>
              <input 
                ref={dateRef}
                type="date" 
                className="h-12 px-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-blue-500 focus:bg-white transition-all" 
                value={formData.date} 
                onChange={e => setFormData({...formData, date: e.target.value})} 
                onKeyDown={(e) => handleKeyDown(e, shiftRef)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Caixa</label>
              <select 
                ref={shiftRef}
                className="h-12 px-4 bg-slate-50 border border-slate-200 rounded-2xl text-[10px] font-black uppercase outline-none focus:border-blue-500 focus:bg-white transition-all" 
                value={formData.shift} 
                onChange={e => setFormData({...formData, shift: e.target.value as ShiftType})}
                onKeyDown={(e) => handleKeyDown(e, cashRef)}
              >
                {SHIFTS.map(s => <option key={s} value={s}>{s.split(' ')[1]}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-4 mt-2">
            <CompactInput inputRef={cashRef} label="Dinheiro" value={formData.cash} onChange={(v: number) => setFormData({...formData, cash: v})} color="border-emerald-500" onKeyDown={(e: any) => handleKeyDown(e, pixRef)} />
            <CompactInput inputRef={pixRef} label="Recebido via Pix" value={formData.pix} onChange={(v: number) => setFormData({...formData, pix: v})} color="border-cyan-500" onKeyDown={(e: any) => handleKeyDown(e, creditRef)} />
            <CompactInput inputRef={creditRef} label="Cartão de Crédito" value={formData.credit} onChange={(v: number) => setFormData({...formData, credit: v})} color="border-blue-600" onKeyDown={(e: any) => handleKeyDown(e, debitRef)} />
            <CompactInput inputRef={debitRef} label="Cartão de Débito" value={formData.debit} onChange={(v: number) => setFormData({...formData, debit: v})} color="border-indigo-400" onKeyDown={(e: any) => handleKeyDown(e, sangriaRef)} />
            <CompactInput inputRef={sangriaRef} label="Sangria de Caixa" value={formData.sangria} onChange={(v: number) => setFormData({...formData, sangria: v})} color="border-rose-500" onKeyDown={(e: any) => handleKeyDown(e, null)} />
          </div>

          <div className="mt-auto pt-6 border-t border-slate-100">
            <div className="flex justify-between items-center p-5 bg-slate-900 rounded-[1.5rem] text-white mb-4 shadow-xl">
               <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Saldo Líquido</span>
               <span className="text-xl font-mono font-black text-green-400">{formatMoney(liquidoTotal)}</span>
            </div>
            <button type="submit" className="w-full h-14 bg-green-600 text-white rounded-[1.5rem] text-xs font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-green-700 active:scale-95 transition-all shadow-lg shadow-green-900/20">
              <Save size={20}/> {editingId ? 'Salvar Alteração' : 'Gravar no Banco'}
            </button>
          </div>
        </form>
      </div>

      {/* LISTAGEM E FILTROS */}
      <div className="flex-1 bg-white border border-slate-200 shadow-sm flex flex-col overflow-hidden rounded-[2rem]">
        <div className="p-6 bg-slate-50 border-b flex flex-col xl:flex-row items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <Calendar size={20} className="text-slate-400"/>
            <h3 className="text-[12px] font-black uppercase text-slate-800 tracking-widest">Filtro de Histórico</h3>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex bg-white border border-slate-200 p-1 rounded-xl shadow-sm">
              <FilterBtn active={dateFilterMode === 'HOJE'} onClick={() => setDateFilterMode('HOJE')} label="Hoje" />
              <FilterBtn active={dateFilterMode === 'SEMANA'} onClick={() => setDateFilterMode('SEMANA')} label="7 Dias" />
              <FilterBtn active={dateFilterMode === 'MES'} onClick={() => setDateFilterMode('MES')} label="Mês Atual" />
              <FilterBtn active={dateFilterMode === 'CUSTOM'} onClick={() => setDateFilterMode('CUSTOM')} label="Personalizado" />
            </div>

            {dateFilterMode === 'CUSTOM' && (
              <div className="flex items-center gap-2 bg-white border border-slate-200 p-1 rounded-xl shadow-sm animate-in slide-in-from-right-4">
                <input type="date" className="bg-transparent border-none outline-none text-[10px] font-black uppercase px-2" value={startDate} onChange={e => setStartDate(e.target.value)} />
                <span className="text-slate-300">|</span>
                <input type="date" className="bg-transparent border-none outline-none text-[10px] font-black uppercase px-2" value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full border-collapse min-w-[1100px]">
            <thead className="sticky top-0 bg-white text-[10px] font-black uppercase text-slate-400 border-b z-10">
              <tr>
                <th className="px-6 py-5 text-left border-r border-slate-50">Data / Turno</th>
                <th className="px-4 py-5 text-right">Dinheiro</th>
                <th className="px-4 py-5 text-right">Pix</th>
                <th className="px-4 py-5 text-right">Crédito</th>
                <th className="px-4 py-5 text-right">Débito</th>
                <th className="px-4 py-5 text-right bg-slate-50/50">Bruto</th>
                <th className="px-4 py-5 text-right">Sangria</th>
                <th className="px-6 py-5 text-right text-slate-900 border-l border-slate-50">Líquido</th>
                <th className="px-6 py-5 text-center w-28">Gestão</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredEntries.map((e) => {
                const totalIn = e.cash + e.pix + e.credit + e.debit;
                return (
                  <tr key={e.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-5 border-r border-slate-50">
                      <div className="flex flex-col">
                        <span className="text-[12px] font-mono font-black text-slate-800 mb-0.5">{e.date.split('-').reverse().join('/')}</span>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">{e.shift.split(' ')[1]}</span>
                      </div>
                    </td>
                    <td className="px-4 py-5 text-right text-[12px] font-mono font-bold text-slate-600">{formatMoney(e.cash)}</td>
                    <td className="px-4 py-5 text-right text-[12px] font-mono font-bold text-slate-600">{formatMoney(e.pix)}</td>
                    <td className="px-4 py-5 text-right text-[12px] font-mono font-bold text-slate-600">{formatMoney(e.credit)}</td>
                    <td className="px-4 py-5 text-right text-[12px] font-mono font-bold text-slate-600">{formatMoney(e.debit)}</td>
                    <td className="px-4 py-5 text-right text-[12px] font-mono font-black text-emerald-600 bg-emerald-50/20">{formatMoney(totalIn)}</td>
                    <td className="px-4 py-5 text-right text-[12px] font-mono font-bold text-rose-500">{formatMoney(e.sangria)}</td>
                    <td className="px-6 py-5 text-right text-[14px] font-mono font-black text-slate-900 border-l border-slate-50">{formatMoney(totalIn - e.sangria)}</td>
                    <td className="px-6 py-5">
                       <div className="flex justify-center gap-2">
                          <button onClick={() => handleEdit(e)} className="p-2.5 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all"><Search size={18}/></button>
                          <button onClick={() => setDeletingId(e.id)} className="p-2.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"><X size={18}/></button>
                       </div>
                    </td>
                  </tr>
                );
              })}
              {filteredEntries.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-24 text-center">
                    <div className="flex flex-col items-center opacity-20">
                      <Calendar size={64} className="mb-4" />
                      <p className="text-sm font-black uppercase tracking-widest">Nenhum registro no período</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
            {filteredEntries.length > 0 && (
              <tfoot className="sticky bottom-0 bg-slate-900 text-white z-10 shadow-2xl">
                <tr className="divide-x divide-slate-800">
                  <td className="px-6 py-5 text-[9px] font-black uppercase tracking-widest text-slate-500">Saldo Consolidado</td>
                  <td className="px-4 py-5 text-right text-[11px] font-mono font-black">{formatMoney(tableTotals.cash)}</td>
                  <td className="px-4 py-5 text-right text-[11px] font-mono font-black">{formatMoney(tableTotals.pix)}</td>
                  <td className="px-4 py-5 text-right text-[11px] font-mono font-black">{formatMoney(tableTotals.credit)}</td>
                  <td className="px-4 py-5 text-right text-[11px] font-mono font-black">{formatMoney(tableTotals.debit)}</td>
                  <td className="px-4 py-5 text-right text-[12px] font-mono font-black text-emerald-400">{formatMoney(tableTotals.bruto)}</td>
                  <td className="px-4 py-5 text-right text-[11px] font-mono font-black text-rose-400">{formatMoney(tableTotals.sangria)}</td>
                  <td className="px-6 py-5 text-right text-[16px] font-mono font-black text-green-400 bg-slate-800">{formatMoney(tableTotals.liquido)}</td>
                  <td className="bg-slate-900"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};

const FilterBtn = ({ active, onClick, label }: any) => (
  <button 
    onClick={onClick} 
    className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${active ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
  >
    {label}
  </button>
);

const CompactInput = ({ label, value, onChange, color, onKeyDown, inputRef }: any) => {
  const handleRawChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, ''); 
    onChange(parseInt(raw, 10) / 100 || 0);
  };
  return (
    <div className={`p-4 bg-slate-50 border-l-4 rounded-r-2xl focus-within:bg-white focus-within:shadow-md transition-all border border-transparent border-l-inherit`} style={{ borderLeftColor: color }}>
      <label className="block text-[9px] font-black text-slate-400 uppercase leading-none mb-2 tracking-widest">{label}</label>
      <div className="flex items-baseline gap-2">
        <span className="text-[11px] font-black text-slate-300">R$</span>
        <input 
          ref={inputRef}
          type="text" 
          inputMode="numeric" 
          className="w-full bg-transparent border-none outline-none font-mono font-black text-xl text-slate-800" 
          value={value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} 
          onChange={handleRawChange}
          onKeyDown={onKeyDown}
          onFocus={(e) => e.target.select()}
        />
      </div>
    </div>
  );
};

const DetailViewModal = ({ entry, onClose }: any) => (
  <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
    <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-sm w-full overflow-hidden animate-in zoom-in-95">
      <div className="p-6 border-b flex justify-between items-center">
        <h2 className="text-[12px] font-black uppercase text-slate-800 tracking-widest">Resumo de Auditoria</h2>
        <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 transition-colors"><X size={24}/></button>
      </div>
      <div className="p-8 space-y-6">
        <div className="flex justify-between items-end border-b pb-4">
           <div>
              <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Data Competência</p>
              <p className="text-xl font-mono font-black text-slate-800">{entry.date.split('-').reverse().join('/')}</p>
           </div>
           <div className="text-right">
              <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Turno</p>
              <p className="text-sm font-black text-slate-600 uppercase tracking-tighter">{entry.shift.split(' ')[1]}</p>
           </div>
        </div>

        <div className="space-y-3">
           <DetailRow label="Dinheiro" value={entry.cash} />
           <DetailRow label="Pix" value={entry.pix} />
           <DetailRow label="Crédito" value={entry.credit} />
           <DetailRow label="Débito" value={entry.debit} />
           <DetailRow label="Sangrias" value={-entry.sangria} color="text-rose-500" />
        </div>

        <div className="p-6 bg-slate-900 rounded-[2rem] text-center">
          <p className="text-[9px] font-black text-slate-500 uppercase mb-2 tracking-widest">Total Líquido do Caixa</p>
          <p className="text-3xl font-mono font-black text-green-400">{formatMoney(entry.cash + entry.pix + entry.credit + entry.debit - entry.sangria)}</p>
        </div>
      </div>
    </div>
  </div>
);

const DetailRow = ({ label, value, color = 'text-slate-600' }: any) => (
  <div className="flex justify-between items-center">
     <span className="text-[10px] font-black text-slate-400 uppercase">{label}</span>
     <span className={`text-[12px] font-mono font-black ${color}`}>{formatMoney(Math.abs(value))}</span>
  </div>
);

export default CashEntryForm;
