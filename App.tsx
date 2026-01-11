
import React, { useState, useEffect } from 'react';
import { storageService } from './services/storageService';
import { Role, Language, RoleType, KeyPoint, VoiceProvider } from './types';
import { Layout, MessageCircle, BarChart2, Bookmark, Settings, UserCircle, Plus, Edit2, Save, X, Trash2, Calendar, Bot, Wand2, Cpu, Zap, Sparkles, Globe, ShieldCheck, Activity, Key } from 'lucide-react';
import Dashboard from './components/Dashboard';
import LiveChat from './components/LiveChat';
import { RoleArchitect } from './components/RoleArchitect';

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
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isArchitectOpen, setIsArchitectOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Partial<Role> | null>(null);

  useEffect(() => {
    setRoles(storageService.getRoles());
    setKeyPoints(storageService.getKeyPoints());
    setCredentials(storageService.getCredentials());
  }, [currentView, isChatOpen, isArchitectOpen]);

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
      provider: VoiceProvider.GEMINI,
      description: '',
      systemPrompt: ''
    });
    setIsRoleModalOpen(true);
  };

  const handleSaveRole = (roleData?: Partial<Role>) => {
    const finalRole = roleData || editingRole;
    if (finalRole && finalRole.name && finalRole.systemPrompt) {
      storageService.saveRole({
        ...finalRole,
        id: finalRole.id || Date.now().toString(),
        provider: finalRole.provider || VoiceProvider.GEMINI
      } as Role);
      setRoles(storageService.getRoles());
      setIsRoleModalOpen(false);
      setIsArchitectOpen(false);
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

  const handleSaveCredential = (provider: string, key: string) => {
    storageService.saveCredential(provider, key);
    setCredentials(storageService.getCredentials());
  };

  const getProviderIcon = (provider: VoiceProvider) => {
    switch (provider) {
      case VoiceProvider.GEMINI: return <Sparkles size={16} className="text-blue-500" />;
      case VoiceProvider.ZHIPU_GLM: return <Zap size={16} className="text-amber-500" />;
      case VoiceProvider.OPENAI: return <Globe size={16} className="text-emerald-500" />;
      default: return <Cpu size={16} />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      <aside className="w-64 border-r border-gray-200 bg-white flex flex-col p-6 space-y-8 shrink-0">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-10 h-10 bg-violet-600 rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-xl">L</span>
          </div>
          <span className="text-xl font-bold text-gray-900 tracking-tight">Linguist<span className="text-violet-600">AI</span></span>
        </div>
        <nav className="flex-1 space-y-2">
          <SidebarItem icon={BarChart2} label="学习概览" active={currentView === 'dashboard'} onClick={() => setCurrentView('dashboard')} />
          <SidebarItem icon={MessageCircle} label="语音练习" active={currentView === 'chat'} onClick={() => setCurrentView('chat')} />
          <SidebarItem icon={Bookmark} label="重点回顾" active={currentView === 'vocab'} onClick={() => setCurrentView('vocab')} />
        </nav>
        <div className="pt-6 border-t border-gray-100">
           <SidebarItem icon={Settings} label="设置" active={currentView === 'settings'} onClick={() => setCurrentView('settings')} />
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        {currentView === 'dashboard' && <Dashboard />}
        {currentView === 'chat' && (
          <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="flex justify-between items-end">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">选择你的导师</h1>
                <p className="text-gray-500">不同供应商提供不同的语音和交互体验</p>
              </div>
              <button onClick={handleCreateRole} className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-xl hover:bg-violet-700 transition-colors font-medium shadow-md">
                <Plus size={18} />
                创建角色
              </button>
            </header>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {roles.map(role => (
                <div key={role.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:border-violet-200 hover:shadow-md transition-all group relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-3 bg-gray-50 border-bl border-gray-100 rounded-bl-xl opacity-40 group-hover:opacity-100 transition-opacity">
                    {getProviderIcon(role.provider)}
                  </div>
                  <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <button onClick={() => handleEditRole(role)} className="p-2 bg-white rounded-full shadow-sm border border-gray-100 text-gray-400 hover:text-violet-600 hover:border-violet-200">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => handleDeleteRole(role.id)} className="p-2 bg-white rounded-full shadow-sm border border-gray-100 text-gray-400 hover:text-red-600 hover:border-red-200">
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 rounded-full bg-violet-100 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform shadow-inner">
                      {role.language === Language.ENGLISH ? '🇬🇧' : role.language === Language.CHINESE ? '🇨🇳' : '🇯🇵'}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="px-3 py-1 bg-violet-50 text-violet-600 text-[10px] font-bold uppercase rounded-full tracking-wider">{role.type}</span>
                      <span className="text-[9px] text-gray-400 font-black uppercase flex items-center gap-1">{role.provider}</span>
                    </div>
                  </div>
                  <h3 className="font-bold text-xl mb-2">{role.name}</h3>
                  <p className="text-gray-500 text-sm mb-6 line-clamp-2 h-10">{role.description}</p>
                  <button onClick={() => handleStartPractice(role)} className="w-full py-3 bg-gray-50 hover:bg-violet-600 hover:text-white text-gray-900 font-semibold rounded-xl transition-all flex items-center justify-center gap-2">
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
              <h1 className="text-3xl font-bold text-gray-900">重点回顾</h1>
              <p className="text-gray-500">你在对话中标记的所有重点内容</p>
            </header>
            {keyPoints.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-gray-400 space-y-4">
                <Bookmark size={48} className="opacity-20" />
                <p className="italic">还没有记下任何重点。</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {keyPoints.map(kp => (
                  <div key={kp.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4 relative group">
                    <button onClick={() => handleDeleteKeyPoint(kp.id)} className="absolute top-4 right-4 p-2 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                      <Trash2 size={16} />
                    </button>
                    <div className="flex items-center gap-2 text-xs font-bold text-violet-600 uppercase tracking-widest">
                      <Bot size={14} />
                      {kp.roleName}
                    </div>
                    <div className="space-y-3">
                      <p className="text-gray-900 font-medium leading-relaxed">{kp.content}</p>
                      {kp.translation && <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-sm text-gray-500 italic">{kp.translation}</div>}
                    </div>
                    <div className="flex items-center gap-4 pt-4 border-t border-gray-50 text-[10px] text-gray-400 font-bold uppercase">
                      <span className="flex items-center gap-1"><Calendar size={12} />{new Date(kp.timestamp).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {currentView === 'settings' && (
          <div className="p-8 space-y-10 max-w-4xl animate-in fade-in duration-500">
            <header>
              <h1 className="text-3xl font-bold text-gray-900">偏好设置</h1>
              <p className="text-gray-500">管理你的供应商凭据和数据资产</p>
            </header>

            {/* Provider API Keys */}
            <section className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm space-y-6">
              <div className="flex items-center gap-3 border-b border-gray-50 pb-4">
                <Key className="text-violet-600" size={24} />
                <h3 className="font-bold text-lg text-gray-900">供应商凭证</h3>
              </div>
              <div className="space-y-6">
                <div className="space-y-4">
                   <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles size={18} className="text-blue-500" />
                        <span className="font-bold text-gray-700">Gemini API Key</span>
                      </div>
                      <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded font-black uppercase">来自环境变量</span>
                   </div>
                   <input disabled type="password" value="••••••••••••••••" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-400 cursor-not-allowed" />
                   <p className="text-[10px] text-gray-400 italic">按照安全策略，Gemini API Key 始终从后端环境变量加载。</p>
                </div>

                <div className="space-y-4 pt-4 border-t border-gray-50">
                   <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Zap size={18} className="text-amber-500" />
                        <span className="font-bold text-gray-700">智谱 AI API Key (GLM)</span>
                      </div>
                      <span className="text-[10px] bg-amber-100 text-amber-600 px-2 py-0.5 rounded font-black uppercase">自定义设置</span>
                   </div>
                   <input 
                    type="password" 
                    placeholder="格式: ID.SECRET" 
                    value={credentials[VoiceProvider.ZHIPU_GLM] || ''} 
                    onChange={(e) => handleSaveCredential(VoiceProvider.ZHIPU_GLM, e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:outline-none font-mono text-sm" 
                   />
                </div>
              </div>
            </section>

            <section className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
              <div className="flex items-center gap-3 border-b border-gray-50 pb-4">
                <Activity className="text-violet-600" size={24} />
                <h3 className="font-bold text-lg text-gray-900">数据管理</h3>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-gray-800">导出数据</p>
                    <p className="text-sm text-gray-500">保存你的对话历史、生词本和角色到本地 JSON 文件。</p>
                  </div>
                  <button onClick={() => storageService.exportAllData()} className="px-6 py-2.5 bg-violet-600 text-white rounded-xl font-bold hover:bg-violet-700 shadow-lg shadow-violet-200 transition-all flex items-center gap-2">
                    <Save size={18} /> 立即导出
                  </button>
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                  <div>
                    <p className="font-bold text-red-600">清除所有数据</p>
                    <p className="text-sm text-gray-500">这会永久删除你的所有进度，且不可恢复。</p>
                  </div>
                  <button onClick={() => { if(confirm('警告：此操作不可恢复。确定清除吗？')) { localStorage.clear(); location.reload(); } }} className="px-6 py-2.5 border border-red-200 text-red-600 rounded-xl font-bold hover:bg-red-50 transition-all">
                    清空存储
                  </button>
                </div>
              </div>
            </section>
          </div>
        )}
      </main>

      {/* Overlays */}
      {isChatOpen && selectedRole && <LiveChat role={selectedRole} onClose={() => setIsChatOpen(false)} />}
      {isArchitectOpen && <RoleArchitect onClose={() => setIsArchitectOpen(false)} onComplete={(data) => handleSaveRole(data)} />}

      {/* Role Editor Modal */}
      {isRoleModalOpen && editingRole && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <div className="p-2 bg-violet-100 rounded-xl"><UserCircle className="text-violet-600" /></div>
                {editingRole.name ? '编辑导师角色' : '创建新导师'}
              </h2>
              <button onClick={() => setIsRoleModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={24} /></button>
            </div>
            
            {!editingRole.name && (
              <div className="p-4 bg-violet-600 flex items-center justify-between px-8 shadow-inner">
                <div className="flex items-center gap-3"><Wand2 className="text-white" size={20} /><span className="text-sm font-black text-white uppercase tracking-wider">AI 语音辅助创建模式</span></div>
                <button onClick={() => { setIsRoleModalOpen(false); setIsArchitectOpen(true); }} className="px-6 py-2 bg-white text-violet-600 text-xs font-black rounded-full hover:bg-gray-50 transition-all shadow-xl">开启向导</button>
              </div>
            )}

            <div className="p-8 space-y-6 overflow-y-auto max-h-[70vh]">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">导师名称</label>
                  <input type="text" value={editingRole.name} onChange={e => setEditingRole({...editingRole, name: e.target.value})} placeholder="例如：面试官 林" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:outline-none font-bold" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">角色类型</label>
                  <select value={editingRole.type} onChange={e => setEditingRole({...editingRole, type: e.target.value as RoleType})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:outline-none font-bold appearance-none">
                    {Object.values(RoleType).map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">目标语言</label>
                  <select value={editingRole.language} onChange={e => setEditingRole({...editingRole, language: e.target.value as Language})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:outline-none font-bold">
                    {Object.values(Language).map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <Cpu size={14} className="text-violet-600" /> 语音方案 (Provider)
                  </label>
                  <select value={editingRole.provider} onChange={e => setEditingRole({...editingRole, provider: e.target.value as VoiceProvider})} className="w-full px-4 py-3 bg-violet-50 border border-violet-100 text-violet-700 font-bold rounded-xl focus:ring-2 focus:ring-violet-500 focus:outline-none">
                    {Object.values(VoiceProvider).map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">简介</label>
                <textarea value={editingRole.description} onChange={e => setEditingRole({...editingRole, description: e.target.value})} rows={2} placeholder="给导师写一个简单的介绍..." className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:outline-none text-sm" />
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center justify-between">
                  <span>系统指令 (SYSTEM PROMPT)</span>
                  <span className="text-[10px] lowercase text-gray-300 font-normal italic">决定对话逻辑的核心代码</span>
                </label>
                <textarea value={editingRole.systemPrompt} onChange={e => setEditingRole({...editingRole, systemPrompt: e.target.value})} rows={5} placeholder="你是一个严格的面试官，首先会问我的背景..." className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:outline-none font-mono text-xs leading-relaxed" />
              </div>
            </div>

            <div className="p-6 bg-gray-50/50 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setIsRoleModalOpen(false)} className="px-6 py-2 text-gray-500 font-bold hover:text-gray-700 transition-colors">取消</button>
              <button onClick={() => handleSaveRole()} className="px-10 py-3 bg-violet-600 text-white rounded-2xl font-black shadow-lg shadow-violet-200 hover:bg-violet-700 transition-all flex items-center gap-2">
                <Save size={18} /> 保存配置
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
