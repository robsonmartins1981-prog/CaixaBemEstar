
import React, { useState } from 'react';
import { ICONS, COLORS } from '../constants';
import { Menu, X, LayoutGrid, Calculator, FileUp, Users } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'Resumo GERAL', icon: <LayoutGrid size={20}/> },
    { id: 'entries', label: 'CONTROLE DE CAIXA', icon: <Calculator size={20}/> },
    { id: 'expenses', label: 'CONTAS A PAGAR', icon: ICONS.Expenses },
    { id: 'suppliers', label: 'FORNECEDORES', icon: <Users size={20}/> },
    { id: 'reports', label: 'AUDITORIA', icon: ICONS.Reports },
    { id: 'import', label: 'IMPORTAR DADOS', icon: <FileUp size={20}/> },
  ];

  return (
    <div className="flex h-screen w-full bg-[#F1F5F9] overflow-hidden font-sans text-slate-800">
      {/* Sidebar - no-print */}
      <aside 
        className={`fixed lg:static inset-y-0 left-0 w-64 bg-[#1E293B] text-white z-[100] transition-transform duration-300 transform shadow-2xl no-print ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
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
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id); setIsSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded text-left transition-all ${
                  activeTab === item.id 
                    ? 'bg-green-500 text-white shadow-md' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {item.icon}
                <span className="text-[11px] font-black uppercase tracking-wider">{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="p-4 bg-[#0F172A] border-t border-slate-700">
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase">
              <span>Versão 3.5</span>
              <span className="text-green-500">Online</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Área Principal */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Bar - no-print */}
        <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-50 no-print">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 text-slate-600"><Menu size={24}/></button>
            <h2 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] border-l-4 border-green-500 pl-3">
              Módulo: {menuItems.find(i => i.id === activeTab)?.label}
            </h2>
          </div>
          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-slate-50 border border-slate-100 rounded text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Terminal 01
            </div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 lg:p-6 overflow-hidden bg-[#F1F5F9] print:p-0">
          <div className="h-full w-full mx-auto flex flex-col print:block">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
