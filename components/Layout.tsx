
import React, { useState, useEffect } from 'react';
import { ICONS, COLORS } from '../constants';
import { Menu, X, LayoutGrid, Calculator, FileUp, Users, HardDriveDownload, ShieldCheck, CloudDownload, RefreshCw, Settings, Check, AlertCircle } from 'lucide-react';
import { db } from '../services/db';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [showSyncSettings, setShowSyncSettings] = useState(false);
  const [sheetsUrl, setSheetsUrl] = useState('');

  useEffect(() => {
    setSheetsUrl(db.getSheetsUrl() || '');
  }, []);

  const menuItems = [
    { id: 'dashboard', label: 'Resumo GERAL', icon: <LayoutGrid size={20}/> },
    { id: 'entries', label: 'CONTROLE DE CAIXA', icon: <Calculator size={20}/> },
    { id: 'expenses', label: 'CONTAS A PAGAR', icon: ICONS.Expenses },
    { id: 'suppliers', label: 'FORNECEDORES', icon: <Users size={20}/> },
    { id: 'reports', label: 'AUDITORIA', icon: ICONS.Reports },
    { id: 'import', label: 'IMPORTAR DADOS', icon: <FileUp size={20}/> },
  ];

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

  const handleSync = async () => {
    if (!sheetsUrl) {
      setShowSyncSettings(true);
      return;
    }
    setIsSyncing(true);
    setSyncStatus('idle');
    try {
      await db.syncToSheets();
      setSyncStatus('success');
      setTimeout(() => setSyncStatus('idle'), 3000);
    } catch (e) {
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 5000);
    } finally {
      setIsSyncing(false);
    }
  };

  const saveConfig = () => {
    db.setSheetsUrl(sheetsUrl);
    setShowSyncSettings(false);
  };

  return (
    <div className="flex h-screen w-full bg-[#F1F5F9] overflow-hidden font-sans text-slate-800">
      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 w-64 bg-[#1E293B] text-white z-[100] transition-transform duration-300 transform shadow-2xl no-print ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="h-full flex flex-col">
          <div className="p-6 bg-[#0F172A] flex items-center gap-3 border-b border-slate-700">
            <div className="w-10 h-10 rounded bg-green-500 flex items-center justify-center font-black italic text-white shadow-lg">BE</div>
            <div>
              <h1 className="text-sm font-black tracking-tighter uppercase leading-none">Bem Estar</h1>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">SISTEMA DE CAIXA</span>
            </div>
          </div>
          <nav className="flex-1 p-4 space-y-1">
            {menuItems.map((item) => (
              <button key={item.id} onClick={() => { setActiveTab(item.id); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded text-left transition-all ${activeTab === item.id ? 'bg-green-500 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                {item.icon}
                <span className="text-[11px] font-black uppercase tracking-wider">{item.label}</span>
              </button>
            ))}
          </nav>
          <div className="p-4 bg-[#0F172A] border-t border-slate-700 text-[10px] font-bold text-slate-500 flex justify-between uppercase">
            <span>Versão 4.0</span>
            <span className="text-green-500">Cloud Sync Active</span>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-50 no-print shadow-sm">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 text-slate-600"><Menu size={24}/></button>
            <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
              <span className="w-2 h-4 bg-green-500 rounded-full"></span>
              {menuItems.find(i => i.id === activeTab)?.label}
            </h2>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Cloud Sync Control */}
            <div className="flex items-center gap-1">
               <button 
                  onClick={handleSync}
                  disabled={isSyncing}
                  className={`p-2.5 rounded-lg flex items-center gap-2 text-[9px] font-black uppercase tracking-widest transition-all ${
                    syncStatus === 'success' ? 'bg-green-100 text-green-600' :
                    syncStatus === 'error' ? 'bg-red-100 text-red-600' :
                    'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
               >
                 {isSyncing ? <RefreshCw size={14} className="animate-spin"/> : 
                  syncStatus === 'success' ? <Check size={14}/> : 
                  syncStatus === 'error' ? <AlertCircle size={14}/> :
                  <RefreshCw size={14}/>}
                 <span className="hidden md:inline">Sincronizar Nuvem</span>
               </button>
               <button onClick={() => setShowSyncSettings(!showSyncSettings)} className="p-2.5 bg-slate-100 text-slate-400 rounded-lg hover:bg-slate-200 transition-colors">
                  <Settings size={14}/>
               </button>
            </div>

            <div className="h-8 w-px bg-slate-200 mx-1 hidden md:block"></div>

            <button onClick={handleExportFullBackup} className="flex items-center gap-2 px-3 py-2.5 bg-slate-900 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-md">
              <CloudDownload size={14}/>
              <span className="hidden sm:inline">Backup Local</span>
            </button>
          </div>
        </header>

        {/* Sync Settings Popover */}
        {showSyncSettings && (
          <div className="absolute top-16 right-6 w-80 bg-white border border-slate-200 shadow-2xl rounded-2xl p-5 z-[60] animate-in slide-in-from-top-2">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-800 mb-3">Configurar Google Sheets API</h4>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase">URL do App Script</label>
                <input 
                  type="text" 
                  value={sheetsUrl} 
                  onChange={(e) => setSheetsUrl(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-[10px] font-bold outline-none focus:border-blue-500"
                  placeholder="https://script.google.com/macros/s/.../exec"
                />
              </div>
              <button onClick={saveConfig} className="w-full py-2 bg-blue-600 text-white rounded text-[9px] font-black uppercase tracking-widest hover:bg-blue-700">Salvar Endpoint</button>
              <p className="text-[8px] text-slate-400 leading-tight">Certifique-se de que a implantação está como 'Qualquer pessoa' no Google Script.</p>
            </div>
          </div>
        )}

        <main className="flex-1 p-4 lg:p-6 overflow-y-auto bg-[#F1F5F9] print:p-0 custom-scrollbar">
          <div className="min-h-full w-full mx-auto flex flex-col print:block">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
