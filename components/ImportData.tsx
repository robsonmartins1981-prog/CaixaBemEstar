
import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { db } from '../services/db';
import { 
  Download, FileSpreadsheet, HardDriveDownload, 
  CheckCircle2, AlertCircle, X, ArrowRight, Database, Upload
} from 'lucide-react';

const ImportData: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportData = (type: 'caixa' | 'contas') => {
    try {
      setSuccess(null);
      setError(null);
      
      let headers: string[] = [];
      let rows: any[][] = [];
      const fileName = type === 'caixa' ? 'MOVIMENTO_CAIXA' : 'CONTAS_A_PAGAR';
      
      if (type === 'caixa') {
        headers = ["Data", "Turno/Caixa", "Dinheiro (R$)", "Pix (R$)", "Crédito (R$)", "Débito (R$)", "Líquido (R$)"];
        rows = db.getEntries().map(e => [
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
        rows = db.getExpenses().map(e => [
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
        return;
      }

      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      
      // Ajuste automático de largura das colunas
      const wscols = headers.map(h => ({ wch: h.length + 10 }));
      ws['!cols'] = wscols;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Dados");
      XLSX.writeFile(wb, `BEM_ESTAR_${fileName}_${new Date().toISOString().split('T')[0]}.xlsx`);
      
      setSuccess(`Planilha de ${type === 'caixa' ? 'caixa' : 'contas'} gerada com sucesso!`);
    } catch (e) {
      setError("Falha ao gerar o arquivo Excel. Verifique as permissões do navegador.");
    }
  };

  const handleExportBackup = () => {
    try {
      setSuccess(null);
      setError(null);
      const backupData = db.getFullBackup();
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `BEM_ESTAR_BACKUP_COMPLETO_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setSuccess("Backup completo gerado com sucesso! Guarde este arquivo em um local seguro.");
    } catch (e) {
      setError("Falha ao gerar o arquivo de backup.");
    }
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const backupData = JSON.parse(content);
        
        if (!backupData.version || !backupData.data) {
          throw new Error("Formato de arquivo inválido.");
        }

        const success = db.restoreFullBackup(backupData);
        if (success) {
          setSuccess("Backup restaurado com sucesso! Todos os dados foram sincronizados.");
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

  return (
    <div className="flex-1 flex flex-col gap-6 max-w-4xl mx-auto w-full py-10 px-4 h-full animate-in fade-in duration-500 overflow-y-auto custom-scrollbar">
      
      <div className="text-center mb-8">
        <div className="inline-flex p-4 bg-blue-50 rounded-3xl mb-4 text-blue-600 shadow-inner">
          <HardDriveDownload size={40} />
        </div>
        <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">Central de Exportação e Backup</h2>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">Gere planilhas oficiais ou faça backup completo do sistema</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* CARD EXPORT CAIXA */}
        <button 
          onClick={() => handleExportData('caixa')}
          className="group bg-white border border-slate-200 p-8 rounded-[2.5rem] shadow-sm hover:shadow-xl hover:border-blue-300 transition-all text-left flex flex-col justify-between h-64 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <FileSpreadsheet size={120} />
          </div>
          
          <div>
            <div className="w-12 h-12 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform">
              <Download size={24} />
            </div>
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Movimento de Caixa</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase mt-2 leading-relaxed">
              Exporta todos os lançamentos diários, segmentados por dinheiro, pix e cartões.
            </p>
          </div>

          <div className="flex items-center gap-2 text-[10px] font-black text-blue-600 uppercase tracking-widest group-hover:gap-4 transition-all">
            Gerar Excel <ArrowRight size={14} />
          </div>
        </button>

        {/* CARD EXPORT CONTAS */}
        <button 
          onClick={() => handleExportData('contas')}
          className="group bg-white border border-slate-200 p-8 rounded-[2.5rem] shadow-sm hover:shadow-xl hover:border-blue-300 transition-all text-left flex flex-col justify-between h-64 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <FileSpreadsheet size={120} />
          </div>

          <div>
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform">
              <Download size={24} />
            </div>
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Contas a Pagar</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase mt-2 leading-relaxed">
              Relatório detalhado de obrigações, vencimentos, fornecedores e status de pagamento.
            </p>
          </div>

          <div className="flex items-center gap-2 text-[10px] font-black text-blue-600 uppercase tracking-widest group-hover:gap-4 transition-all">
            Gerar Excel <ArrowRight size={14} />
          </div>
        </button>

        {/* CARD BACKUP COMPLETO */}
        <button 
          onClick={handleExportBackup}
          className="group bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] shadow-lg hover:shadow-2xl hover:border-slate-700 transition-all text-left flex flex-col justify-between h-64 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <Database size={120} className="text-white" />
          </div>

          <div>
            <div className="w-12 h-12 bg-white/10 text-white rounded-2xl flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform">
              <Database size={24} />
            </div>
            <h3 className="text-xl font-black text-white uppercase tracking-tight">Backup Completo</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase mt-2 leading-relaxed">
              Salva TUDO: Fornecedores, Contas Pagas/Pendentes, Caixa e Configurações em um arquivo seguro.
            </p>
          </div>

          <div className="flex items-center gap-2 text-[10px] font-black text-white uppercase tracking-widest group-hover:gap-4 transition-all">
            Baixar Backup (.json) <ArrowRight size={14} />
          </div>
        </button>

        {/* CARD RESTAURAR BACKUP */}
        <div className="group bg-white border border-slate-200 p-8 rounded-[2.5rem] shadow-sm hover:shadow-xl hover:border-orange-300 transition-all text-left flex flex-col justify-between h-64 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <Upload size={120} />
          </div>

          <div>
            <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform">
              <Upload size={24} />
            </div>
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Restaurar Backup</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase mt-2 leading-relaxed">
              Importe um arquivo de backup (.json) gerado anteriormente para restaurar todos os seus dados.
            </p>
          </div>

          <label className="cursor-pointer flex items-center gap-2 text-[10px] font-black text-orange-600 uppercase tracking-widest group-hover:gap-4 transition-all">
            Selecionar Arquivo <ArrowRight size={14} />
            <input 
              type="file" 
              accept=".json" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleImportBackup}
            />
          </label>
        </div>
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
