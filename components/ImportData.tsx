
import React, { useState, useRef } from 'react';
import * as XLSX from 'https://esm.sh/xlsx';
import { db } from '../services/db';
import { 
  FileUp, CheckCircle2, AlertCircle, Loader2, Database, 
  Info, Download, FileSpreadsheet, Share2, Trash2, AlertTriangle, ShieldCheck, HardDriveDownload
} from 'lucide-react';
import { CashEntry, Expense, ShiftType, ExpenseNature, ExpenseStatus } from '../types';
import ConfirmationModal from './ConfirmationModal';

const ImportData: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<any[]>([]);
  const [importType, setImportType] = useState<'caixa' | 'contas'>('caixa');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [pendingBackup, setPendingBackup] = useState<any>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fullBackupInputRef = useRef<HTMLInputElement>(null);

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
        
        const rows = data.slice(1).filter((row: any) => row.length > 0);
        setPreview(rows);
      } catch (err) {
        setError("Erro ao processar arquivo. Verifique se o formato é válido (Excel ou CSV).");
      } finally {
        setLoading(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleFullBackupUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const json = JSON.parse(evt.target?.result as string);
        if (!json.data || !json.version) throw new Error();
        setPendingBackup(json);
        setIsRestoreModalOpen(true);
      } catch (err) {
        setError("Arquivo de backup inválido. Certifique-se de usar o arquivo .json gerado pelo sistema.");
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Limpa para permitir re-upload do mesmo arquivo
  };

  const executeRestore = () => {
    if (!pendingBackup) return;
    try {
      db.restoreFullBackup(pendingBackup);
      setSuccess("Sistema restaurado com sucesso! Todos os dados foram atualizados.");
      onSuccess();
      setPendingBackup(null);
    } catch (err) {
      setError("Falha ao restaurar backup.");
    }
  };

  const executeImport = () => {
    if (preview.length === 0) return;

    try {
      if (importType === 'caixa') {
        preview.forEach(row => {
          let dateStr = "";
          if (row[0] instanceof Date) {
            dateStr = row[0].toISOString().split('T')[0];
          } else {
            dateStr = String(row[0]).trim();
          }

          const entry: Omit<CashEntry, 'id' | 'code'> = {
            date: dateStr,
            shift: (String(row[1]).includes('CAIXA') ? row[1] : `CAIXA ${String(row[1]).padStart(2, '0')} (MANHÃ)`) as any,
            cash: parseFloat(row[2]) || 0,
            pix: parseFloat(row[3]) || 0,
            credit: parseFloat(row[4]) || 0,
            debit: parseFloat(row[5]) || 0,
            sangria: parseFloat(row[6]) || 0
          };
          db.upsertEntry(entry);
        });
      } else {
        preview.forEach(row => {
          let dateStr = "";
          if (row[1] instanceof Date) {
            dateStr = row[1].toISOString().split('T')[0];
          } else {
            dateStr = String(row[1]).trim();
          }

          const expense: Omit<Expense, 'id'> = {
            description: String(row[0]),
            supplier: String(row[0]),
            dueDate: dateStr,
            value: parseFloat(row[2]) || 0,
            nature: (row[3] || 'Outros') as ExpenseNature,
            costType: 'Variável',
            status: (row[4] || 'Pendente') as ExpenseStatus
          };
          db.upsertExpense(expense);
        });
      }

      setSuccess(`${preview.length} registros processados com sucesso!`);
      setPreview([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      onSuccess();
    } catch (err) {
      setError("Ocorreu um erro durante a gravação dos dados.");
    }
  };

  const handleExportFullBackup = () => {
    const backup = db.getFullBackup();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backup, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `backup_total_bem_estar_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleExportData = (type: 'caixa' | 'contas') => {
    let headers: string[] = [];
    let rows: any[][] = [];
    let fileName = "";

    if (type === 'caixa') {
      headers = ["Data", "Caixa", "Dinheiro", "Pix", "Credito", "Debito", "Sangria"];
      const entries = db.getEntries();
      rows = entries.map(e => [
        e.date,
        e.shift,
        e.cash.toFixed(2),
        e.pix.toFixed(2),
        e.credit.toFixed(2),
        e.debit.toFixed(2),
        (e.sangria || 0).toFixed(2)
      ]);
      fileName = `backup_caixa_${new Date().toISOString().split('T')[0]}.csv`;
    } else {
      headers = ["Descricao", "Vencimento", "Valor", "Categoria", "Status"];
      const expenses = db.getExpenses();
      rows = expenses.map(e => [
        e.description,
        e.dueDate,
        e.value.toFixed(2),
        e.nature,
        e.status
      ]);
      fileName = `backup_contas_${new Date().toISOString().split('T')[0]}.csv`;
    }

    const csvContent = [headers, ...rows].map(e => e.join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 flex flex-col gap-6 overflow-y-auto custom-scrollbar max-w-5xl mx-auto w-full py-6 px-4">
      
      <ConfirmationModal 
        isOpen={isClearModalOpen}
        onClose={() => setIsClearModalOpen(false)}
        onConfirm={() => { db.clearAllData(); onSuccess(); setIsClearModalOpen(false); setSuccess("Dados limpos."); }}
        title="Apagar Tudo?"
        message="Esta ação é irreversível. Todos os lançamentos de caixa e contas a pagar serão deletados permanentemente."
      />

      <ConfirmationModal 
        isOpen={isRestoreModalOpen}
        onClose={() => setIsRestoreModalOpen(false)}
        onConfirm={executeRestore}
        title="Confirmar Restauração?"
        message="O backup carregado substituirá todos os dados atuais (Caixa, Despesas e Fornecedores). Deseja continuar?"
      />

      {/* NOVO: BACKUP CONSOLIDADO DO SISTEMA */}
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-[32px] shadow-2xl overflow-hidden relative group">
        <div className="absolute top-0 right-0 p-12 opacity-5 group-hover:opacity-10 transition-opacity">
           <ShieldCheck size={180} className="text-white"/>
        </div>
        
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
           <div className="flex-1 space-y-4 text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-500/20 text-green-400 rounded-full border border-green-500/30 text-[9px] font-black uppercase tracking-widest">
                Segurança Máxima
              </div>
              <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Backup Consolidado</h2>
              <p className="text-sm font-medium text-slate-400 leading-relaxed max-w-md">
                Salve ou restaure <b>todo o sistema</b> de uma só vez (Caixa, Despesas, Fornecedores e Taxas) em um único arquivo inteligente.
              </p>
           </div>

           <div className="flex flex-col gap-3 w-full md:w-auto shrink-0">
              <button 
                onClick={handleExportFullBackup}
                className="w-full md:w-64 h-14 bg-green-500 hover:bg-green-400 text-slate-900 font-black uppercase tracking-widest text-[11px] rounded-2xl flex items-center justify-center gap-3 shadow-xl shadow-green-500/20 transition-all active:scale-95"
              >
                <HardDriveDownload size={20}/> Gerar Backup Geral
              </button>
              
              <label className="w-full md:w-64 h-14 bg-white/10 hover:bg-white/20 border border-white/10 text-white font-black uppercase tracking-widest text-[11px] rounded-2xl flex items-center justify-center gap-3 transition-all cursor-pointer active:scale-95">
                <FileUp size={20}/> Restaurar Sistema
                <input type="file" ref={fullBackupInputRef} className="hidden" accept=".json" onChange={handleFullBackupUpload} />
              </label>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* IMPORTAÇÃO DE PLANILHAS (LEGADO/PLANILHAS) */}
        <div className="bg-white border border-slate-200 p-8 rounded-3xl shadow-sm space-y-6">
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                <FileSpreadsheet className="text-blue-500" size={24}/> Importar Planilha
              </h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Compatível com Excel e CSV</p>
            </div>

            <div className="flex bg-slate-100 p-1 rounded-xl w-full">
              <button 
                onClick={() => setImportType('caixa')}
                className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${importType === 'caixa' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
              >
                Fluxo de Caixa
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
            <div className="border-2 border-dashed border-slate-100 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 transition-all group-hover:border-blue-400 group-hover:bg-blue-50/30">
              <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 group-hover:text-blue-500 transition-all">
                {loading ? <Loader2 size={24} className="animate-spin" /> : <Download size={24} />}
              </div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Clique para carregar</p>
            </div>
          </label>

          {preview.length > 0 && (
            <button 
              onClick={executeImport}
              className="w-full h-12 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
            >
              <CheckCircle2 size={16}/> Sincronizar {preview.length} Registros
            </button>
          )}
        </div>

        {/* BACKUP POR MÓDULO (LEGADO/CONTA) */}
        <div className="bg-white border border-slate-200 p-8 rounded-3xl shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <Database className="text-slate-400" size={24}/>
            <div>
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Arquivos Individuais</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Exportação específica por módulo</p>
            </div>
          </div>

          <div className="space-y-3">
            <button 
              onClick={() => handleExportData('caixa')}
              className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between group hover:bg-slate-100 transition-all"
            >
              <div className="flex items-center gap-3">
                 <div className="p-2 bg-white rounded-lg shadow-sm text-green-600"><HardDriveDownload size={16}/></div>
                 <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Caixa em CSV</span>
              </div>
              <ChevronDown className="text-slate-300 -rotate-90" size={16}/>
            </button>

            <button 
              onClick={() => handleExportData('contas')}
              className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between group hover:bg-slate-100 transition-all"
            >
              <div className="flex items-center gap-3">
                 <div className="p-2 bg-white rounded-lg shadow-sm text-blue-600"><HardDriveDownload size={16}/></div>
                 <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Despesas em CSV</span>
              </div>
              <ChevronDown className="text-slate-300 -rotate-90" size={16}/>
            </button>
          </div>
        </div>
      </div>

      {/* FEEDBACKS */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600 animate-in fade-in zoom-in-95">
          <AlertCircle size={20}/>
          <span className="text-[10px] font-black uppercase">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-400"><X size={16}/></button>
        </div>
      )}
      {success && (
        <div className="p-4 bg-green-50 border border-green-100 rounded-xl flex items-center gap-3 text-green-600 animate-in fade-in zoom-in-95">
          <CheckCircle2 size={20}/>
          <span className="text-[10px] font-black uppercase">{success}</span>
          <button onClick={() => setSuccess(null)} className="ml-auto text-green-400"><X size={16}/></button>
        </div>
      )}

      {/* ZONA DE PERIGO */}
      <div className="mt-8 border-t border-slate-200 pt-8">
        <div className="p-8 bg-red-50/30 border border-red-100 rounded-[32px] flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-5">
             <div className="w-12 h-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center shrink-0">
               <AlertTriangle size={24}/>
             </div>
             <div>
               <h3 className="text-sm font-black text-red-800 uppercase tracking-tight">Formatar Aplicação</h3>
               <p className="text-[10px] text-red-600/60 font-bold uppercase leading-relaxed">Isso apagará permanentemente todos os registros salvos neste navegador.</p>
             </div>
          </div>
          <button 
            onClick={() => setIsClearModalOpen(true)}
            className="px-8 py-3 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-red-100 active:scale-95 shrink-0"
          >
            Limpar Banco de Dados
          </button>
        </div>
      </div>
    </div>
  );
};

const ChevronDown = ({ className, size }: { className?: string, size?: number }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
);

const X = ({ className, size }: { className?: string, size?: number }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
);

export default ImportData;
