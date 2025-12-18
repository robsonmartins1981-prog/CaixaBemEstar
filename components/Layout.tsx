
import React from 'react';
import { ICONS, COLORS } from '../constants';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Início', icon: ICONS.Dashboard },
    { id: 'entries', label: 'Caixa', icon: ICONS.Entries },
    { id: 'expenses', label: 'Contas', icon: ICONS.Expenses },
    { id: 'reports', label: 'Relatórios', icon: ICONS.Reports },
  ];

  return (
    <div className="flex h-screen bg-[#FBFDFF] overflow-hidden font-sans selection:bg-green-100">
      {/* Sidebar - Fixa e Alinhada */}
      <aside className="w-20 lg:w-72 bg-white border-r border-gray-100 flex flex-col shrink-0 z-50 transition-all duration-300">
        <div className="p-8 pb-12 flex items-center justify-center lg:justify-start gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-subtle shrink-0" style={{ backgroundColor: COLORS.green }}>
            <span className="text-white text-lg font-black italic">BE</span>
          </div>
          <h1 className="hidden lg:block text-xl font-black tracking-tighter" style={{ color: '#8AC926' }}>Bem Estar</h1>
        </div>
        
        <nav className="flex-1 px-4 space-y-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-center lg:justify-start gap-4 px-4 lg:px-6 py-4 rounded-[18px] transition-all duration-300 ${
                activeTab === item.id 
                  ? 'bg-green-50/50 text-green-700 border border-green-100' 
                  : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'
              }`}
            >
              <div className="shrink-0">{item.icon}</div>
              <span className="hidden lg:block text-[11px] font-black uppercase tracking-[0.2em]">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-8 hidden lg:block">
          <div className="bg-gray-50 p-6 rounded-[24px] border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Acesso Seguro</span>
            </div>
            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest leading-relaxed">Admin v2.5</p>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto custom-scrollbar bg-[#F8FAFC]">
        <div className="max-w-[1500px] mx-auto p-8 lg:p-12 xl:p-14">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
