
import React, { useState, useEffect } from 'react';
import { storageService } from './services/storageService';
import { Role, Language, RoleType, KeyPoint, VoiceProvider, UserSettings, Course, Chapter } from './types';
import { Layout, MessageCircle, BarChart2, Bookmark, Settings, UserCircle, Plus, Edit2, Save, X, Trash2, Calendar, Bot, Wand2, Cpu, Zap, Sparkles, Globe, ShieldCheck, Activity, Key, Server, Mic, GraduationCap } from 'lucide-react';
import Dashboard from './components/Dashboard';
import LiveChat from './components/LiveChat';
import { RoleArchitect } from './components/RoleArchitect';
import { CourseLibrary } from './components/CourseLibrary';
import { ChapterPlayer } from './components/ChapterPlayer';

const SidebarItem = ({ icon: Icon, label, active, onClick, variant = 'default' }: { icon: any, label: string, active: boolean, onClick: () => void, variant?: 'default' | 'special' }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${
      active 
        ? variant === 'special' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' : 'bg-violet-600 text-white shadow-lg shadow-violet-100' 
        : 'text-gray-500 hover:bg-gray-100'
    }`}
  >
    <Icon size={20} className={active ? 'text-white' : 'group-hover:text-violet-600'} />
    <span className="font-semibold">{label}</span>
  </button>
);

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<'dashboard' | 'chat' | 'vocab' | 'roles' | 'settings' | 'curriculum'>('dashboard');
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [keyPoints, setKeyPoints] = useState<KeyPoint[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatCourseContext, setChatCourseContext] = useState<{ course: Course, chapter: Chapter } | undefined>(undefined);
  const [settings, setSettings] = useState<UserSettings>(storageService.getSettings());
  
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isArchitectOpen, setIsArchitectOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Partial<Role> | null>(null);

  // Curriculum State
  const [activeCourse, setActiveCourse] = useState<Course | null>(null);
  const [activeChapter, setActiveChapter] = useState<Chapter | null>(null);

  useEffect(() => {
    setRoles(storageService.getRoles());
    setKeyPoints(storageService.getKeyPoints());
    setSettings(storageService.getSettings());
  }, [currentView, isChatOpen, isArchitectOpen]);

  const handleStartPractice = (role: Role, courseContext?: { course: Course, chapter: Chapter }) => {
    setSelectedRole(role);
    setChatCourseContext(courseContext);
    setIsChatOpen(true);
  };

  const handleStartChapter = (course: Course, chapter: Chapter) => {
    setActiveCourse(course);
    setActiveChapter(chapter);
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

  const updateSetting = (key: keyof UserSettings, value: any) => {
    const newSettings = { ...settings, [key]: value };
    storageService.saveSettings(newSettings);
    setSettings(newSettings);
  };

  const handleSaveCredential = (provider: string, key: string) => {
    storageService.saveCredential(provider, key);
    setSettings(storageService.getSettings());
  };

  const getProviderIcon = (provider: VoiceProvider) => {
    switch (provider) {
      case VoiceProvider.GEMINI: return <Sparkles size={16} className="text-blue-500" />;
      case VoiceProvider.ZHIPU_GLM: return <Zap size={16} className="text-amber-500" />;
      case VoiceProvider.OPENAI: return <Globe size={16} className="text-emerald-500" />;
      case VoiceProvider.OPENROUTER: return <Server size={16} className="text-purple-500" />;
      default: return <Cpu size={16} />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      <aside className="w-68 border-r border-gray-200 bg-white flex flex-col p-6 space-y-8 shrink-0">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-gradient-to-br from-violet-600 to-indigo-700 rounded-2xl flex items-center justify-center shadow-xl">
            <span className="text-white font-black text-2xl tracking-tighter">L</span>
          </div>
          <div className="flex flex-col">
             <span className="text-xl font-black text-gray-900 leading-tight">Linguist<span className="text-violet-600">AI</span></span>
             <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Professional Tutor</span>
          </div>
        </div>
        
        <div className="space-y-4">
           <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-4">主要功能</p>
           <nav className="space-y-1.5">
            <SidebarItem icon={BarChart2} label="学习概览" active={currentView === 'dashboard'} onClick={() => setCurrentView('dashboard')} />
            <SidebarItem icon={GraduationCap} label="AI 课程" active={currentView === 'curriculum'} onClick={() => setCurrentView('curriculum')} />
            <SidebarItem icon={MessageCircle} label="语音练习" active={currentView === 'chat'} onClick={() => setCurrentView('chat')} />
            <SidebarItem icon={Bookmark} label="重点回顾" active={currentView === 'vocab'} onClick={() => setCurrentView('vocab')} />
          </nav>
        </div>

        <div className="space-y-4">
           <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-4">实验室</p>
           <SidebarItem 
              variant="special"
              icon={Wand2} 
              label="AI 角色构思" 
              active={isArchitectOpen} 
              onClick={() => setIsArchitectOpen(true)} 
            />
        </div>

        <div className="mt-auto pt-6 border-t border-gray-100">
           <SidebarItem icon={Settings} label="偏好设置" active={currentView === 'settings'} onClick={() => setCurrentView('settings')} />
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-gray-50/50">
        {currentView === 'dashboard' && <Dashboard />}
        {currentView === 'curriculum' && <CourseLibrary onStartChapter={handleStartChapter} />}
        {currentView === 'chat' && (
          <div className="p-10 space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700">
            <header className="flex justify-between items-end">
              <div>
                <h1 className="text-4xl font-black text-gray-900 tracking-tight">选择你的导师</h1>
                <p className="text-gray-500 mt-2 font-medium">随时开启一段沉浸式的跨语言对话</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setIsArchitectOpen(true)} className="flex items-center gap-2 px-6 py-3 bg-indigo-50 text-indigo-700 rounded-2xl hover:bg-indigo-100 transition-all font-bold shadow-sm border border-indigo-100">
                  <Wand2 size={18} />
                  AI 设计师
                </button>
                <button onClick={handleCreateRole} className="flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-2xl hover:bg-black transition-all font-bold shadow-xl">
                  <Plus size={18} />
                  手动创建
                </button>
              </div>
            </header>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
              {roles.map(role => (
                <div key={role.id} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 hover:border-violet-300 hover:shadow-2xl hover:shadow-violet-200/50 transition-all group relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 bg-gray-50/80 backdrop-blur-md border-bl border-gray-100 rounded-bl-2xl opacity-50 group-hover:opacity-100 transition-opacity">
                    {getProviderIcon(role.provider)}
                  </div>
                  <div className="absolute top-6 right-16 flex gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0 z-10">
                    <button onClick={() => handleEditRole(role)} className="p-3 bg-white rounded-xl shadow-lg border border-gray-100 text-gray-400 hover:text-violet-600 transition-all">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => handleDeleteRole(role.id)} className="p-3 bg-white rounded-xl shadow-lg border border-gray-100 text-gray-400 hover:text-red-600 transition-all">
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="flex justify-between items-start mb-6">
                    <div className="w-16 h-16 rounded-2xl bg-violet-100 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform duration-500 shadow-inner">
                      {role.language === Language.ENGLISH ? '🇬🇧' : role.language === Language.CHINESE ? '🇨🇳' : '🇯🇵'}
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <span className="px-3 py-1 bg-violet-50 text-violet-600 text-[10px] font-black uppercase rounded-lg tracking-widest">{role.type}</span>
                      <span className="text-[8px] text-gray-400 font-black uppercase tracking-[0.2em]">{role.provider}</span>
                    </div>
                  </div>
                  <h3 className="font-black text-2xl mb-2 text-gray-900">{role.name}</h3>
                  <p className="text-gray-500 text-sm mb-8 leading-relaxed line-clamp-2 h-10 font-medium">{role.description}</p>
                  <button onClick={() => handleStartPractice(role)} className="w-full py-4 bg-gray-50 group-hover:bg-violet-600 group-hover:text-white text-gray-900 font-black rounded-2xl transition-all flex items-center justify-center gap-3">
                    <MessageCircle size={20} />
                    开启对话
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        {currentView === 'vocab' && (
          <div className="p-10 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header>
              <h1 className="text-4xl font-black text-gray-900 tracking-tight">重点回顾</h1>
              <p className="text-gray-500 mt-2 font-medium">深度复盘你的知识薄弱点</p>
            </header>
            {keyPoints.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-32 text-gray-300 space-y-6">
                <Bookmark size={80} className="opacity-10" />
                <p className="italic font-medium">暂时没有被记录的重点。</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {keyPoints.map(kp => (
                  <div key={kp.id} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 space-y-6 relative group hover:shadow-xl transition-all">
                    <button onClick={() => handleDeleteKeyPoint(kp.id)} className="absolute top-6 right-6 p-2 text-gray-200 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                      <Trash2 size={20} />
                    </button>
                    <div className="flex items-center gap-2 text-[10px] font-black text-violet-600 uppercase tracking-[0.3em]">
                      <Bot size={14} />
                      Source: {kp.roleName}
                    </div>
                    <div className="space-y-4">
                      <p className="text-gray-900 font-bold text-lg leading-snug">{kp.content}</p>
                      {kp.translation && <div className="p-5 bg-gray-50/80 rounded-2xl border border-gray-100 text-sm text-gray-600 italic font-medium">“{kp.translation}”</div>}
                    </div>
                    <div className="flex items-center gap-4 pt-6 border-t border-gray-50 text-[10px] text-gray-400 font-black uppercase tracking-widest">
                      <span className="flex items-center gap-1.5"><Calendar size={12} />{new Date(kp.timestamp).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {currentView === 'settings' && (
          <div className="p-10 space-y-12 max-w-5xl animate-in fade-in duration-500">
            <header>
              <h1 className="text-4xl font-black text-gray-900 tracking-tight">偏好设置</h1>
              <p className="text-gray-500 mt-2 font-medium">高度自定义你的 AI 引擎与交互体验</p>
            </header>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
              {/* Realtime Engine Config */}
              <section className="bg-white rounded-[3rem] border border-gray-100 p-10 shadow-sm space-y-8">
                <div className="flex items-center gap-4 border-b border-gray-50 pb-6">
                  <div className="p-3 bg-violet-100 rounded-2xl text-violet-600"><Mic size={24} /></div>
                  <div>
                    <h3 className="font-black text-xl text-gray-900">实时对话引擎</h3>
                    <p className="text-xs text-gray-400 font-medium">控制语音响应速度与延迟</p>
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">供应商</label>
                    <select 
                      value={settings.preferredRealtimeProvider} 
                      onChange={(e) => updateSetting('preferredRealtimeProvider', e.target.value)}
                      className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-violet-500 font-bold transition-all"
                    >
                      <option value={VoiceProvider.GEMINI}>Google Gemini Live</option>
                      <option value={VoiceProvider.ZHIPU_GLM}>智谱 GLM-Realtime</option>
                      <option value={VoiceProvider.OPENAI}>OpenAI Realtime</option>
                    </select>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">模型 ID</label>
                    <input 
                      type="text" 
                      placeholder="gemini-2.5-flash-native-audio-preview-12-2025"
                      value={settings.preferredRealtimeModel}
                      onChange={(e) => updateSetting('preferredRealtimeModel', e.target.value)}
                      className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-violet-500 font-mono text-xs transition-all"
                    />
                  </div>
                </div>
              </section>

              {/* Logic Engine Config */}
              <section className="bg-white rounded-[3rem] border border-gray-100 p-10 shadow-sm space-y-8">
                <div className="flex items-center gap-4 border-b border-gray-50 pb-6">
                  <div className="p-3 bg-indigo-100 rounded-2xl text-indigo-600"><Server size={24} /></div>
                  <div>
                    <h3 className="font-black text-xl text-gray-900">逻辑处理引擎</h3>
                    <p className="text-xs text-gray-400 font-medium">负责翻译、纠错与复盘报告</p>
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">首选提供商</label>
                    <select 
                      value={settings.preferredTextProvider} 
                      onChange={(e) => updateSetting('preferredTextProvider', e.target.value)}
                      className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold transition-all"
                    >
                      <option value={VoiceProvider.GEMINI}>Google Gemini</option>
                      <option value={VoiceProvider.OPENROUTER}>OpenRouter</option>
                    </select>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">文本模型 ID</label>
                    <input 
                      type="text" 
                      placeholder={settings.preferredTextProvider === VoiceProvider.GEMINI ? "gemini-3-flash-preview" : "deepseek/deepseek-chat"}
                      value={settings.preferredTextModel}
                      onChange={(e) => updateSetting('preferredTextModel', e.target.value)}
                      className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 font-mono text-xs transition-all"
                    />
                  </div>
                </div>
              </section>
            </div>

            {/* Credentials */}
            <section className="bg-white rounded-[3rem] border border-gray-100 p-10 shadow-sm space-y-10">
              <div className="flex items-center gap-4 border-b border-gray-50 pb-6">
                <div className="p-3 bg-amber-100 rounded-2xl text-amber-600"><Key size={24} /></div>
                <h3 className="font-black text-xl text-gray-900">供应商凭证</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-4">
                   <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Server size={18} className="text-purple-500" />
                        <span className="font-bold text-gray-700">OpenRouter Key</span>
                      </div>
                   </div>
                   <input 
                    type="password" 
                    placeholder="sk-or-v1-..." 
                    value={settings.credentials[VoiceProvider.OPENROUTER] || ''} 
                    onChange={(e) => handleSaveCredential(VoiceProvider.OPENROUTER, e.target.value)}
                    className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-violet-500 font-mono text-sm" 
                   />
                </div>

                <div className="space-y-4">
                   <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Globe size={18} className="text-emerald-500" />
                        <span className="font-bold text-gray-700">OpenAI Key</span>
                      </div>
                   </div>
                   <input 
                    type="password" 
                    placeholder="sk-..." 
                    value={settings.credentials[VoiceProvider.OPENAI] || ''} 
                    onChange={(e) => handleSaveCredential(VoiceProvider.OPENAI, e.target.value)}
                    className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-violet-500 font-mono text-sm" 
                   />
                </div>

                <div className="space-y-4">
                   <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Zap size={18} className="text-amber-500" />
                        <span className="font-bold text-gray-700">智谱 AI Key</span>
                      </div>
                   </div>
                   <input 
                    type="password" 
                    placeholder="ID.SECRET" 
                    value={settings.credentials[VoiceProvider.ZHIPU_GLM] || ''} 
                    onChange={(e) => handleSaveCredential(VoiceProvider.ZHIPU_GLM, e.target.value)}
                    className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-violet-500 font-mono text-sm" 
                   />
                </div>
              </div>
            </section>
          </div>
        )}
      </main>

      {/* Overlays */}
      {isChatOpen && selectedRole && <LiveChat role={selectedRole} courseContext={chatCourseContext} onClose={() => { setIsChatOpen(false); setChatCourseContext(undefined); }} />}
      {isArchitectOpen && <RoleArchitect onClose={() => setIsArchitectOpen(false)} onComplete={(data) => handleSaveRole(data)} />}
      {activeCourse && activeChapter && (
        <ChapterPlayer 
          course={activeCourse} 
          chapter={activeChapter} 
          onClose={() => { setActiveCourse(null); setActiveChapter(null); }} 
          onStartPractice={(role, ctx) => handleStartPractice(role, ctx)}
        />
      )}

      {/* Role Editor Modal */}
      {isRoleModalOpen && editingRole && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-3xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-2xl font-black flex items-center gap-3">
                <div className="p-3 bg-violet-100 rounded-2xl text-violet-600"><UserCircle /></div>
                {editingRole.name ? '微调导师方案' : '实验室新角色'}
              </h2>
              <button onClick={() => setIsRoleModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-all p-2 hover:bg-gray-100 rounded-full"><X size={28} /></button>
            </div>
            
            <div className="p-10 space-y-8 overflow-y-auto max-h-[75vh]">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">角色大名</label>
                  <input type="text" value={editingRole.name} onChange={e => setEditingRole({...editingRole, name: e.target.value})} placeholder="例如：面试官 林" className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-violet-500 font-bold" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">角色定位</label>
                  <select value={editingRole.type} onChange={e => setEditingRole({...editingRole, type: e.target.value as RoleType})} className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-violet-500 font-bold appearance-none">
                    {Object.values(RoleType).map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">练习语言</label>
                  <select value={editingRole.language} onChange={e => setEditingRole({...editingRole, language: e.target.value as Language})} className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-violet-500 font-bold">
                    {Object.values(Language).map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">默认实时引擎</label>
                  <select value={editingRole.provider} onChange={e => setEditingRole({...editingRole, provider: e.target.value as VoiceProvider})} className="w-full px-5 py-4 bg-violet-50 border border-violet-100 text-violet-700 font-black rounded-2xl">
                    {Object.values(VoiceProvider).map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">一句话简介</label>
                <textarea value={editingRole.description} onChange={e => setEditingRole({...editingRole, description: e.target.value})} rows={2} placeholder="给用户看的一句简短介绍..." className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-violet-500 font-medium text-sm" />
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center justify-between">
                  <span>核心 Prompt (系统指令)</span>
                  <span className="text-[9px] lowercase text-gray-400 font-medium italic">控制导师的灵魂逻辑</span>
                </label>
                <textarea value={editingRole.systemPrompt} onChange={e => setEditingRole({...editingRole, systemPrompt: e.target.value})} rows={6} placeholder="你是一个严格的..." className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-violet-500 font-mono text-xs leading-relaxed" />
              </div>
            </div>

            <div className="p-8 bg-gray-50/50 border-t border-gray-100 flex justify-end gap-4">
              <button onClick={() => setIsRoleModalOpen(false)} className="px-8 py-3 text-gray-500 font-black hover:text-gray-700 transition-colors uppercase tracking-widest text-xs">取消</button>
              <button onClick={() => handleSaveRole()} className="px-12 py-4 bg-gray-900 text-white rounded-[2rem] font-black shadow-xl hover:bg-black transition-all flex items-center gap-3">
                <Save size={20} /> 保存角色
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
