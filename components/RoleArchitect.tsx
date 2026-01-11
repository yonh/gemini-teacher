
import React, { useState, useEffect, useRef } from 'react';
import { GeminiLiveService } from '../services/geminiLiveService';
import { storageService } from '../services/storageService';
import { Role, RoleType, Language, VoiceProvider } from '../types';
import { Type } from '@google/genai';
import { Mic, X, Sparkles, Wand2, Check, UserCircle, RefreshCw, Volume2, Cpu, ShieldCheck } from 'lucide-react';

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
    systemPrompt: '',
    provider: VoiceProvider.GEMINI
  });
  
  const [isConnecting, setIsConnecting] = useState(false);
  const [isActive, setIsActive] = useState(false);
  
  // States for displaying current accumulated text
  const [lastUserText, setLastUserText] = useState('');
  const [lastAiText, setLastAiText] = useState('');
  
  // Refs for stable accumulation during streaming
  const accumulatedUserRef = useRef('');
  const accumulatedAiRef = useRef('');
  const [error, setError] = useState<string | null>(null);
  
  const serviceRef = useRef<GeminiLiveService | null>(null);

  const tools = [
    {
      name: 'update_role_draft',
      description: '当用户描述了角色的某些属性时，调用此函数更新草案。',
      parameters: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: '导师的名称' },
          type: { type: Type.STRING, enum: ['Coach', 'Interviewer', 'Friend', 'Examiner'], description: '导师类型' },
          language: { type: Type.STRING, enum: ['English', 'Chinese', 'Japanese'], description: '教学语言' },
          description: { type: Type.STRING, description: '简短的角色介绍' },
          systemPrompt: { type: Type.STRING, description: '极其详细的 AI 性格和纠错逻辑 Prompt' }
        }
      }
    }
  ];

  const systemInstruction = `
    你是一位顶级的“AI 教学角色架构师”。
    你的目标：通过语音对话协助用户打造完美的语言练习导师。
    
    准则：
    1. 保持专业、富有创意且高效。
    2. 听到用户的描述后，通过调用 update_role_draft 函数实时更新左侧的预览看板。
    3. 你的 systemPrompt 字段应该包含：性格、口音、纠错严格度、特定场景模拟逻辑等。
    4. 一次只引导一个话题，不要让用户感到困惑。
  `;

  const startVoice = async () => {
    setIsConnecting(true);
    setError(null);
    
    const settings = storageService.getSettings();
    const apiKey = settings.credentials[VoiceProvider.GEMINI] || process.env.API_KEY || '';
    
    if (!apiKey) {
      setError("未检测到 Gemini API Key。请先在设置中配置。");
      setIsConnecting(false);
      return;
    }

    const service = new GeminiLiveService(apiKey);
    serviceRef.current = service;
    
    try {
      await service.connect(systemInstruction, {
        onTranscription: (text, isUser) => {
          if (isUser) {
            // Check if this is the start of a new user turn (not robust but handles common streaming patterns)
            // If the AI just finished speaking, we might want to reset. 
            // However, Gemini Live transcriptions for a single turn are usually deltas.
            accumulatedUserRef.current = (accumulatedUserRef.current + ' ' + text).trim();
            setLastUserText(accumulatedUserRef.current);
          } else {
            accumulatedAiRef.current += text;
            setLastAiText(accumulatedAiRef.current);
          }
        },
        onTurnComplete: () => {
          // When a turn completes, we keep the text visible for a moment but reset refs for the NEXT turn
          // so that new speaking doesn't append to old text indefinitely.
          // Note: In a chat we'd push these to a list. Here we just reset accumulation buffers.
          accumulatedUserRef.current = '';
          accumulatedAiRef.current = '';
        },
        onToolCall: (calls) => {
          calls.forEach(call => {
            if (call.name === 'update_role_draft') {
              setDraft(prev => ({ ...prev, ...call.args }));
            }
          });
        },
        onClose: () => setIsActive(false),
        onError: (err) => {
          console.error(err);
          setError("连接实时服务失败，请检查网络或 Key 有效性。");
        }
      }, tools);
      setIsActive(true);
    } catch (e: any) {
      setError(e.message || "未知错误");
    } finally {
      setIsConnecting(false);
    }
  };

  useEffect(() => {
    startVoice();
    return () => {
      serviceRef.current?.disconnect();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] bg-[#0b0e14]/95 backdrop-blur-xl flex flex-col items-center justify-center p-4 md:p-10">
      <div className="w-full max-w-7xl flex flex-col lg:flex-row gap-8 items-stretch h-[90vh]">
        
        {/* Interaction Hub */}
        <div className="flex-1 bg-[#12161f] rounded-[3.5rem] border border-white/5 p-8 md:p-16 flex flex-col justify-between shadow-3xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-transparent"></div>
          
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 bg-indigo-500/10 rounded-2xl flex items-center justify-center border border-indigo-500/20 shadow-inner">
                <Wand2 className="text-indigo-400" size={32} />
              </div>
              <div>
                <h2 className="text-3xl font-black text-white tracking-tight">AI 角色构思实验室</h2>
                <div className="flex items-center gap-2 mt-1">
                  <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
                  <p className="text-indigo-400 text-[10px] font-black tracking-widest uppercase">
                    {isActive ? '实时链路已就绪' : '正在初始化构思环境...'}
                  </p>
                </div>
              </div>
            </div>
            <button onClick={onClose} className="p-3 bg-white/5 hover:bg-white/10 rounded-full transition-all text-slate-500 hover:text-white">
              <X size={28} />
            </button>
          </div>

          <div className="flex-1 flex flex-col justify-center space-y-12">
            {error ? (
              <div className="p-8 bg-red-500/10 border border-red-500/20 rounded-[2rem] text-center space-y-4">
                <ShieldCheck className="text-red-400 mx-auto" size={48} />
                <p className="text-red-200 font-bold">{error}</p>
                <button onClick={startVoice} className="px-6 py-2 bg-red-500 text-white rounded-xl font-bold">重试连接</button>
              </div>
            ) : (
              <>
                <div className="space-y-4 max-w-2xl">
                  <p className="text-[10px] font-black text-indigo-500/50 uppercase tracking-[0.4em]">Designer Response</p>
                  <p className="text-2xl md:text-3xl text-slate-100 font-medium leading-tight">
                    {isConnecting ? "正在加载设计师意识形态..." : lastAiText || "嘿！我是你的角色设计师。你想创造一个什么样的练习伙伴？告诉我他的性格、语言或是职业。"}
                  </p>
                </div>
                
                {lastUserText && (
                  <div className="space-y-3 bg-white/5 p-8 rounded-[2rem] border border-white/5 self-start animate-in fade-in slide-in-from-left-4">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Your Request</p>
                    <p className="text-lg text-indigo-300 font-semibold italic">"{lastUserText}"</p>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="flex flex-col items-center gap-8 py-4">
            <div className="relative group cursor-pointer">
              <div className="absolute -inset-16 bg-indigo-500/20 rounded-full animate-voice"></div>
              <div className="w-28 h-28 bg-indigo-600 rounded-full flex items-center justify-center shadow-[0_0_80px_rgba(79,70,229,0.5)] relative z-10 hover:scale-105 transition-transform duration-300">
                <Mic size={48} className="text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Live Preview Panel */}
        <div className="w-full lg:w-[500px] bg-white rounded-[3.5rem] p-10 flex flex-col justify-between shadow-4xl relative overflow-hidden">
          <div className="space-y-10 overflow-y-auto pr-2 scrollbar-hide">
            <div className="flex items-center justify-between border-b border-slate-100 pb-6">
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">构思看板</h3>
              <div className="px-3 py-1 bg-violet-50 text-violet-600 text-[10px] font-black rounded-lg uppercase">Live Draft</div>
            </div>
            
            <div className="space-y-6">
              <PreviewField label="导师大名" value={draft.name} placeholder="等待灵感注入..." />
              <div className="grid grid-cols-2 gap-4">
                <PreviewField label="授课语言" value={draft.language} />
                <PreviewField label="导师性格" value={draft.type} />
              </div>
              <PreviewField label="展示简介" value={draft.description} isTextarea />
              <PreviewField label="核心逻辑 (System Prompt)" value={draft.systemPrompt} isTextarea isPrompt />
            </div>
          </div>

          <div className="pt-8 bg-white border-t border-slate-50 mt-4">
            <button 
              disabled={!draft.name || !draft.systemPrompt}
              onClick={() => onComplete(draft)}
              className="w-full py-6 bg-indigo-600 disabled:bg-slate-100 disabled:text-slate-300 text-white rounded-[2rem] font-black shadow-2xl shadow-indigo-900/30 flex items-center justify-center gap-4 transition-all hover:translate-y-[-2px] hover:shadow-indigo-500/40 active:translate-y-[1px]"
            >
              <Check size={24} />
              确认创建此角色
            </button>
            <p className="text-center text-[10px] text-slate-400 mt-4 font-bold uppercase tracking-widest">完成后可在角色库中二次修改</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const PreviewField = ({ label, value, placeholder, isTextarea, isPrompt }: any) => (
  <div className="space-y-2">
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
      {label}
      {value && <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(79,70,229,0.5)]"></div>}
    </label>
    <div className={`w-full px-5 py-4 rounded-2xl border transition-all duration-700 ${
      value ? 'bg-indigo-50/50 border-indigo-100 text-slate-900 shadow-sm' : 'bg-slate-50 border-slate-100 text-slate-300 italic'
    }`}>
      {isTextarea ? (
        <div className={`text-[11px] leading-relaxed max-h-32 overflow-y-auto scrollbar-hide ${isPrompt ? 'font-mono' : ''}`}>
          {value || "AI 正在生成最适合你的教学方案..."}
        </div>
      ) : (
        <p className="text-sm font-black truncate">{value || placeholder}</p>
      )}
    </div>
  </div>
);
