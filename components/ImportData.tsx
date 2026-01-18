
import React, { useState, useRef } from 'react';
import * as XLSX from 'https://esm.sh/xlsx';
import { db } from '../services/db';
import { 
  FileUp, CheckCircle2, AlertCircle, Loader2, Database, 
  Download, FileSpreadsheet, X, HardDriveDownload, AlertTriangle, ShieldCheck
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
        setError("Erro ao processar arquivo. Verifique se o formato é válido.");
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
        setError("Arquivo de backup inválido.");
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const executeRestore = () => {
    if (!pendingBackup) return;
    try {
      db.restoreFullBackup(pendingBackup);
      setSuccess("Sistema restaurado com sucesso!");
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
          let dateStr = row[0] instanceof Date ? row[0].toISOString().split('T')[0] : String(row[0]).trim();
          db.upsertEntry({
            date: dateStr,
            shift: (String(row[1]).includes('CAIXA') ? row[1] : `CAIXA 01 (MANHÃ)`) as any,
            cash: parseFloat(row[2]) || 0,
            pix: parseFloat(row[3]) || 0,
            credit: parseFloat(row[4]) || 0,
            debit: parseFloat(row[5]) || 0,
            sangria: parseFloat(row[6]) || 0
          });
        });
      } else {
        preview.forEach(row => {
          let dateStr = row[1] instanceof Date ? row[1].toISOString().split('T')[0] : String(row[1]).trim();
          db.upsertExpense({
            description: String(row[0]),
            supplier: String(row[0]),
            dueDate: dateStr,
            value: parseFloat(row[2]) || 0,
            nature: (row[3] || 'Outros') as ExpenseNature,
            costType: 'Variável',
            status: (row[4] || 'Pendente') as ExpenseStatus
          });
        });
      }
      setSuccess(`${preview.length} registros processados!`);
      setPreview([]);
      onSuccess();
    } catch (err) {
      setError("Erro durante a gravação.");
    }
  };

  return (
    <div className="flex-1 flex flex-col gap-6 w-full max-w-5xl mx-auto py-2">
      <ConfirmationModal 
        isOpen={isClearModalOpen}
        onClose={() => setIsClearModalOpen(false)}
        onConfirm={() => { db.clearAllData(); onSuccess(); setIsClearModalOpen(false); setSuccess("Dados limpos."); }}
        title="Apagar Tudo?"
        message="Esta ação é irreversível. Todos os dados serão deletados."
      />

      <ConfirmationModal 
        isOpen={isRestoreModalOpen}
        onClose={() => setIsRestoreModalOpen(false)}
        onConfirm={executeRestore}
        title="Restaurar Banco de Dados?"
        message="O arquivo de backup substituirá todos os dados atuais. Deseja prosseguir?"
      />

      {/* NOVO CARD DE RESTAURAÇÃO DE SEGURANÇA */}
      <div className="bg-white border-2 border-slate-900 p-8 rounded-[32px] shadow-xl flex flex-col md:flex-row items-center gap-8">
        <div className="w-16 h-16 bg-slate-900 text-green-400 rounded-2xl flex items-center justify-center shrink-0 shadow-lg">
          <ShieldCheck size={32}/>
        </div>
        <div className="flex-1 text-center md:text-left">
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Restauração do Sistema</h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Utilize um arquivo .json gerado anteriormente para recuperar seus dados</p>
        </div>
        <label className="px-8 py-4 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all cursor-pointer shadow-lg active:scale-95">
          Carregar Arquivo JSON
          <input type="file" ref={fullBackupInputRef} className="hidden" accept=".json" onChange={handleFullBackupUpload} />
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 p-8 rounded-[32px] shadow-sm space-y-6">
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
            <FileSpreadsheet className="text-blue-500" size={18}/> Importar Planilhas (CSV/XLSX)
          </h2>
          
          <div className="flex bg-slate-100 p-1 rounded-xl">
            {(['caixa', 'contas'] as const).map(t => (
              <button 
                key={t}
                onClick={() => setImportType(t)}
                className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${importType === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
              >
                {t === 'caixa' ? 'Fluxo de Caixa' : 'Contas a Pagar'}
              </button>
            ))}
          </div>

          <label className="group cursor-pointer block">
            <input type="file" ref={fileInputRef} className="hidden" accept=".csv, .xlsx, .xls" onChange={handleFileUpload} />
            <div className="border-2 border-dashed border-slate-200 rounded-2xl p-10 flex flex-col items-center justify-center gap-3 transition-all group-hover:border-blue-400 group-hover:bg-blue-50/50">
              <Download size={24} className="text-slate-300 group-hover:text-blue-500 transition-all"/>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Selecionar Arquivo</p>
            </div>
          </label>

          {preview.length > 0 && (
            <button onClick={executeImport} className="w-full h-12 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-blue-700 transition-all">
              Confirmar Importação ({preview.length})
            </button>
          )}
        </div>

        <div className="bg-slate-100 border border-slate-200 p-8 rounded-[32px] flex flex-col items-center justify-center text-center space-y-4">
          <AlertTriangle size={48} className="text-orange-500"/>
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Zona de Limpeza</h3>
            <p className="text-[9px] font-bold text-slate-500 uppercase mt-2 leading-relaxed">Apague todos os dados locais deste navegador para reiniciar o sistema do zero.</p>
          </div>
          <button onClick={() => setIsClearModalOpen(true)} className="px-6 py-3 bg-red-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-red-700 transition-all active:scale-95 shadow-lg">
            Formatar Banco de Dados
          </button>
        </div>
      </div>

      {error && <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-[10px] font-black uppercase">{error}</div>}
      {success && <div className="p-4 bg-green-50 border border-green-100 rounded-xl text-green-600 text-[10px] font-black uppercase">{success}</div>}
    </div>
  );
};

export default ImportData;
