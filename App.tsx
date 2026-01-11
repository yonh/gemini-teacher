
import React, { useState, useEffect } from 'react';
import { storageService } from './services/storageService';
import { Role, Language } from './types';
import { Layout, MessageCircle, BarChart2, Book, Settings, UserCircle, Plus } from 'lucide-react';
import Dashboard from './components/Dashboard';
import LiveChat from './components/LiveChat';
import { DEFAULT_ROLES } from './constants';

const SidebarItem = ({ icon: Icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
      active 
        ? 'bg-violet-600 text-white shadow-lg shadow-violet-200' 
        : 'text-gray-500 hover:bg-violet-50 hover:text-violet-600'
    }`}
  >
    <Icon size={20} className={active ? 'text-white' : 'group-hover:text-violet-600'} />
    <span className="font-medium">{label}</span>
  </button>
);

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<'dashboard' | 'chat' | 'vocab' | 'roles' | 'settings'>('dashboard');
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);

  useEffect(() => {
    setRoles(storageService.getRoles());
  }, []);

  const handleStartPractice = (role: Role) => {
    setSelectedRole(role);
    setIsChatOpen(true);
  };

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      {/* Sidebar */}
      <aside className="w-64 border-r border-gray-200 bg-white flex flex-col p-6 space-y-8 shrink-0">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-10 h-10 bg-violet-600 rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-xl">L</span>
          </div>
          <span className="text-xl font-bold text-gray-900 tracking-tight">Linguist<span className="text-violet-600">AI</span></span>
        </div>

        <nav className="flex-1 space-y-2">
          <SidebarItem 
            icon={BarChart2} 
            label="Dashboard" 
            active={currentView === 'dashboard'} 
            onClick={() => setCurrentView('dashboard')} 
          />
          <SidebarItem 
            icon={MessageCircle} 
            label="Practice" 
            active={currentView === 'chat'} 
            onClick={() => setCurrentView('chat')} 
          />
          <SidebarItem 
            icon={Book} 
            label="Vocabulary" 
            active={currentView === 'vocab'} 
            onClick={() => setCurrentView('vocab')} 
          />
          <SidebarItem 
            icon={UserCircle} 
            label="Tutor Roles" 
            active={currentView === 'roles'} 
            onClick={() => setCurrentView('roles')} 
          />
        </nav>

        <div className="pt-6 border-t border-gray-100">
           <SidebarItem 
            icon={Settings} 
            label="Settings" 
            active={currentView === 'settings'} 
            onClick={() => setCurrentView('settings')} 
          />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {currentView === 'dashboard' && <Dashboard />}

        {currentView === 'chat' && (
          <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header>
              <h1 className="text-3xl font-bold text-gray-900">Choose your Tutor</h1>
              <p className="text-gray-500">Select a role to start your voice practice session</p>
            </header>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {roles.map(role => (
                <div key={role.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:border-violet-200 hover:shadow-md transition-all group">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 rounded-full bg-violet-100 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                      {role.language === Language.ENGLISH ? '🇬🇧' : role.language === Language.CHINESE ? '🇨🇳' : '🇯🇵'}
                    </div>
                    <span className="px-3 py-1 bg-violet-50 text-violet-600 text-[10px] font-bold uppercase rounded-full tracking-wider">
                      {role.type}
                    </span>
                  </div>
                  <h3 className="font-bold text-xl mb-2">{role.name}</h3>
                  <p className="text-gray-500 text-sm mb-6 line-clamp-2">{role.description}</p>
                  <button 
                    onClick={() => handleStartPractice(role)}
                    className="w-full py-3 bg-gray-50 hover:bg-violet-600 hover:text-white text-gray-900 font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    <MessageCircle size={18} />
                    Start Chat
                  </button>
                </div>
              ))}
              <button className="border-2 border-dashed border-gray-200 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 text-gray-400 hover:border-violet-300 hover:text-violet-500 hover:bg-violet-50/30 transition-all">
                <Plus size={32} />
                <span className="font-medium">Custom Role</span>
              </button>
            </div>
          </div>
        )}

        {currentView === 'vocab' && (
          <div className="p-8 flex items-center justify-center h-full text-gray-400 italic">
            Vocabulary system module - Feature Coming Soon
          </div>
        )}

        {currentView === 'settings' && (
          <div className="p-8 space-y-6">
            <h1 className="text-2xl font-bold">Settings</h1>
            <div className="bg-white p-6 rounded-2xl border border-gray-100 space-y-4">
              <h3 className="font-semibold">Data Management</h3>
              <p className="text-sm text-gray-500">Export your sessions and roles as JSON for backup.</p>
              <button 
                onClick={() => storageService.exportAllData()}
                className="px-6 py-2 bg-violet-600 text-white rounded-lg font-medium hover:bg-violet-700"
              >
                Export JSON
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Voice Chat Modal */}
      {isChatOpen && selectedRole && (
        <LiveChat role={selectedRole} onClose={() => setIsChatOpen(false)} />
      )}
    </div>
  );
};

export default App;
