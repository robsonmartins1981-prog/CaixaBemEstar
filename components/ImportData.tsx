
import React, { useState, useRef, useMemo } from 'react';
import * as XLSX from 'https://esm.sh/xlsx';
import { db } from '../services/db';
import { 
  FileUp, CheckCircle2, AlertCircle, Loader2, Database, 
  Download, FileSpreadsheet, HardDriveDownload, AlertTriangle, X,
  ShieldCheck, ShieldAlert, Info, Trash2
} from 'lucide-react';
import { CashEntry, Expense, ExpenseNature, ExpenseStatus } from '../types';
import ConfirmationModal from './ConfirmationModal';
import { NATURES } from '../constants';

interface ValidationResult {
  row: any;
  isValid: boolean;
  errors: string[];
  data: any;
}

const ImportData: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [importType, setImportType] = useState<'caixa' | 'contas'>('caixa');
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Funções de utilidade para validação
  const parseDate = (val: any): string | null => {
    if (!val) return null;
    if (val instanceof Date) return val.toISOString().split('T')[0];
    const s = String(val).trim();
    // Tenta DD/MM/YYYY
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
      const [d, m, y] = s.split('/');
      return `${y}-${m}-${d}`;
    }
    // Tenta YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    return null;
  };

  const parseNumber = (val: any): number => {
    if (typeof val === 'number') return isFinite(val) ? val : 0;
    const s = String(val || '0')
      .replace('R$', '')
      .replace(/\./g, '')
      .replace(',', '.')
      .trim();
    const n = parseFloat(s);
    return isNaN(n) ? 0 : n;
  };

  const validateRow = (row: any[], type: 'caixa' | 'contas'): ValidationResult => {
    const errors: string[] = [];
    let processedData: any = {};

    if (type === 'caixa') {
      const date = parseDate(row[0]);
      if (!date) errors.push("Data inválida ou ausente");
      
      const shift = String(row[1] || '').toUpperCase();
      const validShift = shift.includes('CAIXA 01') ? 'CAIXA 01 (MANHÃ)' : 
                         shift.includes('CAIXA 02') ? 'CAIXA 02 (TARDE)' : 
                         shift.includes('CAIXA 03') ? 'CAIXA 03 (NOITE)' : 'CAIXA 01 (MANHÃ)';

      processedData = {
        date: date || '',
        shift: validShift,
        cash: parseNumber(row[2]),
        pix: parseNumber(row[3]),
        credit: parseNumber(row[4]),
        debit: parseNumber(row[5]),
        sangria: parseNumber(row[6])
      };
    } else {
      const description = String(row[0] || '').trim();
      if (!description) errors.push("Descrição obrigatória");
      
      const date = parseDate(row[1]);
      if (!date) errors.push("Data de vencimento inválida");

      const nature = (NATURES as unknown as string[]).includes(String(row[3])) ? row[3] : 'Outros';

      processedData = {
        description,
        supplier: String(row[0] || 'Desconhecido'),
        dueDate: date || '',
        value: parseNumber(row[2]),
        nature: nature as ExpenseNature,
        costType: 'Variável',
        status: (String(row[4]).toLowerCase().includes('pag') ? 'Pago' : 'Pendente') as ExpenseStatus
      };
    }

    return {
      row,
      isValid: errors.length === 0,
      errors,
      data: processedData
    };
  };

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
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
        
        const rows = data.slice(1).filter(r => r.length > 0 && r.some(cell => cell !== null && cell !== ''));
        const results = rows.map(r => validateRow(r, importType));
        
        setValidationResults(results);
      } catch (err) {
        setError("Falha crítica ao ler o arquivo. Certifique-se de que não está protegido por senha.");
      } finally {
        setLoading(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const executeImport = () => {
    const validData = validationResults.filter(r => r.isValid);
    if (validData.length === 0) {
      setError("Nenhum dado válido encontrado para importação.");
      return;
    }

    try {
      db.createRestorePoint(); // Backup de segurança antes de importar
      validData.forEach(res => {
        if (importType === 'caixa') {
          db.upsertEntry(res.data);
        } else {
          db.upsertExpense(res.data);
        }
      });

      setSuccess(`Sucesso! ${validData.length} registros foram integrados ao sistema.`);
      setValidationResults([]);
      onSuccess();
    } catch (err) {
      setError("Erro durante a gravação no banco de dados. Operação abortada.");
    }
  };

  const handleExportData = (type: 'caixa' | 'contas') => {
    let headers: string[] = [];
    let rows: any[][] = [];
    if (type === 'caixa') {
      headers = ["Data", "Caixa", "Dinheiro", "Pix", "Credito", "Debito", "Sangria"];
      rows = db.getEntries().map(e => [e.date, e.shift, e.cash, e.pix, e.credit, e.debit, e.sangria]);
    } else {
      headers = ["Descricao", "Vencimento", "Valor", "Categoria", "Status"];
      rows = db.getExpenses().map(e => [e.description, e.dueDate, e.value, e.nature, e.status]);
    }
    
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Dados");
    XLSX.writeFile(wb, `BEM_ESTAR_${type.toUpperCase()}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const stats = useMemo(() => {
    const total = validationResults.length;
    const valid = validationResults.filter(r => r.isValid).length;
    const invalid = total - valid;
    return { total, valid, invalid };
  }, [validationResults]);

  return (
    <div className="flex-1 flex flex-col gap-6 overflow-hidden max-w-6xl mx-auto w-full py-2 px-4 h-full">
      <ConfirmationModal 
        isOpen={isClearModalOpen}
        onClose={() => setIsClearModalOpen(false)}
        onConfirm={() => { db.clearAllData(); window.location.reload(); }}
        title="Formatar Banco de Dados?"
        message="Esta ação apagará absolutamente TODOS os registros salvos. Esta operação não pode ser desfeita."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 shrink-0">
        {/* Bloco de Upload */}
        <div className="lg:col-span-2 bg-white border border-slate-200 p-8 rounded-[2.5rem] shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                <FileSpreadsheet className="text-blue-500" size={24}/> Importação Inteligente
              </h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Validação de esquema em tempo real</p>
            </div>

            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button 
                onClick={() => {setImportType('caixa'); setValidationResults([]);}}
                className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${importType === 'caixa' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
              >
                Movimento Caixa
              </button>
              <button 
                onClick={() => {setImportType('contas'); setValidationResults([]);}}
                className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${importType === 'contas' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
              >
                Contas a Pagar
              </button>
            </div>
          </div>

          <label className="relative group cursor-pointer block">
            <input type="file" ref={fileInputRef} className="hidden" accept=".csv, .xlsx, .xls" onChange={handleFileUpload} />
            <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 transition-all group-hover:border-blue-400 group-hover:bg-blue-50/30">
              <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 group-hover:text-blue-500 transition-all shadow-inner">
                {loading ? <Loader2 size={24} className="animate-spin" /> : <FileUp size={24} />}
              </div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Solte seu arquivo aqui ou clique para buscar</p>
            </div>
          </label>
        </div>

        {/* Bloco de Exportação Rápida */}
        <div className="bg-white border border-slate-200 p-8 rounded-[2.5rem] shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
              <HardDriveDownload className="text-emerald-500" size={24}/> Exportar Excel
            </h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Backup por módulos individuais</p>
          </div>
          
          <div className="space-y-3 mt-6">
            <button onClick={() => handleExportData('caixa')} className="w-full flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-xl hover:bg-slate-100 transition-all group">
              <span className="text-[10px] font-black uppercase text-slate-600">Caixa Completo</span>
              <Download size={16} className="text-slate-300 group-hover:text-emerald-500"/>
            </button>
            <button onClick={() => handleExportData('contas')} className="w-full flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-xl hover:bg-slate-100 transition-all group">
              <span className="text-[10px] font-black uppercase text-slate-600">Contas a Pagar</span>
              <Download size={16} className="text-slate-300 group-hover:text-blue-500"/>
            </button>
          </div>
        </div>
      </div>

      {/* Área de Preview e Validação */}
      {validationResults.length > 0 && (
        <div className="flex-1 bg-white border border-slate-200 rounded-[2.5rem] shadow-xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4">
          <div className="p-6 bg-slate-50 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                <span className="text-[10px] font-black uppercase text-slate-600">{stats.valid} Válidos</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-rose-500 rounded-full"></div>
                <span className="text-[10px] font-black uppercase text-slate-600">{stats.invalid} Erros</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button onClick={() => setValidationResults([])} className="px-6 py-2.5 bg-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-300 transition-all">Descartar</button>
              <button 
                onClick={executeImport}
                disabled={stats.valid === 0}
                className="px-8 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg disabled:opacity-30 flex items-center gap-2"
              >
                <CheckCircle2 size={16}/> Confirmar Importação ({stats.valid})
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto custom-scrollbar">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 bg-slate-100 z-10">
                <tr>
                  <th className="px-6 py-4 text-left text-[9px] font-black text-slate-500 uppercase border-b">Status</th>
                  <th className="px-6 py-4 text-left text-[9px] font-black text-slate-500 uppercase border-b">
                    {importType === 'caixa' ? 'Data / Turno' : 'Descrição'}
                  </th>
                  <th className="px-6 py-4 text-right text-[9px] font-black text-slate-500 uppercase border-b">Valor Principal</th>
                  <th className="px-6 py-4 text-left text-[9px] font-black text-slate-500 uppercase border-b">Diagnóstico</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {validationResults.map((res, i) => (
                  <tr key={i} className={`hover:bg-slate-50/50 transition-colors ${!res.isValid ? 'bg-rose-50/30' : ''}`}>
                    <td className="px-6 py-4">
                      {res.isValid ? (
                        <ShieldCheck className="text-emerald-500" size={18}/>
                      ) : (
                        <ShieldAlert className="text-rose-500" size={18}/>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-[11px] font-black text-slate-800 uppercase">
                        {importType === 'caixa' ? `${res.data.date} | ${res.data.shift.split(' ')[1]}` : res.data.description}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-black text-[11px] text-slate-900">
                      {(res.data.value || res.data.cash || 0).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}
                    </td>
                    <td className="px-6 py-4">
                      {res.errors.length > 0 ? (
                        <div className="flex flex-col gap-1">
                          {res.errors.map((err, ei) => (
                            <span key={ei} className="text-[8px] font-black uppercase text-rose-500 flex items-center gap-1">
                              <AlertCircle size={10}/> {err}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[8px] font-black uppercase text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 size={10}/> Pronto para salvar
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Alertas e Limpeza */}
      {!validationResults.length && (
        <div className="space-y-6 shrink-0 mt-auto">
          {(error || success) && (
            <div className={`p-5 border-2 rounded-2xl flex items-center gap-4 animate-in fade-in zoom-in-95 ${error ? 'bg-rose-50 border-rose-100 text-rose-600' : 'bg-emerald-50 border-emerald-100 text-emerald-600'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${error ? 'bg-rose-100' : 'bg-emerald-100'}`}>
                {error ? <AlertCircle size={20}/> : <ShieldCheck size={20}/>}
              </div>
              <div className="flex-1">
                <p className="text-[11px] font-black uppercase tracking-widest">{error || success}</p>
                <p className="text-[9px] font-bold opacity-70 uppercase">Informação do processador de dados</p>
              </div>
              <button onClick={() => {setError(null); setSuccess(null);}} className="p-2 opacity-50 hover:opacity-100"><X size={18}/></button>
            </div>
          )}

          <div className="p-8 bg-slate-900 text-white rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-6">
               <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center shrink-0 border border-white/10">
                 <AlertTriangle size={32} className="text-yellow-500"/>
               </div>
               <div>
                 <h3 className="text-lg font-black uppercase tracking-tight">Manutenção de Dados</h3>
                 <p className="text-[10px] text-slate-400 font-bold uppercase leading-relaxed max-w-md">
                   Utilize o botão de formatação caso precise limpar o sistema para uma nova migração. Recomendamos exportar o backup JSON completo antes.
                 </p>
               </div>
            </div>
            <button 
              onClick={() => setIsClearModalOpen(true)}
              className="px-10 py-4 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-xl shadow-rose-900/20 active:scale-95 flex items-center gap-2"
            >
              <Trash2 size={18}/> Formatar Sistema
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImportData;
