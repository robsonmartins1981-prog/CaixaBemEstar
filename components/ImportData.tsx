
import React, { useState, useRef } from 'react';
import * as XLSX from 'https://esm.sh/xlsx';
import { db } from '../services/db';
import { 
  FileUp, CheckCircle2, AlertCircle, Loader2, Database, 
  Download, FileSpreadsheet, HardDriveDownload, AlertTriangle, X
} from 'lucide-react';
import { CashEntry, Expense, ExpenseNature, ExpenseStatus } from '../types';
import ConfirmationModal from './ConfirmationModal';

const ImportData: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<any[]>([]);
  const [importType, setImportType] = useState<'caixa' | 'contas'>('caixa');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
        
        const rows = data.slice(1).filter((row: any) => row.length > 0 && row[0] !== undefined);
        setPreview(rows);
      } catch (err) {
        setError("Erro ao processar arquivo. Verifique o formato.");
      } finally {
        setLoading(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const executeImport = () => {
    if (preview.length === 0) return;
    try {
      if (importType === 'caixa') {
        preview.forEach(row => {
          let dateStr = row[0] instanceof Date ? row[0].toISOString().split('T')[0] : String(row[0]).trim();
          if (!dateStr || dateStr === 'undefined') return;

          db.upsertEntry({
            date: dateStr,
            shift: (String(row[1] || '').includes('CAIXA') ? row[1] : `CAIXA ${String(row[1] || '01').padStart(2, '0')} (MANHÃ)`) as any,
            cash: Number(row[2]) || 0,
            pix: Number(row[3]) || 0,
            credit: Number(row[4]) || 0,
            debit: Number(row[5]) || 0,
            sangria: Number(row[6]) || 0
          });
        });
      } else {
        preview.forEach(row => {
          let dateStr = row[1] instanceof Date ? row[1].toISOString().split('T')[0] : String(row[1] || '').trim();
          if (!dateStr || dateStr === 'undefined') return;

          db.upsertExpense({
            description: String(row[0] || 'Importado'),
            supplier: String(row[0] || 'Fornecedor Desconhecido'),
            dueDate: dateStr,
            value: Number(row[2]) || 0,
            nature: (row[3] || 'Outros') as ExpenseNature,
            costType: 'Variável',
            status: (row[4] || 'Pendente') as ExpenseStatus
          });
        });
      }
      setSuccess(`${preview.length} registros sincronizados com segurança!`);
      setPreview([]);
      onSuccess();
    } catch (err) {
      setError("Erro na gravação dos dados. Algumas linhas podem estar malformadas.");
    }
  };

  const handleExportData = (type: 'caixa' | 'contas') => {
    let headers: string[] = [];
    let rows: any[][] = [];
    if (type === 'caixa') {
      headers = ["Data", "Caixa", "Dinheiro", "Pix", "Credito", "Debito", "Sangria"];
      rows = db.getEntries().map(e => [e.date, e.shift, e.cash.toFixed(2), e.pix.toFixed(2), e.credit.toFixed(2), e.debit.toFixed(2), (e.sangria || 0).toFixed(2)]);
    } else {
      headers = ["Descricao", "Vencimento", "Valor", "Categoria", "Status"];
      rows = db.getExpenses().map(e => [e.description, e.dueDate, e.value.toFixed(2), e.nature, e.status]);
    }
    const csvContent = [headers, ...rows].map(e => e.join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `export_${type}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="flex-1 flex flex-col gap-6 overflow-y-auto custom-scrollbar max-w-5xl mx-auto w-full py-4 px-4">
      <ConfirmationModal 
        isOpen={isClearModalOpen}
        onClose={() => setIsClearModalOpen(false)}
        onConfirm={() => { db.clearAllData(); window.location.reload(); }}
        title="Formatar Banco de Dados?"
        message="Esta ação apagará absolutamente TODOS os registros salvos. Esta operação não pode ser desfeita."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 p-8 rounded-[2.5rem] shadow-sm space-y-6">
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                <FileSpreadsheet className="text-blue-500" size={24}/> Importar CSV/Excel
              </h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Sincronização modular por arquivo</p>
            </div>

            <div className="flex bg-slate-100 p-1 rounded-xl w-full">
              <button 
                onClick={() => setImportType('caixa')}
                className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${importType === 'caixa' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
              >
                Movimento Caixa
              </button>
              <button 
                onClick={() => setImportType('contas')}
                className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${importType === 'contas' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
              >
                Contas a Pagar
              </button>
            </div>
          </div>

          <label className="relative group cursor-pointer block">
            <input type="file" ref={fileInputRef} className="hidden" accept=".csv, .xlsx, .xls" onChange={handleFileUpload} />
            <div className="border-2 border-dashed border-slate-200 rounded-2xl p-10 flex flex-col items-center justify-center gap-3 transition-all group-hover:border-blue-400 group-hover:bg-blue-50/30">
              <div className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 group-hover:text-blue-500 transition-all shadow-inner">
                {loading ? <Loader2 size={24} className="animate-spin" /> : <Download size={24} />}
              </div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Selecionar arquivo (.xlsx ou .csv)</p>
            </div>
          </label>

          {preview.length > 0 && (
            <button 
              onClick={executeImport}
              className="w-full h-14 bg-blue-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-200 active:scale-95"
            >
              <CheckCircle2 size={18}/> Iniciar Processamento ({preview.length} linhas)
            </button>
          )}
        </div>

        <div className="bg-white border border-slate-200 p-8 rounded-[2.5rem] shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-slate-100 rounded-2xl text-slate-500">
              <Database size={24}/>
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Exportar Módulos</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Extração em formato CSV (Excel)</p>
            </div>
          </div>

          <div className="space-y-4">
            <button 
              onClick={() => handleExportData('caixa')}
              className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between group hover:bg-slate-100 transition-all"
            >
              <div className="flex items-center gap-3">
                 <div className="p-2 bg-white rounded-lg shadow-sm text-green-600"><HardDriveDownload size={18}/></div>
                 <span className="text-[11px] font-black text-slate-600 uppercase tracking-widest">Extrair Caixa Completo</span>
              </div>
              <ChevronRight size={16} className="text-slate-300"/>
            </button>

            <button 
              onClick={() => handleExportData('contas')}
              className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between group hover:bg-slate-100 transition-all"
            >
              <div className="flex items-center gap-3">
                 <div className="p-2 bg-white rounded-lg shadow-sm text-blue-600"><HardDriveDownload size={18}/></div>
                 <span className="text-[11px] font-black text-slate-600 uppercase tracking-widest">Extrair Contas a Pagar</span>
              </div>
              <ChevronRight size={16} className="text-slate-300"/>
            </button>
          </div>
          
          <div className="p-5 bg-blue-50 rounded-2xl border border-blue-100 flex gap-4">
             <AlertCircle className="text-blue-500 shrink-0" size={20}/>
             <p className="text-[9px] font-bold text-blue-700 uppercase leading-relaxed">
               As funções acima exportam tabelas individuais. Para salvar o sistema completo, utilize o <b>Exportar</b> na barra lateral esquerda.
             </p>
          </div>
        </div>
      </div>

      {(error || success) && (
        <div className={`p-4 border rounded-xl flex items-center gap-3 animate-in fade-in zoom-in-95 ${error ? 'bg-red-50 border-red-100 text-red-600' : 'bg-green-50 border-green-100 text-green-600'}`}>
          {error ? <AlertCircle size={20}/> : <CheckCircle2 size={20}/>}
          <span className="text-[10px] font-black uppercase tracking-widest">{error || success}</span>
          <button onClick={() => {setError(null); setSuccess(null);}} className="ml-auto opacity-50 hover:opacity-100"><X size={16}/></button>
        </div>
      )}

      <div className="mt-4 border-t border-slate-200 pt-8">
        <div className="p-8 bg-red-50/50 border border-red-100 rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-5">
             <div className="w-14 h-14 bg-white text-red-500 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border border-red-50">
               <AlertTriangle size={28}/>
             </div>
             <div>
               <h3 className="text-base font-black text-red-800 uppercase tracking-tight leading-tight">Limpeza Total do Banco</h3>
               <p className="text-[10px] text-red-600/60 font-bold uppercase leading-relaxed max-w-sm">
                 Esta ação apagará todos os dados locais. Recomendamos exportar um backup JSON na barra lateral antes de prosseguir.
               </p>
             </div>
          </div>
          <button 
            onClick={() => setIsClearModalOpen(true)}
            className="px-10 py-4 bg-red-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-xl shadow-red-100 active:scale-95"
          >
            Formatar Banco
          </button>
        </div>
      </div>
    </div>
  );
};

const ChevronRight = ({ className, size }: { className?: string, size?: number }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
);

export default ImportData;
