
import React, { useState, useEffect, useRef } from 'react';
import { GeminiLiveService } from '../services/geminiLiveService';
import { Role, RoleType, Language } from '../types';
import { Type } from '@google/genai';
import { Mic, X, Sparkles, Wand2, Check, UserCircle, RefreshCw, Volume2 } from 'lucide-react';

interface RoleArchitectProps {
  onComplete: (role: Partial<Role>) => void;
  onClose: () => void;
}

export const RoleArchitect: React.FC<RoleArchitectProps> = ({ onComplete, onClose }) => {
  const [draft, setDraft] = useState<Partial<Role>>({
    name: '',
    type: RoleType.COACH,
    language: Language.ENGLISH,
    description: '',
    systemPrompt: ''
  });
  
  const [isConnecting, setIsConnecting] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [lastUserText, setLastUserText] = useState('');
  const [lastAiText, setLastAiText] = useState('');
  
  const serviceRef = useRef<GeminiLiveService | null>(null);

  const tools = [
    {
      name: 'update_role_draft',
      description: '当用户描述了角色的某些属性时，调用此函数更新草稿。你可以同时更新多个字段。',
      parameters: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: '导师的名称' },
          type: { type: Type.STRING, enum: ['Coach', 'Interviewer', 'Friend', 'Examiner'], description: '导师类型' },
          language: { type: Type.STRING, enum: ['English', 'Chinese', 'Japanese'], description: '教学语言' },
          description: { type: Type.STRING, description: '给用户看的一句简短介绍' },
          systemPrompt: { type: Type.STRING, description: '给AI看的详细性格描述和教学行为逻辑（Prompt）' }
        }
      }
    }
  ];

  const systemInstruction = `
    你是一位专业的“AI教学角色设计师”。你的任务是引导用户创建一个新的语言学习角色。
    
    交互流程：
    1. 热情地欢迎用户。
    2. 询问他们想要什么样的导师（例如：严厉的面试官、温柔的朋友、还是专业教练？）。
    3. 根据用户的描述，利用你的专业知识为他们“润色”名称、简介和详细的系统提示词（System Prompt）。
    4. 只要你从对话中提取到了信息，就立即调用 update_role_draft 函数。
    5. 一次只问一个问题，不要让用户感到负担。
    
    注意：你可以根据用户的简单描述，自动生成非常专业且复杂的 systemPrompt。例如用户说“想要一个严厉的面试官”，你应该生成一段包含压力面试、纠错规则、冷酷语气等细节的长 Prompt。
  `;

  const startVoice = async () => {
    setIsConnecting(true);
    const service = new GeminiLiveService(process.env.API_KEY || '');
    serviceRef.current = service;
    
    try {
      await service.connect(systemInstruction, {
        onTranscription: (text, isUser) => {
          if (isUser) setLastUserText(text);
          else setLastAiText(text);
        },
        onToolCall: (calls) => {
          calls.forEach(call => {
            if (call.name === 'update_role_draft') {
              setDraft(prev => ({ ...prev, ...call.args }));
            }
          });
        },
        onClose: () => setIsActive(false),
        onError: (err) => console.error(err)
      }, tools);
      setIsActive(true);
    } catch (e) {
      console.error(e);
    } finally {
      setIsConnecting(false);
    }
  };

  useEffect(() => {
    startVoice();
    return () => serviceRef.current?.disconnect();
  }, []);

  return (
    <div className="fixed inset-0 z-[100] bg-[#0b0e14] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-6xl flex flex-col lg:flex-row gap-8 items-stretch h-[85vh]">
        
        {/* 左侧：语音交互区 */}
        <div className="flex-1 bg-[#12161f] rounded-[3rem] border border-white/5 p-12 flex flex-col justify-between shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8">
            <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
              <X size={32} />
            </button>
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-500/20 rounded-2xl flex items-center justify-center">
                <Wand2 className="text-indigo-400" size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white">AI 导师设计师</h2>
                <p className="text-indigo-400 text-xs font-bold tracking-widest uppercase">语音辅助创建模式</p>
              </div>
            </div>

            <div className="space-y-8 pt-12">
              <div className="space-y-2">
                <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em]">AI 正在说...</p>
                <p className="text-xl text-slate-200 font-medium leading-relaxed italic">
                  {isConnecting ? "正在唤醒设计师..." : lastAiText || "你好！我是你的角色设计师。你今天想创建一个什么样的语言学习导师？"}
                </p>
              </div>
              
              {lastUserText && (
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em]">你刚才说...</p>
                  <p className="text-lg text-indigo-300 font-medium">"{lastUserText}"</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col items-center gap-8">
            <div className="relative">
              <div className="absolute -inset-12 bg-indigo-500 rounded-full animate-voice opacity-10"></div>
              <div className="w-24 h-24 bg-indigo-600 rounded-full flex items-center justify-center shadow-[0_0_60px_rgba(79,70,229,0.4)] relative z-10">
                <Mic size={40} className="text-white" />
              </div>
            </div>
            <div className="flex gap-1.5 h-6 items-end">
               {[...Array(15)].map((_, i) => (
                <div key={i} className={`w-1 bg-indigo-500 rounded-full animate-pulse`} style={{ height: `${20 + Math.random() * 80}%`, animationDelay: `${i * 0.05}s` }}></div>
              ))}
            </div>
          </div>
        </div>

        {/* 右侧：实时预览表单 */}
        <div className="w-full lg:w-[450px] bg-white rounded-[3rem] p-10 flex flex-col justify-between shadow-2xl animate-in slide-in-from-right-12 duration-500">
          <div className="space-y-8">
            <h3 className="text-xl font-black text-slate-900 border-b border-slate-100 pb-4">实时草稿预览</h3>
            
            <div className="space-y-6">
              <PreviewField label="名称" value={draft.name} placeholder="AI 正在构思..." />
              <div className="grid grid-cols-2 gap-4">
                <PreviewField label="语言" value={draft.language} />
                <PreviewField label="类型" value={draft.type} />
              </div>
              <PreviewField label="简介" value={draft.description} isTextarea />
              <PreviewField label="系统指令 (Prompt)" value={draft.systemPrompt} isTextarea isPrompt />
            </div>
          </div>

          <button 
            disabled={!draft.name || !draft.systemPrompt}
            onClick={() => onComplete(draft)}
            className="w-full py-5 bg-indigo-600 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-3xl font-black shadow-2xl shadow-indigo-900/20 flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-95"
          >
            <Check size={20} />
            完成设计并创建
          </button>
        </div>
      </div>
    </div>
  );
};

const PreviewField = ({ label, value, placeholder, isTextarea, isPrompt }: any) => (
  <div className="space-y-1.5">
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
      {label}
      {value && <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>}
    </label>
    <div className={`w-full px-4 py-3 rounded-2xl border transition-all duration-500 ${
      value ? 'bg-indigo-50 border-indigo-100 text-slate-900' : 'bg-slate-50 border-slate-100 text-slate-300 italic'
    }`}>
      {isTextarea ? (
        <p className={`text-xs leading-relaxed line-clamp-4 ${isPrompt ? 'font-mono' : ''}`}>
          {value || "等待 AI 填充..."}
        </p>
      ) : (
        <p className="text-sm font-bold truncate">{value || placeholder}</p>
      )}
    </div>
  </div>
);
