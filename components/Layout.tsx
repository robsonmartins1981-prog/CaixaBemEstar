
import React from 'react';
import { ICONS, COLORS } from '../constants';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: ICONS.Dashboard },
    { id: 'entries', label: 'Movimento', icon: ICONS.Entries },
    { id: 'expenses', label: 'Contas', icon: ICONS.Expenses },
    { id: 'reports', label: 'Relatórios', icon: ICONS.Reports },
  ];

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden font-sans selection:bg-green-100">
      {/* Sidebar Compacta para ganhar espaço horizontal */}
      <aside className="w-20 lg:w-64 bg-white border-r border-gray-100 flex flex-col shrink-0 z-50">
        <div className="p-6 pb-10 flex items-center justify-center lg:justify-start gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-subtle shrink-0" style={{ backgroundColor: COLORS.green }}>
            <span className="text-white text-base font-black italic">BE</span>
          </div>
          <div className="hidden lg:block">
            <h1 className="text-lg font-black tracking-tighter leading-none text-green-600">Bem Estar</h1>
          </div>
        </div>
        
        <nav className="flex-1 px-4 space-y-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-center lg:justify-start gap-4 px-4 py-4 rounded-2xl transition-all duration-200 ${
                activeTab === item.id 
                  ? 'bg-green-50 text-green-700 border border-green-100' 
                  : 'text-gray-400 hover:bg-gray-50'
              }`}
            >
              <div className="shrink-0">
                {React.cloneElement(item.icon as React.ReactElement, { size: 20 })}
              </div>
              <span className="hidden lg:block text-[11px] font-black uppercase tracking-wider">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-6 hidden lg:block">
          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
            <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest text-center">Admin v2.5</p>
          </div>
        </div>
      </aside>

      {/* Main Content Area - Sem scroll global */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 p-6 lg:p-8 overflow-hidden">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
