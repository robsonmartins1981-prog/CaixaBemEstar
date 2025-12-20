
import React, { useState, useRef } from 'react';
import * as XLSX from 'https://esm.sh/xlsx';
import { db } from '../services/db';
import { FileUp, CheckCircle2, AlertCircle, FileSpreadsheet, Loader2, Database, Info } from 'lucide-react';
import { CashEntry, Expense, ShiftType, ExpenseCategory, ExpenseStatus } from '../types';

const ImportData: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<any[]>([]);
  const [importType, setImportType] = useState<'caixa' | 'contas'>('caixa');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
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
        
        // Remove cabeçalho e filtra linhas vazias
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

  const executeImport = () => {
    if (preview.length === 0) return;

    try {
      if (importType === 'caixa') {
        preview.forEach(row => {
          const entry: Omit<CashEntry, 'id' | 'code'> = {
            date: row[0] instanceof Date ? row[0].toISOString().split('T')[0] : String(row[0]),
            shift: (`CAIXA ${String(row[1]).padStart(2, '0')} (MANHÃ)`) as any, // Mapeamento básico
            cash: parseFloat(row[2]) || 0,
            pix: parseFloat(row[3]) || 0,
            credit: parseFloat(row[4]) || 0,
            debit: parseFloat(row[5]) || 0,
            sangria: parseFloat(row[6]) || 0
          };
          db.saveEntry({ ...entry, id: db.generateId() } as any);
        });
      } else {
        preview.forEach(row => {
          const expense: Expense = {
            id: db.generateId(),
            description: String(row[0]),
            dueDate: row[1] instanceof Date ? row[1].toISOString().split('T')[0] : String(row[1]),
            value: parseFloat(row[2]) || 0,
            category: (row[3] || 'Outros') as ExpenseCategory,
            status: (row[4] || 'Pendente') as ExpenseStatus
          };
          db.saveExpense(expense);
        });
      }

      setSuccess(`${preview.length} registros importados com sucesso!`);
      setPreview([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      onSuccess();
    } catch (err) {
      setError("Ocorreu um erro durante a gravação dos dados.");
    }
  };

  return (
    <div className="flex-1 flex flex-col gap-6 overflow-hidden max-w-4xl mx-auto w-full py-6">
      <div className="bg-white border border-slate-200 p-8 rounded-2xl shadow-sm space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
              <Database className="text-green-500" size={24}/> Migração de Dados Externa
            </h2>
            <p className="text-xs font-bold text-slate-400 uppercase mt-1">Importe suas planilhas antigas em segundos</p>
          </div>

          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button 
              onClick={() => { setImportType('caixa'); setPreview([]); }}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${importType === 'caixa' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
            >
              Controle de Caixa
            </button>
            <button 
              onClick={() => { setImportType('contas'); setPreview([]); }}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${importType === 'contas' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
            >
              Contas a Pagar
            </button>
          </div>
        </div>

        {/* Dropzone */}
        <label className="relative group cursor-pointer block">
          <input 
            type="file" 
            ref={fileInputRef}
            className="hidden" 
            accept=".csv, .xlsx, .xls"
            onChange={handleFileUpload}
          />
          <div className="border-2 border-dashed border-slate-200 rounded-3xl p-12 flex flex-col items-center justify-center gap-4 transition-all group-hover:border-green-500 group-hover:bg-green-50/30">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 group-hover:text-green-500 group-hover:bg-white transition-all shadow-sm">
              {loading ? <Loader2 size={32} className="animate-spin" /> : <FileUp size={32} />}
            </div>
            <div className="text-center">
              <p className="text-sm font-black text-slate-700 uppercase tracking-widest">Clique ou arraste o arquivo aqui</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase mt-2">Suporta Excel (.xlsx, .xls) ou CSV</p>
            </div>
          </div>
        </label>

        {/* Instruções de Formato */}
        <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-xl flex gap-4">
          <Info className="text-blue-500 shrink-0" size={20}/>
          <div>
            <h4 className="text-[10px] font-black text-blue-800 uppercase tracking-widest mb-1">Padrão de Colunas Esperado (na ordem):</h4>
            <p className="text-[10px] font-bold text-blue-600 leading-relaxed">
              {importType === 'caixa' 
                ? "Data (AAAA-MM-DD); Caixa (01, 02 ou 03); Dinheiro; Pix; Crédito; Débito; Sangria"
                : "Descrição; Vencimento (AAAA-MM-DD); Valor; Categoria; Status (Pago ou Pendente)"}
            </p>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600 animate-in fade-in zoom-in-95">
            <AlertCircle size={20}/>
            <span className="text-[10px] font-black uppercase">{error}</span>
          </div>
        )}

        {success && (
          <div className="p-4 bg-green-50 border border-green-100 rounded-xl flex items-center gap-3 text-green-600 animate-in fade-in zoom-in-95">
            <CheckCircle2 size={20}/>
            <span className="text-[10px] font-black uppercase">{success}</span>
          </div>
        )}

        {/* Preview Table */}
        {preview.length > 0 && (
          <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pré-visualização ({preview.length} linhas detectadas)</h3>
              <button 
                onClick={executeImport}
                className="px-6 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg flex items-center gap-2"
              >
                <CheckCircle2 size={14}/> Confirmar Importação
              </button>
            </div>
            <div className="max-h-60 overflow-auto border border-slate-100 rounded-xl custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="p-3 text-[9px] font-black text-slate-400 uppercase">Col 1</th>
                    <th className="p-3 text-[9px] font-black text-slate-400 uppercase">Col 2</th>
                    <th className="p-3 text-[9px] font-black text-slate-400 uppercase">Col 3</th>
                    <th className="p-3 text-[9px] font-black text-slate-400 uppercase">Col 4</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {preview.slice(0, 10).map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50/50">
                      {row.slice(0, 4).map((cell: any, j: number) => (
                        <td key={j} className="p-3 text-[10px] font-bold text-slate-600 font-mono">
                          {cell instanceof Date ? cell.toLocaleDateString() : String(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {preview.length > 10 && (
                <div className="p-3 text-center bg-slate-50 text-[9px] font-black text-slate-300 uppercase">
                  Exibindo 10 de {preview.length} linhas
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImportData;
