
import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { db } from '../services/db';
import { 
  Download, FileSpreadsheet, HardDriveDownload, 
  CheckCircle2, AlertCircle, X, ArrowRight, Database, Upload, Trash2
} from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';

const ImportData: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [pastedJson, setPastedJson] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const saveFile = async (blob: Blob, fileName: string) => {
    // Try File System Access API for desktop "Save As" experience
    if ('showSaveFilePicker' in window) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: fileName,
          types: [{
            description: fileName.endsWith('.xlsx') ? 'Excel Spreadsheet' : 'JSON Backup',
            accept: fileName.endsWith('.xlsx') 
              ? { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] }
              : { 'application/json': ['.json'] }
          }]
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        return true;
      } catch (err) {
        if ((err as Error).name === 'AbortError') return false;
        // Fallback to standard download if user cancels or error occurs
      }
    }

    // Standard download fallback
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
  };

  const handleExportData = async (type: 'caixa' | 'contas') => {
    try {
      setIsExporting(true);
      setSuccess(null);
      setError(null);
      
      let headers: string[] = [];
      let rows: any[][] = [];
      const fileNameBase = type === 'caixa' ? 'MOVIMENTO_CAIXA' : 'CONTAS_A_PAGAR';
      const fileName = `BEM_ESTAR_${fileNameBase}_${new Date().toISOString().split('T')[0]}.xlsx`;
      
      if (type === 'caixa') {
        headers = ["Data", "Turno/Caixa", "Dinheiro (R$)", "Pix (R$)", "Crédito (R$)", "Débito (R$)", "Líquido (R$)"];
        const entries = await db.getEntries();
        rows = entries.map(e => [
          e.date.split('-').reverse().join('/'), 
          e.shift, 
          e.cash, 
          e.pix, 
          e.credit, 
          e.debit, 
          (e.cash + e.pix + e.credit + e.debit)
        ]);
      } else {
        headers = ["Descrição", "Fornecedor", "Vencimento", "Valor (R$)", "Natureza", "Status"];
        const expenses = await db.getExpenses();
        rows = expenses.map(e => [
          e.description, 
          e.supplier, 
          e.dueDate.split('-').reverse().join('/'), 
          e.value, 
          e.nature, 
          e.status
        ]);
      }
      
      if (rows.length === 0) {
        setError(`Não existem dados de ${type === 'caixa' ? 'caixa' : 'contas'} para exportar.`);
        setIsExporting(false);
        return;
      }

      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      const wscols = headers.map(h => ({ wch: h.length + 10 }));
      ws['!cols'] = wscols;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Dados");
      
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      const saved = await saveFile(blob, fileName);
      if (saved) {
        setSuccessMessage(`A planilha de ${type === 'caixa' ? 'caixa' : 'contas'} foi gerada e salva com sucesso.`);
        setIsSuccessModalOpen(true);
      }
    } catch (e) {
      setError("Falha ao gerar o arquivo Excel.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportBackup = async () => {
    try {
      setIsExporting(true);
      setSuccess(null);
      setError(null);
      const backupData = await db.getFullBackup();
      const fileName = `BEM_ESTAR_BACKUP_COMPLETO_${new Date().toISOString().split('T')[0]}.json`;
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      
      const saved = await saveFile(blob, fileName);
      if (saved) {
        setSuccessMessage("Backup completo gerado com sucesso! Seus dados estão protegidos em um arquivo seguro.");
        setIsSuccessModalOpen(true);
      }
    } catch (e) {
      setError("Falha ao gerar o arquivo de backup.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const backupData = JSON.parse(content);
        
        if (!backupData.version || !backupData.data) {
          throw new Error("Formato de arquivo inválido.");
        }

        const success = await db.restoreFullBackup(backupData);
        if (success) {
          setSuccessMessage("Backup restaurado com sucesso! Todos os dados foram sincronizados e estão prontos para uso.");
          setIsSuccessModalOpen(true);
          onSuccess(); // Atualiza a interface
        } else {
          setError("Falha ao restaurar o backup. O arquivo pode estar corrompido.");
        }
      } catch (err) {
        setError("Erro ao ler o arquivo. Certifique-se de que é um arquivo de backup válido (.json).");
      }
      // Limpa o input
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const handlePasteImport = async () => {
    try {
      if (!pastedJson.trim()) return;
      const backupData = JSON.parse(pastedJson);
      
      if (!backupData.version || !backupData.data) {
        throw new Error("Formato de arquivo inválido.");
      }

      const success = await db.restoreFullBackup(backupData);
      if (success) {
        setSuccessMessage("Os dados colados foram processados e restaurados com sucesso no sistema.");
        setIsSuccessModalOpen(true);
        onSuccess();
        setIsPasteModalOpen(false);
        setPastedJson('');
      } else {
        setError("Falha ao restaurar o backup.");
      }
    } catch (err) {
      setError("JSON inválido. Certifique-se de colar o conteúdo completo do backup.");
    }
  };

  return (
    <div className="flex-1 flex flex-col gap-6 max-w-4xl mx-auto w-full py-10 px-4 h-full animate-in fade-in duration-500 overflow-y-auto custom-scrollbar">
      
      <div className="text-center mb-8">
        <div className="inline-flex p-4 bg-blue-50 rounded-3xl mb-4 text-blue-600 shadow-inner">
          <HardDriveDownload size={40} />
        </div>
        <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">Central de Exportação e Backup</h2>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">Gere planilhas oficiais ou faça backup completo do sistema</p>
      </div>

      <ConfirmationModal 
        isOpen={isClearModalOpen}
        onClose={() => setIsClearModalOpen(false)}
        onConfirm={async () => {
          await db.clearAllData();
          setSuccess("Todos os dados foram apagados com sucesso.");
          onSuccess();
          setIsClearModalOpen(false);
          setTimeout(() => window.location.reload(), 1500);
        }}
        title="Apagar TODOS os Dados?"
        message="Esta ação é irreversível. Todos os lançamentos de caixa, contas a pagar, fornecedores e configurações serão removidos permanentemente. Deseja continuar?"
      />

      {isSuccessModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 text-center p-10">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
              <CheckCircle2 size={40} />
            </div>
            <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter mb-2">Operação Concluída!</h3>
            <p className="text-sm font-medium text-slate-500 mb-8 leading-relaxed">
              {successMessage}
            </p>
            <button 
              onClick={() => setIsSuccessModalOpen(false)}
              className="w-full py-4 bg-slate-900 text-white rounded-2xl text-[11px] font-black uppercase shadow-xl hover:bg-slate-800 active:scale-95 transition-all"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {isPasteModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Colar Backup (JSON)</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Cole o conteúdo do seu arquivo de backup abaixo</p>
              </div>
              <button onClick={() => setIsPasteModalOpen(false)} className="p-2 hover:bg-slate-50 rounded-full transition-colors">
                <X size={24} className="text-slate-400" />
              </button>
            </div>
            <div className="p-8">
              <textarea 
                className="w-full h-64 bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-mono text-xs focus:border-blue-500 focus:ring-0 transition-all outline-none"
                placeholder='{ "version": "5.0", "data": { ... } }'
                value={pastedJson}
                onChange={(e) => setPastedJson(e.target.value)}
              />
              <div className="mt-6 flex gap-4">
                <button 
                  onClick={() => setIsPasteModalOpen(false)}
                  className="flex-1 px-6 py-4 bg-slate-100 text-slate-600 rounded-2xl text-[11px] font-black uppercase hover:bg-slate-200 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handlePasteImport}
                  className="flex-[2] px-6 py-4 bg-blue-600 text-white rounded-2xl text-[11px] font-black uppercase shadow-xl hover:bg-blue-700 active:scale-95 transition-all"
                >
                  Processar e Restaurar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {/* CARD EXPORT CAIXA */}
        <button 
          onClick={() => handleExportData('caixa')}
          disabled={isExporting}
          className="group bg-white border border-slate-200 p-4 rounded-2xl shadow-sm hover:shadow-md hover:border-blue-300 transition-all text-left flex flex-col justify-between h-32 relative overflow-hidden disabled:opacity-50"
        >
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <FileSpreadsheet size={48} />
          </div>
          
          <div>
            <div className="w-8 h-8 bg-green-50 text-green-600 rounded-lg flex items-center justify-center mb-2 shadow-sm group-hover:scale-110 transition-transform">
              <Download size={16} />
            </div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Caixa</h3>
            <p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5 leading-tight">
              Excel diário.
            </p>
          </div>

          <div className="flex items-center gap-1.5 text-[8px] font-black text-blue-600 uppercase tracking-widest group-hover:gap-2 transition-all">
            Exportar <ArrowRight size={10} />
          </div>
        </button>

        {/* CARD EXPORT CONTAS */}
        <button 
          onClick={() => handleExportData('contas')}
          disabled={isExporting}
          className="group bg-white border border-slate-200 p-4 rounded-2xl shadow-sm hover:shadow-md hover:border-blue-300 transition-all text-left flex flex-col justify-between h-32 relative overflow-hidden disabled:opacity-50"
        >
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <FileSpreadsheet size={48} />
          </div>

          <div>
            <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center mb-2 shadow-sm group-hover:scale-110 transition-transform">
              <Download size={16} />
            </div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Contas</h3>
            <p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5 leading-tight">
              Relatório Excel.
            </p>
          </div>

          <div className="flex items-center gap-1.5 text-[8px] font-black text-blue-600 uppercase tracking-widest group-hover:gap-2 transition-all">
            Exportar <ArrowRight size={10} />
          </div>
        </button>

        {/* CARD BACKUP COMPLETO */}
        <button 
          onClick={handleExportBackup}
          disabled={isExporting}
          className="group bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-lg hover:shadow-xl hover:border-slate-700 transition-all text-left flex flex-col justify-between h-32 relative overflow-hidden disabled:opacity-50"
        >
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Database size={48} className="text-white" />
          </div>

          <div>
            <div className="w-8 h-8 bg-white/10 text-white rounded-lg flex items-center justify-center mb-2 shadow-sm group-hover:scale-110 transition-transform">
              <Database size={16} />
            </div>
            <h3 className="text-sm font-black text-white uppercase tracking-tight">Backup</h3>
            <p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5 leading-tight text-white/60">
              TUDO em JSON.
            </p>
          </div>

          <div className="flex items-center gap-1.5 text-[8px] font-black text-white uppercase tracking-widest group-hover:gap-2 transition-all">
            Baixar <ArrowRight size={10} />
          </div>
        </button>

        {/* CARD RESTAURAR BACKUP */}
        <div className="group bg-white border border-slate-200 p-4 rounded-2xl shadow-sm hover:shadow-md hover:border-orange-300 transition-all text-left flex flex-col justify-between h-32 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Upload size={48} />
          </div>

          <div>
            <div className="w-8 h-8 bg-orange-50 text-orange-600 rounded-lg flex items-center justify-center mb-2 shadow-sm group-hover:scale-110 transition-transform">
              <Upload size={16} />
            </div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Restaurar</h3>
            <p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5 leading-tight">
              Importar JSON.
            </p>
          </div>

          <div className="flex flex-col gap-1">
            <label className="cursor-pointer flex items-center gap-1.5 text-[8px] font-black text-orange-600 uppercase tracking-widest group-hover:gap-2 transition-all">
              Arquivo <ArrowRight size={10} />
              <input 
                type="file" 
                accept=".json" 
                className="hidden" 
                ref={fileInputRef}
                onChange={handleImportBackup}
              />
            </label>
            
            <button 
              onClick={() => setIsPasteModalOpen(true)}
              className="flex items-center gap-1.5 text-[7px] font-bold text-slate-400 uppercase hover:text-blue-600 transition-colors"
            >
              Colar <ArrowRight size={8} />
            </button>
          </div>
        </div>

        {/* CARD LIMPAR DADOS */}
        <button 
          onClick={() => setIsClearModalOpen(true)}
          className="group bg-rose-50 border border-rose-100 p-4 rounded-2xl shadow-sm hover:shadow-md hover:border-rose-300 transition-all text-left flex flex-col justify-between h-32 relative overflow-hidden md:col-span-2"
        >
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Trash2 size={48} className="text-rose-600" />
          </div>

          <div>
            <div className="w-8 h-8 bg-rose-100 text-rose-600 rounded-lg flex items-center justify-center mb-2 shadow-sm group-hover:scale-110 transition-transform">
              <Trash2 size={16} />
            </div>
            <h3 className="text-sm font-black text-rose-800 uppercase tracking-tight">Limpar</h3>
            <p className="text-[8px] font-bold text-rose-400 uppercase mt-0.5 leading-tight">
              Apaga tudo.
            </p>
          </div>

          <div className="flex items-center gap-1.5 text-[8px] font-black text-rose-600 uppercase tracking-widest group-hover:gap-2 transition-all">
            Resetar <ArrowRight size={10} />
          </div>
        </button>
      </div>

      {/* FEEDBACK FEED */}
      <div className="mt-auto space-y-4 pt-6">
        {(error || success) && (
          <div className={`p-5 border-2 rounded-2xl flex items-center gap-4 animate-in slide-in-from-bottom-4 ${error ? 'bg-rose-50 border-rose-100 text-rose-600' : 'bg-emerald-50 border-emerald-100 text-emerald-600'}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${error ? 'bg-rose-100' : 'bg-emerald-100'}`}>
              {error ? <AlertCircle size={20}/> : <CheckCircle2 size={20}/>}
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-black uppercase tracking-widest">{error || success}</p>
            </div>
            <button onClick={() => {setError(null); setSuccess(null);}} className="p-2 opacity-50 hover:opacity-100"><X size={18}/></button>
          </div>
        )}

        <div className="bg-slate-900 rounded-[2rem] p-6 flex items-center gap-4 text-white shadow-2xl">
          <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center shrink-0">
            <FileSpreadsheet size={20} className="text-blue-400"/>
          </div>
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Dica de Gestão</p>
            <p className="text-[11px] font-medium text-slate-300">
              Exporte seus dados semanalmente e mantenha um backup físico em seu computador para maior segurança.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportData;
