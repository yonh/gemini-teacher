
import React, { useState, useEffect } from 'react';
import { storageService } from './services/storageService';
import { Role, Language, RoleType, KeyPoint } from './types';
import { Layout, MessageCircle, BarChart2, Bookmark, Settings, UserCircle, Plus, Edit2, Save, X, Trash2, Calendar, Bot } from 'lucide-react';
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
  const [keyPoints, setKeyPoints] = useState<KeyPoint[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  
  // Role Editing State
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Partial<Role> | null>(null);

  useEffect(() => {
    setRoles(storageService.getRoles());
    setKeyPoints(storageService.getKeyPoints());
  }, [currentView, isChatOpen]);

  const handleStartPractice = (role: Role) => {
    setSelectedRole(role);
    setIsChatOpen(true);
  };

  const handleEditRole = (role: Role) => {
    setEditingRole(role);
    setIsRoleModalOpen(true);
  };

  const handleCreateRole = () => {
    setEditingRole({
      id: Date.now().toString(),
      name: '',
      type: RoleType.COACH,
      language: Language.ENGLISH,
      description: '',
      systemPrompt: ''
    });
    setIsRoleModalOpen(true);
  };

  const handleSaveRole = () => {
    if (editingRole && editingRole.name && editingRole.systemPrompt) {
      storageService.saveRole(editingRole as Role);
      setRoles(storageService.getRoles());
      setIsRoleModalOpen(false);
      setEditingRole(null);
    }
  };

  const handleDeleteRole = (id: string) => {
    if (confirm('确定要删除这个角色吗？')) {
      const updated = roles.filter(r => r.id !== id);
      localStorage.setItem('linguist_roles', JSON.stringify(updated));
      setRoles(updated);
    }
  };

  const handleDeleteKeyPoint = (id: string) => {
    storageService.deleteKeyPoint(id);
    setKeyPoints(storageService.getKeyPoints());
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
            label="学习概览" 
            active={currentView === 'dashboard'} 
            onClick={() => setCurrentView('dashboard')} 
          />
          <SidebarItem 
            icon={MessageCircle} 
            label="语音练习" 
            active={currentView === 'chat'} 
            onClick={() => setCurrentView('chat')} 
          />
          <SidebarItem 
            icon={Bookmark} 
            label="重点回顾" 
            active={currentView === 'vocab'} 
            onClick={() => setCurrentView('vocab')} 
          />
        </nav>

        <div className="pt-6 border-t border-gray-100">
           <SidebarItem 
            icon={Settings} 
            label="设置" 
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
            <header className="flex justify-between items-end">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">选择你的导师</h1>
                <p className="text-gray-500">挑选一个角色开始你的口语练习</p>
              </div>
              <button 
                onClick={handleCreateRole}
                className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-xl hover:bg-violet-700 transition-colors font-medium shadow-md"
              >
                <Plus size={18} />
                创建角色
              </button>
            </header>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {roles.map(role => (
                <div key={role.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:border-violet-200 hover:shadow-md transition-all group relative">
                  <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => handleEditRole(role)}
                      className="p-2 bg-white rounded-full shadow-sm border border-gray-100 text-gray-400 hover:text-violet-600 hover:border-violet-200"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button 
                      onClick={() => handleDeleteRole(role.id)}
                      className="p-2 bg-white rounded-full shadow-sm border border-gray-100 text-gray-400 hover:text-red-600 hover:border-red-200"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

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
                    开始对话
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {currentView === 'vocab' && (
          <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header>
              <h1 className="text-3xl font-bold text-gray-900">重点知识回顾</h1>
              <p className="text-gray-500">你在对话中标记的所有重点内容</p>
            </header>

            {keyPoints.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-gray-400 space-y-4">
                <Bookmark size={48} className="opacity-20" />
                <p className="italic">还没有记下任何重点。在对话中点击书签按钮来标记吧！</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {keyPoints.map(kp => (
                  <div key={kp.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4 relative group">
                    <button 
                      onClick={() => handleDeleteKeyPoint(kp.id)}
                      className="absolute top-4 right-4 p-2 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={16} />
                    </button>
                    
                    <div className="flex items-center gap-2 text-xs font-bold text-violet-600 uppercase tracking-widest">
                      <Bot size={14} />
                      {kp.roleName} 的建议
                    </div>

                    <div className="space-y-3">
                      <p className="text-gray-900 font-medium leading-relaxed">{kp.content}</p>
                      {kp.translation && (
                        <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-sm text-gray-500 italic">
                          {kp.translation}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-4 pt-4 border-t border-gray-50 text-[10px] text-gray-400 font-bold uppercase">
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        {new Date(kp.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {currentView === 'settings' && (
          <div className="p-8 space-y-6">
            <h1 className="text-2xl font-bold">设置</h1>
            <div className="bg-white p-6 rounded-2xl border border-gray-100 space-y-4">
              <h3 className="font-semibold text-gray-900">数据管理</h3>
              <p className="text-sm text-gray-500">导出你的所有对话记录、重点和角色定义作为备份。</p>
              <button 
                onClick={() => storageService.exportAllData()}
                className="px-6 py-2 bg-violet-600 text-white rounded-xl font-bold hover:bg-violet-700 shadow-lg shadow-violet-200 transition-all"
              >
                导出数据 (JSON)
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Voice Chat Modal */}
      {isChatOpen && selectedRole && (
        <LiveChat role={selectedRole} onClose={() => setIsChatOpen(false)} />
      )}

      {/* Role Editor Modal */}
      {isRoleModalOpen && editingRole && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <UserCircle className="text-violet-600" />
                {editingRole.name ? '编辑导师角色' : '创建新导师'}
              </h2>
              <button onClick={() => setIsRoleModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            <div className="p-8 space-y-6 overflow-y-auto max-h-[70vh]">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">显示名称</label>
                  <input 
                    type="text" 
                    value={editingRole.name}
                    onChange={e => setEditingRole({...editingRole, name: e.target.value})}
                    placeholder="例如：铁面面试官"
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">角色类型</label>
                  <select 
                    value={editingRole.type}
                    onChange={e => setEditingRole({...editingRole, type: e.target.value as RoleType})}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:outline-none"
                  >
                    {Object.values(RoleType).map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">语言</label>
                <select 
                  value={editingRole.language}
                  onChange={e => setEditingRole({...editingRole, language: e.target.value as Language})}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:outline-none"
                >
                  {Object.values(Language).map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">简介</label>
                <textarea 
                  value={editingRole.description}
                  onChange={e => setEditingRole({...editingRole, description: e.target.value})}
                  rows={2}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">系统指令 (Prompt)</label>
                <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">这决定了 AI 的个性和行为逻辑</p>
                <textarea 
                  value={editingRole.systemPrompt}
                  onChange={e => setEditingRole({...editingRole, systemPrompt: e.target.value})}
                  rows={4}
                  placeholder="你是一个严格的面试官..."
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:outline-none font-mono text-sm"
                />
              </div>
            </div>
            <div className="p-6 bg-gray-50/50 border-t border-gray-100 flex justify-end gap-3">
              <button 
                onClick={() => setIsRoleModalOpen(false)}
                className="px-6 py-2 text-gray-500 font-bold hover:text-gray-700 transition-colors"
              >
                取消
              </button>
              <button 
                onClick={handleSaveRole}
                className="px-8 py-2 bg-violet-600 text-white rounded-xl font-bold shadow-lg shadow-violet-200 hover:bg-violet-700 transition-colors flex items-center gap-2"
              >
                <Save size={18} />
                保存角色
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
