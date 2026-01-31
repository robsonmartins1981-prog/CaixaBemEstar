
import React, { useState, useRef } from 'react';
import { ICONS } from '../constants.tsx';
import { 
  Menu, LayoutGrid, Calculator, FileUp, Users, 
  HardDriveDownload, HardDriveUpload, Database, 
  X, CheckCircle2, AlertTriangle
} from 'lucide-react';
import { db } from '../services/db.ts';
import ConfirmationModal from './ConfirmationModal.tsx';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [pendingBackupData, setPendingBackupData] = useState<any>(null);
  const [toast, setToast] = useState<{type: 'success' | 'error', msg: string} | null>(null);
  
  const restoreInputRef = useRef<HTMLInputElement>(null);

  const menuItems = [
    { id: 'dashboard', label: 'Resumo GERAL', icon: <LayoutGrid size={18}/> },
    { id: 'entries', label: 'CAIXA', icon: <Calculator size={18}/> },
    { id: 'expenses', label: 'CONTAS', icon: ICONS.Expenses },
    { id: 'suppliers', label: 'FORNECEDORES', icon: <Users size={18}/> },
    { id: 'reports', label: 'AUDITORIA', icon: ICONS.Reports },
    { id: 'import', label: 'PLANILHAS', icon: <FileUp size={18}/> },
  ];

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const handleExportBackup = () => {
    try {
      const backup = db.getFullBackup();
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `BEM_ESTAR_FULL_BACKUP_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast('success', 'Backup exportado!');
    } catch (e) {
      showToast('error', 'Erro ao exportar.');
    }
  };

  const handleImportClick = () => {
    restoreInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.data && (json.data.entries || json.data.expenses)) {
          setPendingBackupData(json);
          setIsRestoreModalOpen(true);
        } else {
          showToast('error', 'Arquivo de backup inválido.');
        }
      } catch (err) {
        showToast('error', 'Erro ao ler arquivo JSON.');
      }
    };
    reader.readAsText(file);
    // Limpa o input para permitir selecionar o mesmo arquivo novamente
    e.target.value = '';
  };

  const confirmRestore = () => {
    if (!pendingBackupData) return;
    const success = db.restoreFullBackup(pendingBackupData);
    if (success) {
      showToast('success', 'Backup restaurado!');
      setTimeout(() => window.location.reload(), 1000);
    } else {
      showToast('error', 'Falha na restauração.');
    }
    setIsRestoreModalOpen(false);
  };

  return (
    <div className="flex h-screen w-full bg-[#f1f5f9] overflow-hidden font-sans text-slate-800">
      <input 
        type="file" 
        ref={restoreInputRef} 
        className="hidden" 
        accept=".json" 
        onChange={handleFileChange} 
      />

      {toast && (
        <div className={`fixed top-4 right-4 z-[250] px-4 py-2 rounded-xl shadow-2xl flex items-center gap-2 animate-in slide-in-from-top-4 border ${toast.type === 'success' ? 'bg-green-600 border-green-500 text-white' : 'bg-red-600 border-red-500 text-white'}`}>
          <span className="text-[10px] font-black uppercase tracking-widest">{toast.msg}</span>
        </div>
      )}

      <ConfirmationModal 
        isOpen={isRestoreModalOpen}
        onClose={() => setIsRestoreModalOpen(false)}
        onConfirm={confirmRestore}
        title="Restaurar Dados?"
        message="Esta ação substituirá todos os dados atuais pelos dados do backup. Deseja continuar?"
      />

      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[90] lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside 
        className={`fixed lg:static inset-y-0 left-0 w-56 bg-[#1e293b] text-white z-[100] transition-transform duration-300 transform shadow-2xl no-print ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="h-full flex flex-col">
          <div className="p-4 bg-[#0f172a] flex items-center justify-between border-b border-slate-700">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-green-500 flex items-center justify-center font-black italic text-white text-xs shadow-lg">BE</div>
              <h1 className="text-xs font-black tracking-tighter uppercase leading-none">Bem Estar</h1>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-slate-400"><X size={20}/></button>
          </div>

          <nav className="flex-1 p-2 space-y-1 overflow-y-auto no-scrollbar">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id); setIsSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all ${
                  activeTab === item.id 
                    ? 'bg-green-500 text-white shadow-lg shadow-green-500/20' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {item.icon}
                <span className="text-[9px] font-black uppercase tracking-wider">{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="p-3 bg-slate-900/50 space-y-2">
            <button 
              onClick={handleExportBackup}
              className="w-full py-2 bg-slate-700 hover:bg-slate-600 active:scale-95 rounded-lg text-[9px] font-black uppercase flex items-center justify-center gap-2 transition-all border border-slate-600 shadow-lg"
            >
              <HardDriveDownload size={14}/> Exportar Tudo
            </button>
            <button 
              onClick={handleImportClick}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 active:scale-95 rounded-lg text-[9px] font-black uppercase flex items-center justify-center gap-2 transition-all border border-slate-700"
            >
              <HardDriveUpload size={14}/> Importar Backup
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <header className="h-12 bg-white border-b border-slate-200 flex items-center justify-between px-4 shrink-0 z-50 no-print shadow-sm">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-1.5 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors">
              <Menu size={18}/>
            </button>
            <h2 className="text-[9px] font-black text-slate-500 uppercase tracking-widest border-l-2 border-green-500 pl-2">
              {menuItems.find(i => i.id === activeTab)?.label}
            </h2>
          </div>
          <div className="w-7 h-7 rounded-lg bg-slate-900 flex items-center justify-center text-white shadow-lg">
            <Database size={14}/>
          </div>
        </header>

        <main className="flex-1 p-2 lg:p-3 overflow-hidden bg-[#f1f5f9]">
          <div className="h-full w-full flex flex-col overflow-hidden relative">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
