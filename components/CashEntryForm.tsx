
import React, { useState, useMemo } from 'react';
import { CashEntry, ShiftType } from '../types';
import { db } from '../services/db';
import { COLORS, SHIFTS } from '../constants';
import { Save, Calculator, History, Filter, Calendar, ChevronRight, Eye, X, ReceiptText, ArrowDownCircle } from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';

interface CashEntryFormProps {
  onSuccess: () => void;
  entries: CashEntry[];
}

type ListFilterType = 'DIA' | 'MES' | 'ANO' | 'CUSTOM';

const CashEntryForm: React.FC<CashEntryFormProps> = ({ onSuccess, entries }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [detailEntry, setDetailEntry] = useState<CashEntry | null>(null);
  
  // Estados de Filtro da Grade
  const [filterType, setFilterType] = useState<ListFilterType>('MES');
  const [customRange, setCustomRange] = useState({ start: '', end: '' });

  const [formData, setFormData] = useState<Omit<CashEntry, 'id' | 'code'>>({
    date: new Date().toISOString().split('T')[0],
    shift: 'CAIXA 01 (MANHÃ)',
    cash: 0,
    credit: 0,
    debit: 0,
    pix: 0,
    sangria: 0,
  });

  // Lógica de Filtragem e Ordenação Rigorosa
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

    const shiftOrder: Record<string, number> = {
      'CAIXA 01 (MANHÃ)': 1,
      'CAIXA 02 (TARDE)': 2,
      'CAIXA 03 (NOITE)': 3
    };

    return [...filtered].sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date); // Mais recentes primeiro
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
        message="Confirma a remoção deste lançamento?"
      />

      {/* MODAL DE DETALHES */}
      {detailEntry && (
        <DetailViewModal entry={detailEntry} onClose={() => setDetailEntry(null)} />
      )}

      {/* PAINEL DE INSERÇÃO (ESQUERDA) */}
      <div className="lg:w-[400px] bg-white border border-slate-200 shadow-sm flex flex-col h-full shrink-0">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calculator size={18} className="text-green-600"/>
            <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-600">Entrada de Dados</h3>
          </div>
          {editingId && (
            <button onClick={() => {setEditingId(null); setFormData({...formData, cash: 0, credit: 0, debit: 0, pix: 0, sangria: 0});}} className="text-[9px] font-black text-red-500 uppercase underline">Cancelar Edição</button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="flex-1 p-6 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase">Data Movimento</label>
              <input type="date" className="w-full h-10 px-3 bg-slate-50 border border-slate-200 text-xs font-bold focus:bg-white outline-none" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase">Turno / Operador</label>
              <select className="w-full h-10 px-3 bg-slate-50 border border-slate-200 text-[9px] font-black uppercase focus:bg-white outline-none" value={formData.shift} onChange={e => setFormData({...formData, shift: e.target.value as ShiftType})}>
                {SHIFTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <SpreadsheetInput label="01. DINHEIRO" value={formData.cash} onChange={v => setFormData({...formData, cash: v})} color="green" />
            <SpreadsheetInput label="02. PIX" value={formData.pix} onChange={v => setFormData({...formData, pix: v})} color="cyan" />
            <SpreadsheetInput label="03. CRÉDITO" value={formData.credit} onChange={v => setFormData({...formData, credit: v})} color="blue" />
            <SpreadsheetInput label="04. DÉBITO" value={formData.debit} onChange={v => setFormData({...formData, debit: v})} color="slate" />
            <SpreadsheetInput label="05. SANGRIA" value={formData.sangria} onChange={v => setFormData({...formData, sangria: v})} color="orange" />
          </div>

          <div className="mt-auto pt-4 border-t border-slate-100 flex flex-col gap-3">
            <div className="flex justify-between items-center px-4 py-3 bg-slate-900 rounded shadow-inner">
              <div className="flex flex-col">
                <span className="text-[8px] font-black text-slate-500 uppercase">Bruto: R$ {brutoTotal.toFixed(2)}</span>
                <span className="text-[10px] font-black text-slate-400 uppercase">Saldo Líquido</span>
              </div>
              <span className="text-lg font-black text-green-400 font-mono">
                R$ {liquidoTotal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
              </span>
            </div>
            <button type="submit" className="w-full h-12 bg-green-500 hover:bg-green-600 text-white font-black uppercase tracking-widest text-[10px] shadow-lg transition-all flex items-center justify-center gap-3">
              <Save size={16}/> {editingId ? 'Salvar Alteração' : 'Registrar Movimento'}
            </button>
          </div>
        </form>
      </div>

      {/* GRADE DE PLANILHA (DIREITA) */}
      <div className="flex-1 bg-white border border-slate-200 shadow-sm flex flex-col overflow-hidden">
        {/* BARRA DE FILTROS DA GRADE */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white border border-slate-200 rounded-lg text-slate-400">
              <History size={16}/>
            </div>
            <div>
              <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-700">Registros Recentes</h3>
              <p className="text-[9px] font-bold text-slate-400 uppercase">Detalhamento Completo por Modalidade</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex bg-white border border-slate-200 p-1 rounded-lg shadow-sm">
              {(['DIA', 'MES', 'ANO', 'CUSTOM'] as ListFilterType[]).map(f => (
                <button
                  key={f}
                  onClick={() => setFilterType(f)}
                  className={`px-3 py-1.5 rounded text-[9px] font-black uppercase transition-all ${
                    filterType === f ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
                  }`}
                >
                  {f === 'DIA' ? 'Hoje' : f === 'MES' ? 'Mês' : f === 'ANO' ? 'Ano' : 'Intervalo'}
                </button>
              ))}
            </div>

            {filterType === 'CUSTOM' && (
              <div className="flex items-center gap-2 animate-in slide-in-from-right-2 duration-300">
                <input 
                  type="date" 
                  className="h-8 px-2 text-[10px] font-bold border border-slate-200 rounded outline-none" 
                  value={customRange.start} 
                  onChange={e => setCustomRange({...customRange, start: e.target.value})}
                />
                <ChevronRight size={14} className="text-slate-300"/>
                <input 
                  type="date" 
                  className="h-8 px-2 text-[10px] font-bold border border-slate-200 rounded outline-none" 
                  value={customRange.end} 
                  onChange={e => setCustomRange({...customRange, end: e.target.value})}
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full border-collapse min-w-[900px]">
            <thead className="sticky top-0 bg-slate-100 z-10">
              <tr className="border-b border-slate-200">
                <th className="px-3 py-3 text-left text-[9px] font-black text-slate-500 uppercase border-r border-slate-200">Data</th>
                <th className="px-2 py-3 text-center text-[9px] font-black text-slate-500 uppercase border-r border-slate-200">Caixa</th>
                <th className="px-3 py-3 text-right text-[9px] font-black text-green-600 uppercase border-r border-slate-200">Dinheiro</th>
                <th className="px-3 py-3 text-right text-[9px] font-black text-cyan-600 uppercase border-r border-slate-200">Pix</th>
                <th className="px-3 py-3 text-right text-[9px] font-black text-blue-600 uppercase border-r border-slate-200">Crédito</th>
                <th className="px-3 py-3 text-right text-[9px] font-black text-slate-500 uppercase border-r border-slate-200">Débito</th>
                <th className="px-3 py-3 text-right text-[9px] font-black text-red-500 uppercase border-r border-slate-200">Sangria</th>
                <th className="px-3 py-3 text-right text-[10px] font-black text-slate-900 uppercase border-r border-slate-200 bg-slate-200/50">Saldo Total</th>
                <th className="px-3 py-3 text-center text-[9px] font-black text-slate-500 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAndSortedEntries.map((e, idx) => {
                const totalIn = e.cash + e.pix + e.credit + e.debit;
                const saldo = totalIn - (e.sangria || 0);
                const shiftNum = e.shift.split(' ')[1]; // Extrai "01", "02" ou "03"

                return (
                  <tr key={e.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} hover:bg-green-50/50 transition-colors`}>
                    <td className="px-3 py-2 text-[10px] font-mono font-bold text-slate-700 border-r border-slate-100 whitespace-nowrap">
                      {new Date(e.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-2 py-2 text-center border-r border-slate-100">
                       <span className="text-[10px] font-black text-slate-600 bg-slate-200 px-1.5 py-0.5 rounded">{shiftNum}</span>
                    </td>
                    <td className="px-3 py-2 text-right text-[10px] font-mono font-bold text-green-600 border-r border-slate-100">R$ {e.cash.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right text-[10px] font-mono font-bold text-cyan-600 border-r border-slate-100">R$ {e.pix.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right text-[10px] font-mono font-bold text-blue-600 border-r border-slate-100">R$ {e.credit.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right text-[10px] font-mono font-bold text-slate-500 border-r border-slate-100">R$ {e.debit.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right text-[10px] font-mono font-bold text-red-500 border-r border-slate-100">R$ {(e.sangria || 0).toFixed(2)}</td>
                    <td className="px-3 py-2 text-right text-[11px] font-mono font-black text-slate-900 border-r border-slate-100 bg-slate-100/30">R$ {saldo.toFixed(2)}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="flex justify-center gap-1">
                        <button onClick={() => setDetailEntry(e)} className="p-1.5 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded" title="Ver Detalhes"><Eye size={13}/></button>
                        <button onClick={() => {setEditingId(e.id); setFormData({...e});}} className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-slate-50 rounded" title="Editar"><Save size={13}/></button>
                        <button onClick={() => setDeletingId(e.id)} className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded" title="Excluir"><X size={13}/></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredAndSortedEntries.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-20 text-center opacity-20">
                    <Filter size={40} className="mx-auto mb-2"/>
                    <span className="text-[10px] font-black uppercase tracking-widest">Nenhum registro</span>
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

const SpreadsheetInput = ({ label, value, onChange, color }: any) => {
  const colorBorders: any = {
    green: 'border-l-green-500',
    cyan: 'border-l-cyan-500',
    blue: 'border-l-blue-500',
    slate: 'border-l-slate-400',
    orange: 'border-l-orange-500'
  };

  return (
    <div className={`p-2 bg-slate-50 border border-slate-200 border-l-4 ${colorBorders[color]} transition-all hover:bg-white group`}>
      <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5 group-hover:text-slate-600">{label}</label>
      <div className="relative flex items-center">
        <span className="text-[10px] font-black text-slate-300 mr-2">R$</span>
        <input 
          type="number" 
          step="0.01" 
          className="w-full bg-transparent border-none outline-none font-mono font-black text-sm text-slate-700 placeholder:opacity-20" 
          value={value || ''} 
          onChange={e => onChange(parseFloat(e.target.value) || 0)} 
          placeholder="0,00"
        />
      </div>
    </div>
  );
};

const DetailViewModal = ({ entry, onClose }: { entry: CashEntry, onClose: () => void }) => {
  const totalEntradas = entry.cash + entry.pix + entry.credit + entry.debit;
  const saldoFinal = totalEntradas - (entry.sangria || 0);

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
        <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 text-green-600 rounded-lg">
              <ReceiptText size={20}/>
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight">Detalhamento de Movimento</h2>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Protocolo: #{entry.id.substring(0,8).toUpperCase()}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-300 hover:text-slate-600 transition-colors"><X size={20}/></button>
        </div>

        <div className="p-8 space-y-6">
          <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-100">
            <div>
              <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">Data do Registro</span>
              <span className="text-sm font-bold text-slate-700">{new Date(entry.date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
            </div>
            <div className="text-right">
              <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">Turno / Terminal</span>
              <span className="text-sm font-bold text-slate-700">{entry.shift}</span>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Composição de Receita</h3>
            
            <DetailRow label="01. Dinheiro em Espécie" value={entry.cash} color="text-green-600" />
            <DetailRow label="02. Transferências PIX" value={entry.pix} color="text-cyan-600" />
            <DetailRow label="03. Cartão de Crédito" value={entry.credit} color="text-blue-600" />
            <DetailRow label="04. Cartão de Débito" value={entry.debit} color="text-slate-500" />
            
            <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
              <span className="text-[10px] font-black text-slate-800 uppercase">Total Bruto Entradas</span>
              <span className="text-sm font-black text-slate-900 font-mono">R$ {totalEntradas.toFixed(2)}</span>
            </div>
          </div>

          {entry.sangria > 0 && (
            <div className="space-y-3 pt-2">
              <h3 className="text-[10px] font-black text-red-400 uppercase tracking-widest border-b border-red-50 pb-2 flex items-center gap-2">
                <ArrowDownCircle size={12}/> Sangrias e Retiradas
              </h3>
              <DetailRow label="Retiradas Manuais / Sangria" value={entry.sangria} color="text-red-600 font-bold" />
            </div>
          )}

          <div className="mt-4 p-5 bg-green-50 rounded-2xl border border-green-100 flex flex-col items-center">
            <span className="text-[9px] font-black text-green-600 uppercase tracking-widest mb-1">Saldo Líquido em Caixa</span>
            <span className="text-3xl font-black text-green-700 font-mono tracking-tighter">
              R$ {saldoFinal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
            </span>
          </div>
        </div>

        <div className="p-4 bg-slate-50 flex justify-center">
           <button onClick={onClose} className="px-10 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all">Fechar Detalhes</button>
        </div>
      </div>
    </div>
  );
};

const DetailRow = ({ label, value, color }: { label: string, value: number, color?: string }) => (
  <div className="flex justify-between items-center text-[11px]">
    <span className="text-slate-500 font-medium">{label}</span>
    <span className={`font-mono font-bold ${color || 'text-slate-700'}`}>R$ {value.toFixed(2)}</span>
  </div>
);

export default CashEntryForm;
