
import React, { useState } from 'react';
import { ICONS } from '../constants';
import { 
  Menu, LayoutGrid, Calculator, FileUp, Users, 
  HardDriveDownload, FileUp as FileUpIcon, Database, 
  CheckCircle2, AlertCircle, Shield
} from 'lucide-react';
import { db } from '../services/db';
import ConfirmationModal from './ConfirmationModal';

interface LayoutProps {
  children: React.愈Node;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [pendingBackup, setPendingBackup] = useState<any>(null);
  const [toast, setToast] = useState<{type: 'success' | 'error', msg: string} | null>(null);

  const menuItems = [
    { id: 'dashboard', label: 'Resumo GERAL', icon: <LayoutGrid size={20}/> },
    { id: 'entries', label: 'CONTROLE DE CAIXA', icon: <Calculator size={20}/> },
    { id: 'expenses', label: 'CONTAS A PAGAR', icon: ICONS.Expenses },
    { id: 'suppliers', label: 'FORNECEDORES', icon: <Users size={20}/> },
    { id: 'reports', label: 'AUDITORIA', icon: ICONS.Reports },
    { id: 'import', label: 'IMPORTAR PLANILHAS', icon: <FileUp size={20}/> },
  ];

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const executeRestore = () => {
    if (!pendingBackup) return;
    const success = db.restoreFullBackup(pendingBackup);
    if (success) {
      window.location.reload();
    } else {
      showToast('error', 'Dados do backup corrompidos.');
    }
  };

  const handleExportFullBackup = () => {
    const backup = db.getFullBackup();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backup, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `BEM_ESTAR_BACKUP_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    showToast('success', 'Backup exportado com sucesso!');
  };

  const handleFullBackupUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const json = JSON.parse(evt.target?.result as string);
        if (json && json.data) {
          setPendingBackup(json);
          setIsRestoreModalOpen(true);
        } else {
          showToast('error', 'Arquivo de backup inválido.');
        }
      } catch (err) { showToast('error', 'Arquivo não é um JSON válido.'); }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="flex h-screen w-full bg-[#F1F5F9] overflow-hidden font-sans text-slate-800">
      {toast && (
        <div className={`fixed top-6 right-6 z-[200] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4 border ${toast.type === 'success' ? 'bg-green-600 border-green-500 text-white' : 'bg-red-600 border-red-500 text-white'}`}>
          {toast.type === 'success' ? <CheckCircle2 size={18}/> : <AlertCircle size={18}/>}
          <span className="text-xs font-black uppercase tracking-widest">{toast.msg}</span>
        </div>
      )}

      <ConfirmationModal 
        isOpen={isRestoreModalOpen}
        onClose={() => setIsRestoreModalOpen(false)}
        onConfirm={executeRestore}
        title="Restaurar Backup?"
        message="Os dados locais atuais serão substituídos pelos dados do arquivo. Recomendamos baixar um backup do estado atual antes de prosseguir."
      />

      <aside 
        className={`fixed lg:static inset-y-0 left-0 w-72 bg-[#1E293B] text-white z-[100] transition-transform duration-300 transform shadow-2xl no-print ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="h-full flex flex-col relative">
          <div className="p-6 bg-[#0F172A] flex items-center gap-3 border-b border-slate-700">
            <div className="w-10 h-10 rounded bg-green-500 flex items-center justify-center font-black italic text-white shadow-lg">BE</div>
            <div>
              <h1 className="text-sm font-black tracking-tighter uppercase leading-none">Bem Estar</h1>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">SISTEMA</span>
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 px-4 text-center">Navegação Principal</p>
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id); setIsSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${
                  activeTab === item.id 
                    ? 'bg-green-500 text-white shadow-lg shadow-green-500/20' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {item.icon}
                <span className="text-[11px] font-black uppercase tracking-wider">{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="p-4 bg-slate-900/50 border-t border-slate-700/50">
            <div className="bg-slate-800/80 rounded-2xl p-4 border border-slate-700 shadow-inner">
              <div className="flex items-center gap-2 mb-3">
                <Shield size={14} className="text-blue-400"/>
                <span className="text-[9px] font-black text-white uppercase tracking-widest">Segurança Local</span>
              </div>
              
              <div className="flex flex-col gap-2">
                <button 
                  onClick={handleExportFullBackup}
                  className="w-full py-2.5 bg-slate-700 hover:bg-slate-600 rounded-xl transition-all border border-slate-600 flex items-center justify-center gap-2 active:scale-95 group"
                >
                  <HardDriveDownload size={14} className="text-slate-300 group-hover:translate-y-0.5 transition-transform"/>
                  <span className="text-[9px] font-black uppercase text-white">Exportar JSON</span>
                </button>
                
                <label className="w-full py-2.5 bg-blue-600/10 hover:bg-blue-600/20 rounded-xl transition-all border border-blue-500/30 flex items-center justify-center gap-2 cursor-pointer active:scale-95 group">
                  <FileUpIcon size={14} className="text-blue-400 group-hover:-translate-y-0.5 transition-transform"/>
                  <span className="text-[9px] font-black uppercase text-blue-400">Restaurar</span>
                  <input type="file" className="hidden" accept=".json" onChange={handleFullBackupUpload} />
                </label>
              </div>

              <div className="mt-3 text-center">
                <span className="text-[7px] text-slate-500 font-bold uppercase tracking-widest">
                  Backup Manual via Disco Local
                </span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-50 no-print shadow-sm">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"><Menu size={24}/></button>
            <h2 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] border-l-4 border-green-500 pl-3">
              Módulo: {menuItems.find(i => i.id === activeTab)?.label}
            </h2>
          </div>
          <div className="flex items-center gap-3">
             <div className="hidden sm:flex flex-col items-end">
               <span className="text-[8px] font-black text-slate-400 uppercase leading-none">Motor de Dados</span>
               <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-1">
                 <div className="w-1 h-1 bg-blue-500 rounded-full"></div> Local Offline
               </span>
             </div>
             <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-lg">
               <Database size={18}/>
             </div>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6 overflow-hidden bg-[#F1F5F9] print:p-0">
          <div className="h-full w-full mx-auto flex flex-col print:block overflow-hidden relative">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
