
import React, { useState, useEffect, useRef } from 'react';
import { textAiService } from '../services/textAiService';
import { LiveServiceFactory } from '../services/liveServiceFactory';
import { ILiveVoiceService } from '../services/liveVoiceService';
import { Role, ChatMessage, Session, Correction, Language, KeyPoint, VoiceProvider } from '../types';
import { storageService } from '../services/storageService';
import { Mic, MicOff, AlertCircle, RefreshCw, X, User, Bot, Volume2, Languages, FileText, BrainCircuit, HelpCircle, Send, Sparkles, Skull, Bookmark, BookmarkCheck, Zap, Globe, Shield, Cpu, Flame, Sunrise, Coffee, Briefcase, Sword, Waves, Utensils, Building2 } from 'lucide-react';

interface LiveChatProps {
  role: Role;
  onClose: () => void;
}

const LiveChat: React.FC<LiveChatProps> = ({ role, onClose }) => {
  const [isActive, setIsActive] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [corrections, setCorrections] = useState<Correction[]>([]);
  
  const [interimUserText, setInterimUserText] = useState('');
  const [interimAiText, setInterimAiText] = useState('');
  
  const accumulatedUserRef = useRef('');
  const accumulatedAiRef = useRef('');

  const [isAiThinking, setIsAiThinking] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showTranslation, setShowTranslation] = useState(true);
  const [sessionSummary, setSessionSummary] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  const serviceRef = useRef<ILiveVoiceService | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isStrictRole = role.id === '4' || role.id === '6';
  const isIndianFunny = role.id === '9';
  const isJapaneseFunny = role.id === '10';
  const isCantoneseFunny = role.id === '11';

  useEffect(() => {
    scrollToBottom();
  }, [messages, interimUserText, interimAiText, isAiThinking]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const translateText = async (text: string, id: string) => {
    if (!showTranslation || !text.trim()) return;
    try {
      const translation = await textAiService.generate(`You are a professional translator. Translate this text to natural Chinese. Output ONLY the translation:\n"${text}"`);
      if (translation) {
        setMessages(prev => prev.map(m => m.id === id ? { ...m, translation } : m));
      }
    } catch (e) {
      console.error("Translation Error", e);
    }
  };

  const startSession = async () => {
    setIsConnecting(true);
    setConnectionError(null);
    
    const service = LiveServiceFactory.create(role.provider);
    serviceRef.current = service;

    try {
      if (!window.isSecureContext) {
        throw new Error("语音功能需要 HTTPS 环境或 Localhost 才能运行。");
      }

      await service.connect(role.systemPrompt, {
        onTranscription: (text, isUser) => {
          if (isUser) {
            accumulatedUserRef.current = (accumulatedUserRef.current + ' ' + text).trim();
            setInterimUserText(accumulatedUserRef.current);
            setIsAiThinking(false);
          } else {
            accumulatedAiRef.current += text;
            setInterimAiText(accumulatedAiRef.current);
            setIsAiThinking(false);
          }
        },
        onTurnComplete: () => {
          if (accumulatedUserRef.current.trim()) {
            const id = `u-${Date.now()}-${Math.random()}`;
            const text = accumulatedUserRef.current.trim();
            const newMsg: ChatMessage = { id, role: 'user', text, timestamp: new Date().toISOString() };
            setMessages(prev => [...prev, newMsg]);
            translateText(text, id);
            accumulatedUserRef.current = '';
            setInterimUserText('');
            setIsAiThinking(true);
          }

          if (accumulatedAiRef.current.trim()) {
            const id = `a-${Date.now()}-${Math.random()}`;
            const text = accumulatedAiRef.current.trim();
            const newMsg: ChatMessage = { id, role: 'assistant', text, timestamp: new Date().toISOString() };
            setMessages(prev => [...prev, newMsg]);
            translateText(text, id);
            accumulatedAiRef.current = '';
            setInterimAiText('');
            setIsAiThinking(false);
          }
        },
        onError: (err: any) => {
          console.error("Session Error:", err);
          setConnectionError(err?.message || "与服务器的实时连接中断。");
          setIsActive(false);
        },
        onClose: () => setIsActive(false),
      });
      setIsActive(true);
      startTimeRef.current = Date.now();
    } catch (err: any) {
      console.error("Connection Failed:", err);
      setConnectionError(err?.message || "初始化服务失败。");
    } finally {
      setIsConnecting(false);
    }
  };

  const endSession = () => {
    serviceRef.current?.disconnect();
    const session: Session = {
      id: startTimeRef.current.toString(),
      roleId: role.id,
      startTime: new Date(startTimeRef.current).toISOString(),
      endTime: new Date().toISOString(),
      duration: Math.round((Date.now() - startTimeRef.current) / 1000),
      language: role.language,
      messages,
      corrections,
    };
    storageService.saveSession(session);
    generateSummary();
  };

  const generateSummary = async () => {
    const history = messages.map(m => `${m.role}: ${m.text}`).join('\n');
    try {
      const summary = await textAiService.generate(`你是一位AI导师。请为刚才的会话生成一份学习总结。特别点评一下用户在掌握角色发音神韵方面的表现，给出改进建议。\n\n对话历史：\n${history}`);
      setSessionSummary(summary || "总结生成失败。");
    } catch (e) {
      setSessionSummary("生成总结时出错。");
    }
  };

  const getRoleIcon = (roleId: string, size = 20) => {
    if (roleId === '4') return <Skull className="text-red-400" size={size} />;
    if (roleId === '6') return <Flame className="text-orange-500" size={size} />;
    if (roleId === '9') return <Zap className="text-amber-500" size={size} />;
    if (roleId === '10') return <Sword className="text-rose-500" size={size} />;
    if (roleId === '11') return <Building2 className="text-emerald-500" size={size} />;
    return <Bot className="text-indigo-400" size={size} />;
  };

  const getThemeColors = () => {
    if (isStrictRole) return 'bg-red-950/10 text-red-100';
    if (isIndianFunny) return 'bg-amber-950/10 text-amber-100';
    if (isJapaneseFunny) return 'bg-rose-950/10 text-rose-100';
    if (isCantoneseFunny) return 'bg-[#081a14] text-emerald-50';
    return 'bg-[#0b0e14] text-slate-100';
  };

  const getBubbleStyle = (isAi: boolean) => {
    if (!isAi) return 'bg-indigo-600 text-white rounded-tr-none shadow-lg';
    if (isStrictRole) return 'bg-red-900/30 border-red-500/20 text-red-100 rounded-tl-none border';
    if (isIndianFunny) return 'bg-amber-900/30 border-amber-500/20 text-amber-100 rounded-tl-none border';
    if (isJapaneseFunny) return 'bg-rose-900/30 border-rose-500/20 text-rose-100 rounded-tl-none border';
    if (isCantoneseFunny) return 'bg-emerald-900/20 border-emerald-500/20 text-emerald-100 rounded-tl-none border backdrop-blur-md shadow-[0_4px_20px_rgba(16,185,129,0.1)]';
    return 'bg-[#1a1f2e] border-white/5 text-slate-100 rounded-tl-none border';
  };

  return (
    <div className={`fixed inset-0 z-50 flex flex-col ${getThemeColors()} animate-in fade-in duration-300`}>
      <div className={`flex items-center justify-between p-4 border-b border-white/5 ${isStrictRole ? 'bg-red-900/40' : isIndianFunny ? 'bg-amber-900/40' : isJapaneseFunny ? 'bg-rose-900/40' : isCantoneseFunny ? 'bg-emerald-900/40 border-emerald-500/20' : 'bg-[#12161f]/90'} backdrop-blur-xl z-20`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-black/20 border border-white/10">
            {getRoleIcon(role.id)}
          </div>
          <div>
            <h2 className="font-bold">{role.name}</h2>
            <div className="flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`}></span>
              <p className="text-[10px] text-slate-400 font-black tracking-widest uppercase">{role.language} • {role.provider}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowTranslation(!showTranslation)} className={`px-4 py-1.5 rounded-full border text-[10px] font-black transition-all ${showTranslation ? 'bg-white/10 border-white/20' : 'bg-transparent border-white/5 text-slate-500'}`}>
            {showTranslation ? '翻译开启' : '原文模式'}
          </button>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400">
            <X size={24} />
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        <div className="flex-1 flex flex-col p-4 md:p-10 overflow-y-auto scrollbar-hide space-y-8 bg-[#0b0e14]">
          {!isActive && !isConnecting && !sessionSummary && (
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-8 max-w-md mx-auto py-12">
              <div className="relative">
                <div className={`w-32 h-32 rounded-full flex items-center justify-center border-2 ${isIndianFunny ? 'bg-amber-500/10 border-amber-500/20' : isJapaneseFunny ? 'bg-rose-500/10 border-rose-500/20' : isCantoneseFunny ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-indigo-500/10 border-indigo-500/20'}`}>
                   {getRoleIcon(role.id, 64)}
                </div>
                <div className={`absolute -inset-4 rounded-full border animate-ping opacity-20 ${isIndianFunny ? 'border-amber-500' : isJapaneseFunny ? 'border-rose-500' : isCantoneseFunny ? 'border-emerald-500' : 'border-indigo-500'}`}></div>
              </div>
              <div className="space-y-2">
                <h3 className="text-3xl font-black text-white">
                  {isCantoneseFunny ? '雷吼啊！想学煲冬瓜？' : isIndianFunny ? 'Namaste! Ready to搖?' : isJapaneseFunny ? 'Domo! Let\'s Speak Katakana!' : '开始练习'}
                </h3>
                <p className="text-slate-400 text-sm">{role.description}</p>
              </div>
              <button onClick={startSession} className={`px-14 py-5 rounded-full font-black shadow-2xl transition-all text-lg ${isCantoneseFunny ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/40' : isIndianFunny ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-900/40' : isJapaneseFunny ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-900/40' : 'bg-indigo-600 hover:bg-indigo-500'}`}>
                {isCantoneseFunny ? '中环开练' : '开启灵魂教学'}
              </button>
            </div>
          )}

          {isConnecting && (
            <div className="flex-1 flex flex-col items-center justify-center space-y-6">
              <RefreshCw className="text-indigo-500 animate-spin" size={64} />
              <p className="text-indigo-400 font-bold tracking-widest uppercase text-xs">正在建立灵魂连接...</p>
            </div>
          )}

          {isActive && (
            <div className="flex flex-col space-y-8 pb-32">
              {messages.map((m) => (
                <div key={m.id} className={`flex w-full ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex items-start gap-4 max-w-[85%] md:max-w-[75%] ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border ${m.role === 'user' ? 'bg-indigo-600 border-indigo-500' : 'bg-[#1a1f2e] border-white/10'}`}>
                      {m.role === 'user' ? <User size={18} /> : getRoleIcon(role.id, 18)}
                    </div>
                    <div className={`flex flex-col space-y-1 ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                      <div className={getBubbleStyle(m.role === 'assistant')}>
                        <p className="text-sm md:text-base leading-relaxed p-4">{m.text}</p>
                        {showTranslation && m.translation && (
                          <div className="mt-2 pt-3 border-t border-white/10 text-xs italic px-4 pb-4 opacity-70">
                            {m.translation}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {interimUserText && (
                <div className="flex w-full justify-end animate-in fade-in">
                  <div className="flex flex-row-reverse items-start gap-4 max-w-[85%] md:max-w-[75%]">
                    <div className="w-10 h-10 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
                      <User size={18} className="text-indigo-400 animate-pulse" />
                    </div>
                    <div className="p-4 rounded-3xl bg-indigo-600/10 border-2 border-dashed border-indigo-500/30 text-indigo-200/50 italic rounded-tr-none">
                      <p className="text-sm">{interimUserText}...</p>
                    </div>
                  </div>
                </div>
              )}

              {interimAiText && (
                <div className="flex w-full justify-start animate-in fade-in">
                  <div className="flex items-start gap-4 max-w-[85%] md:max-w-[75%]">
                    <div className="w-10 h-10 rounded-full bg-[#1a1f2e] border border-white/5 flex items-center justify-center shrink-0">
                      {getRoleIcon(role.id, 18)}
                    </div>
                    <div className={getBubbleStyle(true)}>
                      <p className="text-sm md:text-base p-4">{interimAiText}</p>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}

          {sessionSummary && (
            <div className="max-w-4xl mx-auto w-full py-12 animate-in slide-in-from-bottom-12">
              <div className={`border border-white/5 rounded-[3rem] p-8 md:p-14 shadow-2xl space-y-12 ${isCantoneseFunny ? 'bg-[#081a14]' : 'bg-[#12161f]'}`}>
                <div className="flex items-center gap-5 border-b border-white/5 pb-8">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${isCantoneseFunny ? 'bg-emerald-500/20' : 'bg-indigo-500/20'}`}>
                    <BrainCircuit className={isCantoneseFunny ? 'text-emerald-400' : 'text-indigo-400'} size={36} />
                  </div>
                  <h3 className="text-4xl font-black text-white">对话学成报告</h3>
                </div>
                <div className="prose prose-invert max-w-none text-slate-300 whitespace-pre-wrap leading-relaxed">
                   {sessionSummary}
                </div>
                <div className="flex gap-5">
                  <button onClick={() => location.reload()} className="flex-1 py-5 bg-white/5 border border-white/10 text-white rounded-3xl font-black">再战一次</button>
                  <button onClick={onClose} className="flex-1 py-5 bg-indigo-600 text-white rounded-3xl font-black">完成</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {!sessionSummary && isActive && (
        <div className={`fixed bottom-0 left-0 right-0 p-12 flex flex-col items-center backdrop-blur-md border-t border-white/5 z-30 ${isIndianFunny ? 'bg-amber-950/20' : isJapaneseFunny ? 'bg-rose-950/20' : isCantoneseFunny ? 'bg-emerald-950/40' : 'bg-black/50'}`}>
          <div className="flex items-center gap-16">
            <button className="p-6 rounded-full bg-white/5 text-slate-500">
                <MicOff size={32} />
            </button>
            <div className="relative group">
              <div className={`absolute -inset-10 rounded-full animate-voice opacity-20 ${isIndianFunny ? 'bg-amber-500' : isJapaneseFunny ? 'bg-rose-500' : isCantoneseFunny ? 'bg-emerald-500' : 'bg-indigo-600'}`}></div>
              <div className={`w-24 h-24 rounded-full flex items-center justify-center shadow-2xl z-10 relative ${isIndianFunny ? 'bg-amber-600' : isJapaneseFunny ? 'bg-rose-600' : isCantoneseFunny ? 'bg-emerald-600' : 'bg-indigo-600'}`}>
                <Mic size={40} className="text-white" />
              </div>
            </div>
            <button onClick={endSession} className="p-6 rounded-full bg-rose-500/10 text-rose-500 hover:bg-rose-500/20">
              <FileText size={32} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveChat;
