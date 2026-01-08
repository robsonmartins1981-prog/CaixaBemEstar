
import React, { useState, useMemo, useRef } from 'react';
import { CashEntry, ShiftType } from '../types';
import { db } from '../services/db';
import { SHIFTS } from '../constants';
import { Save, Calculator, History, ChevronRight, Eye, X, ReceiptText, ArrowDownCircle } from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';

interface CashEntryFormProps {
  onSuccess: () => void;
  entries: CashEntry[];
}

const formatMoney = (val: number) => 
  val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });

type ListFilterType = 'DIA' | 'MES' | 'ANO' | 'CUSTOM';

const CashEntryForm: React.FC<CashEntryFormProps> = ({ onSuccess, entries }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [detailEntry, setDetailEntry] = useState<CashEntry | null>(null);
  const [filterType, setFilterType] = useState<ListFilterType>('MES');
  const [customRange, setCustomRange] = useState({ start: '', end: '' });

  const inputRefs = useRef<(HTMLInputElement | HTMLSelectElement | null)[]>([]);

  const [formData, setFormData] = useState<Omit<CashEntry, 'id' | 'code'>>({
    date: new Date().toISOString().split('T')[0],
    shift: 'CAIXA 01 (MANHÃ)',
    cash: 0,
    credit: 0,
    debit: 0,
    pix: 0,
    sangria: 0,
  });

  const filteredAndSortedEntries = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const monthStr = todayStr.substring(0, 7);
    const yearStr = todayStr.substring(0, 4);

    const filtered = entries.filter(e => {
      if (filterType === 'DIA') return e.date === todayStr;
      if (filterType === 'MES') return e.date.startsWith(monthStr);
      if (filterType === 'ANO') return e.date.startsWith(yearStr);
      if (filterType === 'CUSTOM') {
        if (!customRange.start || !customRange.end) return true;
        return e.date >= customRange.start && e.date <= customRange.end;
      }
      return true;
    });

    const shiftOrder: Record<string, number> = { 'CAIXA 01 (MANHÃ)': 1, 'CAIXA 02 (TARDE)': 2, 'CAIXA 03 (NOITE)': 3 };
    return [...filtered].sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      return (shiftOrder[a.shift] || 0) - (shiftOrder[b.shift] || 0);
    });
  }, [entries, filterType, customRange]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      db.updateEntry(editingId, { ...formData, sangria: formData.sangria || 0 });
    } else {
      db.saveEntry({ ...formData, id: db.generateId(), sangria: formData.sangria || 0 } as any);
    }
    onSuccess();
    setEditingId(null);
    setFormData({ ...formData, cash: 0, credit: 0, debit: 0, pix: 0, sangria: 0 });
    inputRefs.current[0]?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Enter') {
      if (index < 6) {
        e.preventDefault();
        inputRefs.current[index + 1]?.focus();
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
        title="Excluir Registro"
        message="Confirma a remoção definitiva deste lançamento de caixa?"
      />

      {detailEntry && <DetailViewModal entry={detailEntry} onClose={() => setDetailEntry(null)} />}

      <div className="lg:w-[420px] bg-white border border-slate-200 shadow-sm flex flex-col h-full shrink-0 rounded-2xl">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-2">
            <Calculator size={18} className="text-green-700"/>
            <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-800">Lançamento de Turno</h3>
          </div>
          {editingId && (
            <button onClick={() => {setEditingId(null); setFormData({...formData, cash: 0, credit: 0, debit: 0, pix: 0, sangria: 0});}} className="text-[9px] font-black text-red-600 uppercase underline">Sair da Edição</button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="flex-1 p-5 flex flex-col gap-3 overflow-y-auto custom-scrollbar bg-slate-50/20">
          <div className="grid grid-cols-2 gap-3 mb-2">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-600 uppercase">Data do Movimento</label>
              <input 
                ref={el => { inputRefs.current[0] = el; }}
                type="date" 
                className="w-full h-10 px-3 bg-white border border-slate-300 text-xs font-bold focus:border-green-500 outline-none rounded shadow-sm" 
                value={formData.date} 
                onKeyDown={e => handleKeyDown(e, 0)}
                onChange={e => setFormData({...formData, date: e.target.value})} 
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-600 uppercase">Terminal/Turno</label>
              <select 
                ref={el => { inputRefs.current[1] = el; }}
                className="w-full h-10 px-3 bg-white border border-slate-300 text-[10px] font-black uppercase focus:border-green-500 outline-none rounded shadow-sm" 
                value={formData.shift} 
                onKeyDown={e => handleKeyDown(e, 1)}
                onChange={e => setFormData({...formData, shift: e.target.value as ShiftType})}
              >
                {SHIFTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-3">
            <SpreadsheetInput 
              inputRef={(el: HTMLInputElement | null) => { inputRefs.current[2] = el; }}
              label="01. DINHEIRO (CÉDULAS)" 
              value={formData.cash} 
              onKeyDown={(e: React.KeyboardEvent) => handleKeyDown(e, 2)}
              onChange={(v: number) => setFormData({...formData, cash: v})} 
              color="green" 
            />
            <SpreadsheetInput 
              inputRef={(el: HTMLInputElement | null) => { inputRefs.current[3] = el; }}
              label="02. TRANSFERÊNCIA PIX" 
              value={formData.pix} 
              onKeyDown={(e: React.KeyboardEvent) => handleKeyDown(e, 3)}
              onChange={(v: number) => setFormData({...formData, pix: v})} 
              color="cyan" 
            />
            <SpreadsheetInput 
              inputRef={(el: HTMLInputElement | null) => { inputRefs.current[4] = el; }}
              label="03. CARTÃO CRÉDITO" 
              value={formData.credit} 
              onKeyDown={(e: React.KeyboardEvent) => handleKeyDown(e, 4)}
              onChange={(v: number) => setFormData({...formData, credit: v})} 
              color="blue" 
            />
            <SpreadsheetInput 
              inputRef={(el: HTMLInputElement | null) => { inputRefs.current[5] = el; }}
              label="04. CARTÃO DÉBITO" 
              value={formData.debit} 
              onKeyDown={(e: React.KeyboardEvent) => handleKeyDown(e, 5)}
              onChange={(v: number) => setFormData({...formData, debit: v})} 
              color="slate" 
            />
            <SpreadsheetInput 
              inputRef={(el: HTMLInputElement | null) => { inputRefs.current[6] = el; }}
              label="05. SANGRIA / RETIRADA" 
              value={formData.sangria} 
              onKeyDown={(e: React.KeyboardEvent) => handleKeyDown(e, 6)}
              onChange={(v: number) => setFormData({...formData, sangria: v})} 
              color="orange" 
            />
          </div>

          <div className="mt-auto pt-4 border-t border-slate-200 flex flex-col gap-3">
            <div className="flex justify-between items-center px-5 py-4 bg-slate-900 rounded-xl border border-slate-800">
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Bruto: {formatMoney(brutoTotal)}</span>
                <span className="text-[11px] font-black text-slate-100 uppercase tracking-tighter">Saldo Líquido</span>
              </div>
              <span className="text-xl font-black text-green-400 font-mono tracking-tighter">
                {formatMoney(liquidoTotal)}
              </span>
            </div>
            <button type="submit" className="w-full h-14 bg-green-600 hover:bg-green-700 text-white font-black uppercase tracking-widest text-[11px] transition-all flex items-center justify-center gap-3 rounded-xl active:scale-95 shadow-none">
              <Save size={18}/> {editingId ? 'Salvar Edição' : 'Concluir Lançamento'}
            </button>
          </div>
        </form>
      </div>

      <div className="flex-1 bg-white border border-slate-200 shadow-sm flex flex-col overflow-hidden rounded-2xl">
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 shrink-0 rounded-t-2xl">
          <div className="flex items-center gap-3 px-2">
            <div className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 shadow-sm">
              <History size={16}/>
            </div>
            <div>
              <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-700">Auditagem de Lançamentos</h3>
              <p className="text-[9px] font-bold text-slate-400 uppercase">Detalhamento multimodal</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex bg-white border border-slate-200 p-1 rounded-lg shadow-sm">
              {(['DIA', 'MES', 'ANO', 'CUSTOM'] as ListFilterType[]).map(f => (
                <button
                  key={f}
                  onClick={() => setFilterType(f)}
                  className={`px-3 py-1.5 rounded text-[9px] font-black uppercase transition-all ${
                    filterType === f ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'
                  }`}
                >
                  {f === 'DIA' ? 'Hoje' : f === 'MES' ? 'Mês' : f === 'ANO' ? 'Ano' : 'Personalizado'}
                </button>
              ))}
            </div>

            {filterType === 'CUSTOM' && (
              <div className="flex items-center gap-2">
                <input type="date" className="h-8 px-2 text-[10px] font-bold border border-slate-300 rounded shadow-sm" value={customRange.start} onChange={e => setCustomRange({...customRange, start: e.target.value})} />
                <ChevronRight size={14} className="text-slate-300"/>
                <input type="date" className="h-8 px-2 text-[10px] font-bold border border-slate-300 rounded shadow-sm" value={customRange.end} onChange={e => setCustomRange({...customRange, end: e.target.value})} />
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full border-collapse min-w-[900px]">
            <thead className="sticky top-0 bg-slate-100 z-10 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-[9px] font-black text-slate-500 uppercase border-r border-slate-200">Data</th>
                <th className="px-3 py-3 text-center text-[9px] font-black text-slate-500 uppercase border-r border-slate-200">Ref</th>
                <th className="px-4 py-3 text-right text-[9px] font-black text-green-700 uppercase border-r border-slate-200">Dinheiro</th>
                <th className="px-4 py-3 text-right text-[9px] font-black text-cyan-700 uppercase border-r border-slate-200">Pix</th>
                <th className="px-4 py-3 text-right text-[9px] font-black text-blue-700 uppercase border-r border-slate-200">Crédito</th>
                <th className="px-4 py-3 text-right text-[9px] font-black text-slate-600 uppercase border-r border-slate-200">Débito</th>
                <th className="px-4 py-3 text-right text-[9px] font-black text-red-600 uppercase border-r border-slate-200">Sangria</th>
                <th className="px-4 py-3 text-right text-[10px] font-black text-slate-900 uppercase bg-slate-200/50">Saldo Final</th>
                <th className="px-3 py-3 text-center text-[9px] font-black text-slate-500 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAndSortedEntries.map((e, idx) => {
                const totalIn = e.cash + e.pix + e.credit + e.debit;
                const saldo = totalIn - (e.sangria || 0);
                const shiftNum = e.shift.split(' ')[1];

                return (
                  <tr key={e.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} hover:bg-green-50/50 transition-colors`}>
                    <td className="px-4 py-2 text-[10px] font-mono font-bold text-slate-800 border-r border-slate-100">{new Date(e.date + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
                    <td className="px-2 py-2 text-center border-r border-slate-100"><span className="text-[9px] font-black text-slate-500 border border-slate-200 px-1.5 py-0.5 rounded uppercase">{shiftNum}</span></td>
                    <td className="px-4 py-2 text-right text-[10px] font-mono font-bold text-green-700 border-r border-slate-100">{formatMoney(e.cash)}</td>
                    <td className="px-4 py-2 text-right text-[10px] font-mono font-bold text-cyan-700 border-r border-slate-100">{formatMoney(e.pix)}</td>
                    <td className="px-4 py-2 text-right text-[10px] font-mono font-bold text-blue-700 border-r border-slate-100">{formatMoney(e.credit)}</td>
                    <td className="px-4 py-2 text-right text-[10px] font-mono font-bold text-slate-700 border-r border-slate-100">{formatMoney(e.debit)}</td>
                    <td className="px-4 py-2 text-right text-[10px] font-mono font-bold text-red-600 border-r border-slate-100">{formatMoney(e.sangria || 0)}</td>
                    <td className="px-4 py-2 text-right text-[11px] font-mono font-black text-slate-900 bg-slate-100/40">{formatMoney(saldo)}</td>
                    <td className="px-3 py-2">
                      <div className="flex justify-center gap-1">
                        <button onClick={() => setDetailEntry(e)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg"><Eye size={13}/></button>
                        <button onClick={() => {setEditingId(e.id); setFormData({...e});}} className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg"><Save size={13}/></button>
                        <button onClick={() => setDeletingId(e.id)} className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg"><X size={13}/></button>
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

const SpreadsheetInput = ({ label, value, onChange, onKeyDown, inputRef, color }: any) => {
  const colorStyles: any = {
    green: 'border-l-green-600 group-focus-within:border-green-600',
    cyan: 'border-l-cyan-500 group-focus-within:border-cyan-500',
    blue: 'border-l-blue-600 group-focus-within:border-blue-600',
    slate: 'border-l-slate-500 group-focus-within:border-slate-500',
    orange: 'border-l-orange-600 group-focus-within:border-orange-600'
  };

  const handleRawChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, ''); 
    const numericValue = parseInt(raw, 10) / 100 || 0;
    onChange(numericValue);
  };

  const displayValue = value.toLocaleString('pt-BR', { minimumFractionDigits: 2 });

  return (
    <div className={`p-3 bg-white border border-slate-200 border-l-4 ${colorStyles[color]} transition-all hover:bg-white shadow-sm rounded-r-xl group focus-within:shadow-md`}>
      <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">{label}</label>
      <div className="relative flex items-baseline">
        <span className="text-xs font-black text-slate-300 mr-2">R$</span>
        <input 
          ref={inputRef}
          type="text" 
          inputMode="numeric"
          className="w-full bg-transparent border-none outline-none font-mono font-black text-2xl text-slate-900 placeholder:text-slate-100" 
          value={displayValue} 
          onKeyDown={onKeyDown}
          onChange={handleRawChange} 
          placeholder="0,00"
        />
      </div>
    </div>
  );
};

const DetailViewModal = ({ entry, onClose }: { entry: CashEntry, onClose: () => void }) => {
  const totalIn = entry.cash + entry.pix + entry.credit + entry.debit;
  const saldoFinal = totalIn - (entry.sangria || 0);

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
        <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-green-500 text-white rounded-xl shadow-lg shadow-green-200">
              <ReceiptText size={20}/>
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight">Recibo de Conferência</h2>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Protocolo BE-{entry.code}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-300 hover:text-slate-800 transition-colors"><X size={20}/></button>
        </div>

        <div className="p-8 space-y-6">
          <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100 shadow-inner">
            <div className="flex flex-col">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Data</span>
              <span className="text-xs font-bold text-slate-800">{new Date(entry.date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
            </div>
            <div className="text-right flex flex-col">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Terminal</span>
              <span className="text-xs font-bold text-slate-800">{entry.shift}</span>
            </div>
          </div>

          <div className="space-y-3">
             <DetailRow label="Cédulas/Espécie" value={entry.cash} color="text-green-700" />
             <DetailRow label="Transferências Pix" value={entry.pix} color="text-cyan-600" />
             <DetailRow label="Cartão de Crédito" value={entry.credit} color="text-blue-700" />
             <DetailRow label="Cartão de Débito" value={entry.debit} color="text-slate-600" />
             <div className="pt-3 border-t border-slate-100 flex justify-between">
                <span className="text-[10px] font-black text-slate-800 uppercase">Faturamento Bruto</span>
                <span className="text-xs font-mono font-black text-slate-900">{formatMoney(totalIn)}</span>
             </div>
          </div>

          {entry.sangria > 0 && (
            <div className="pt-4 border-t border-red-50">
               <div className="flex items-center gap-2 mb-2">
                 <ArrowDownCircle size={14} className="text-red-500"/>
                 <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">Retiradas de Caixa</span>
               </div>
               <DetailRow label="Sangria Manual" value={entry.sangria} color="text-red-600" />
            </div>
          )}

          <div className="mt-6 p-6 bg-slate-900 rounded-2xl flex flex-col items-center shadow-none">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Disponível Líquido</span>
            <span className="text-3xl font-black text-green-400 font-mono tracking-tighter">
              {formatMoney(saldoFinal)}
            </span>
          </div>
        </div>

        <div className="p-4 bg-slate-50 flex justify-center">
           <button onClick={onClose} className="px-12 py-3 bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 transition-all shadow-lg active:scale-95">Concluir Auditoria</button>
        </div>
      </div>
    </div>
  );
};

const DetailRow = ({ label, value, color }: { label: string, value: number, color?: string }) => (
  <div className="flex justify-between items-center text-[11px] font-semibold">
    <span className="text-slate-500">{label}</span>
    <span className={`font-mono ${color || 'text-slate-800'}`}>{formatMoney(value)}</span>
  </div>
);

export default CashEntryForm;
