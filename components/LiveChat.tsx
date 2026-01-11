
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { LiveServiceFactory } from '../services/liveServiceFactory';
import { ILiveVoiceService } from '../services/liveVoiceService';
import { Role, ChatMessage, Session, Correction, Language, KeyPoint, VoiceProvider } from '../types';
import { storageService } from '../services/storageService';
import { Mic, MicOff, AlertCircle, RefreshCw, X, User, Bot, Volume2, Languages, FileText, BrainCircuit, HelpCircle, Send, Sparkles, Skull, Bookmark, BookmarkCheck, Zap, Globe, Shield, Cpu } from 'lucide-react';

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

  useEffect(() => {
    scrollToBottom();
  }, [messages, interimUserText, interimAiText, isAiThinking]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const translateText = async (text: string, id: string) => {
    if (!showTranslation || !text.trim()) return;
    try {
      // Create a fresh instance for the call as per SDK guidelines to ensure latest configuration
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `You are a professional translator. Translate this ${role.language} text to natural Chinese. Output ONLY the translation:\n"${text}"`,
      });
      const translation = response.text?.trim();
      if (translation) {
        setMessages(prev => prev.map(m => m.id === id ? { ...m, translation } : m));
      }
    } catch (e) {
      console.error("Translation Error", e);
    }
  };

  const togglePinMessage = (msg: ChatMessage) => {
    const isNowPinned = !msg.isPinned;
    setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isPinned: isNowPinned } : m));

    if (isNowPinned) {
      const kp: KeyPoint = {
        id: msg.id,
        sessionId: startTimeRef.current.toString(),
        roleName: role.name,
        content: msg.text,
        translation: msg.translation,
        timestamp: new Date().toISOString()
      };
      storageService.saveKeyPoint(kp);
    } else {
      storageService.deleteKeyPoint(msg.id);
    }
  };

  const startSession = async () => {
    setIsConnecting(true);
    setConnectionError(null);
    
    // 动态创建服务
    const service = LiveServiceFactory.create(role.provider);
    serviceRef.current = service;

    try {
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
            checkGrammar(text);
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
        onError: (err) => {
          console.error("Session Error:", err);
          setConnectionError(err.message || "连接服务商失败，请检查网络或 API Key。");
          setIsConnecting(false);
        },
        onClose: () => setIsActive(false),
      });
      setIsActive(true);
      startTimeRef.current = Date.now();
    } catch (err: any) {
      setConnectionError(err.message || "无法初始化语音服务。");
    } finally {
      setIsConnecting(false);
    }
  };

  const checkGrammar = async (text: string) => {
    // 简单的关键词校验，实际应调用 AI
    const lower = text.toLowerCase();
    if (lower.includes('i is') || lower.includes('have go') || lower.includes('me like')) {
      const correction: Correction = {
        original: text,
        corrected: text.replace(/i is/i, 'I am').replace(/have go/i, 'have gone').replace(/me like/i, 'I like'),
        explanation: "检测到基础语法错误（主谓一致或时态）。",
        timestamp: new Date().toISOString()
      };
      setCorrections(prev => [correction, ...prev]);
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
      // Create a fresh instance for the call as per SDK guidelines
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `你是一位AI导师。请为刚才的会话生成一份中文学习总结。指出语法错误，并给出2个后续练习建议。\n\n对话历史：\n${history}`,
      });
      setSessionSummary(response.text || "总结生成失败。");
    } catch (e) {
      setSessionSummary("生成总结时出错。");
    }
  };

  const getProviderIcon = (provider: VoiceProvider) => {
    switch (provider) {
      case VoiceProvider.GEMINI: return <Sparkles size={14} className="text-blue-400" />;
      case VoiceProvider.ZHIPU_GLM: return <Zap size={14} className="text-amber-400" />;
      case VoiceProvider.OPENAI: return <Globe size={14} className="text-emerald-400" />;
      // Fix: Added missing Cpu import from lucide-react (line 189 fix)
      default: return <Cpu size={14} />;
    }
  };

  return (
    <div className={`fixed inset-0 z-50 flex flex-col ${role.id === '4' ? 'bg-red-950/10' : 'bg-[#0b0e14]'} text-slate-100 animate-in fade-in duration-300`}>
      {/* Top Header */}
      <div className={`flex items-center justify-between p-4 border-b border-white/5 ${role.id === '4' ? 'bg-red-900/20' : 'bg-[#12161f]/90'} backdrop-blur-xl z-20`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${role.id === '4' ? 'bg-red-500/20 border border-red-500/30' : 'bg-indigo-500/10 border border-indigo-500/20'}`}>
            {role.id === '4' ? <Skull className="text-red-400" size={20} /> : <Bot className="text-indigo-400" size={20} />}
          </div>
          <div>
            <h2 className="font-bold">{role.name}</h2>
            <div className="flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${isActive ? 'bg-emerald-500' : 'bg-slate-500'}`}></span>
              <p className="text-[10px] text-slate-500 font-black tracking-widest uppercase flex items-center gap-1">
                {role.language} • {role.provider} {getProviderIcon(role.provider)}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
           <button onClick={() => setShowTranslation(!showTranslation)} className={`flex items-center gap-2 px-4 py-1.5 rounded-full border text-[10px] font-black transition-all ${showTranslation ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-400' : 'bg-transparent border-white/10 text-slate-500'}`}>
            <Languages size={14} />
            {showTranslation ? '翻译开启' : '原文模式'}
          </button>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400">
            <X size={24} />
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        <div className="flex-1 flex flex-col p-4 md:p-10 overflow-y-auto scrollbar-hide space-y-8 bg-[#0b0e14]">
          {/* Landing State */}
          {!isActive && !isConnecting && !sessionSummary && (
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-8 max-w-md mx-auto py-12">
              <div className="relative group">
                <div className={`w-32 h-32 rounded-full flex items-center justify-center border-2 ${role.id === '4' ? 'bg-red-500/10 border-red-500/20' : 'bg-indigo-500/10 border-indigo-500/20'}`}>
                   {role.id === '4' ? <Skull size={64} className="text-red-500" /> : <Mic size={64} className="text-indigo-400" />}
                </div>
                <div className={`absolute inset-0 rounded-full border-4 animate-ping ${role.id === '4' ? 'border-red-500/20' : 'border-indigo-500/20'}`}></div>
              </div>
              <div className="space-y-4">
                <h3 className="text-3xl font-black text-white">{role.id === '4' ? '准备好面对挑战了吗？' : '开始语音练习'}</h3>
                <div className="flex items-center justify-center gap-2 bg-white/5 py-2 px-4 rounded-full border border-white/10">
                  {getProviderIcon(role.provider)}
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">基于 {role.provider} 驱动</p>
                </div>
                <p className="text-slate-400 text-sm leading-relaxed px-4">{role.description}</p>
              </div>

              {connectionError && (
                <div className="w-full p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3 text-left">
                  <AlertCircle className="text-red-500 shrink-0" size={18} />
                  <p className="text-xs text-red-400 font-medium leading-relaxed">{connectionError}</p>
                </div>
              )}

              <button onClick={startSession} className={`px-14 py-5 rounded-full font-black shadow-2xl transition-all text-lg flex items-center gap-3 ${role.id === '4' ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-900/40' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-900/40'}`}>
                <Sparkles size={20} />
                {connectionError ? '重试连接' : '开启连接'}
              </button>
            </div>
          )}

          {/* Connecting State */}
          {isConnecting && (
            <div className="flex-1 flex flex-col items-center justify-center space-y-6">
              <div className="relative">
                <RefreshCw className="text-indigo-500 animate-spin" size={64} />
                <div className="absolute inset-0 flex items-center justify-center">
                  {getProviderIcon(role.provider)}
                </div>
              </div>
              <div className="text-center space-y-2">
                <p className="text-indigo-400 font-bold tracking-widest uppercase text-xs">正在请求 {role.provider} ...</p>
                <p className="text-slate-500 text-[10px] animate-pulse">正在握手并初始化实时音频通道</p>
              </div>
            </div>
          )}

          {/* Chat Messages */}
          {isActive && (
            <div className="flex flex-col space-y-8">
              {messages.map((m) => (
                <div key={m.id} className={`flex w-full group/msg ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex items-start gap-4 max-w-[85%] md:max-w-[75%] ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border shadow-xl ${m.role === 'user' ? 'bg-indigo-600 border-indigo-500' : 'bg-[#1a1f2e] border-white/5'}`}>
                      {m.role === 'user' ? <User size={18} /> : (role.id === '4' ? <Skull size={18} className="text-red-400" /> : <Bot size={18} className="text-indigo-400" />)}
                    </div>
                    <div className={`flex flex-col space-y-1 ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                      <div className="relative">
                        <button onClick={() => togglePinMessage(m)} className={`absolute top-0 ${m.role === 'user' ? '-left-8' : '-right-8'} p-1.5 rounded-full transition-all opacity-0 group-hover/msg:opacity-100 hover:bg-white/10 ${m.isPinned ? 'text-amber-400 opacity-100' : 'text-slate-600 hover:text-slate-300'}`}>
                          {m.isPinned ? <BookmarkCheck size={18} fill="currentColor" /> : <Bookmark size={18} />}
                        </button>
                        <div className={`p-4 rounded-3xl shadow-2xl transition-all duration-300 animate-in slide-in-from-bottom-2 ${m.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : `bg-[#1a1f2e] text-slate-100 rounded-tl-none border ${role.id === '4' ? 'border-red-500/10' : 'border-white/5'}`} ${m.isPinned ? 'ring-2 ring-amber-500/30' : ''}`}>
                          <p className="text-sm md:text-base leading-relaxed whitespace-pre-wrap font-medium">{m.text}</p>
                          {showTranslation && m.translation && (
                            <div className={`mt-3 pt-3 border-t border-white/10 text-xs md:text-sm font-medium leading-relaxed italic ${m.role === 'user' ? 'text-indigo-100/70' : 'text-slate-500'}`}>
                              {m.translation}
                            </div>
                          )}
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-600 font-bold px-2 uppercase flex items-center gap-2">
                        {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {m.isPinned && <span className="text-amber-500 flex items-center gap-0.5"><Bookmark size={10} fill="currentColor" />已记重点</span>}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              {/* Interim Text */}
              {interimUserText && (
                <div className="flex w-full justify-end animate-in fade-in duration-200">
                  <div className="flex flex-row-reverse items-start gap-4 max-w-[85%] md:max-w-[75%]">
                    <div className="w-10 h-10 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
                      <User size={18} className="text-indigo-400 animate-pulse" />
                    </div>
                    <div className="p-4 rounded-3xl bg-indigo-600/10 border-2 border-dashed border-indigo-500/30 text-indigo-100/70 italic shadow-lg rounded-tr-none">
                      <p className="text-sm">{interimUserText}<span className="animate-pulse">...</span></p>
                    </div>
                  </div>
                </div>
              )}
              {interimAiText && (
                <div className="flex w-full justify-start animate-in fade-in duration-200">
                  <div className="flex items-start gap-4 max-w-[85%] md:max-w-[75%]">
                    <div className="w-10 h-10 rounded-full bg-[#1a1f2e] border border-white/5 flex items-center justify-center shrink-0">
                      {role.id === '4' ? <Skull size={18} className="text-red-400" /> : <Bot size={18} className="text-indigo-400" />}
                    </div>
                    <div className={`p-4 rounded-3xl bg-[#1a1f2e] text-slate-100 rounded-tl-none border shadow-2xl ${role.id === '4' ? 'border-red-500/20' : 'border-white/5'}`}>
                      <p className="text-sm md:text-base leading-relaxed">{interimAiText}</p>
                    </div>
                  </div>
                </div>
              )}
              {isAiThinking && !interimAiText && (
                <div className="flex w-full justify-start">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-[#1a1f2e] border border-white/5 flex items-center justify-center shrink-0">
                      {role.id === '4' ? <Skull size={18} className="text-red-400" /> : <Bot size={18} className="text-indigo-400" />}
                    </div>
                    <div className="flex gap-2 p-4 bg-[#1a1f2e]/50 rounded-full px-7 border border-white/5">
                      <div className={`w-2 h-2 rounded-full animate-bounce [animation-delay:0s] ${role.id === '4' ? 'bg-red-500' : 'bg-indigo-500'}`}></div>
                      <div className={`w-2 h-2 rounded-full animate-bounce [animation-delay:0.2s] ${role.id === '4' ? 'bg-red-500' : 'bg-indigo-500'}`}></div>
                      <div className={`w-2 h-2 rounded-full animate-bounce [animation-delay:0.4s] ${role.id === '4' ? 'bg-red-500' : 'bg-indigo-500'}`}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}

          {/* Summary State */}
          {sessionSummary && (
            <div className="max-w-4xl mx-auto w-full py-12 animate-in fade-in slide-in-from-bottom-12 duration-700">
              <div className="bg-[#12161f] border border-white/5 rounded-[3rem] p-8 md:p-14 shadow-2xl space-y-12">
                <div className="flex items-center gap-5 border-b border-white/5 pb-8">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 flex items-center justify-center">
                    <BrainCircuit className="text-indigo-400" size={36} />
                  </div>
                  <h3 className="text-4xl font-black text-white tracking-tighter">本场学习报告</h3>
                </div>
                <div className="prose prose-invert max-w-none bg-[#0b0e14]/60 rounded-[2rem] p-8 border border-white/5">
                   <div className="whitespace-pre-wrap leading-relaxed text-slate-300 font-medium">{sessionSummary}</div>
                </div>
                <div className="flex gap-5">
                  <button onClick={() => location.reload()} className="flex-1 py-5 bg-white/5 border border-white/10 text-white rounded-3xl font-black">重新练习</button>
                  <button onClick={onClose} className="flex-1 py-5 bg-indigo-600 text-white rounded-3xl font-black shadow-2xl shadow-indigo-900/40">回到主页</button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Feedback Sidebar */}
        {!sessionSummary && (
          <div className="w-96 bg-[#0f131a] border-l border-white/5 p-8 overflow-y-auto hidden xl:block shadow-2xl">
            <div className="flex items-center gap-3 mb-10 pb-6 border-b border-white/5">
              <Shield className="text-indigo-400" size={24} />
              <h3 className="font-black text-slate-100 tracking-widest uppercase text-sm">引擎监控</h3>
            </div>
            <div className="mb-8 p-5 bg-indigo-500/10 rounded-3xl border border-indigo-500/20 space-y-3">
               <div className="flex items-center justify-between">
                 <span className="text-[10px] font-black text-slate-500 uppercase">供应商状态</span>
                 <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[9px] font-black rounded-full">ACTIVE</span>
               </div>
               <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                    {getProviderIcon(role.provider)}
                 </div>
                 <p className="text-xs font-bold text-slate-200">{role.provider}</p>
               </div>
            </div>

            <div className="flex items-center gap-3 mb-6 pb-2">
              <AlertCircle className="text-amber-500" size={18} />
              <h3 className="font-black text-slate-100 tracking-widest uppercase text-[10px]">语法侦测</h3>
            </div>
            <div className="space-y-6">
              {corrections.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center opacity-10 text-center space-y-4">
                  <FileText size={48} />
                  <p className="text-[10px] font-black uppercase tracking-widest">等待对话生成反馈...</p>
                </div>
              ) : (
                corrections.map((c, i) => (
                  <div key={i} className={`p-6 bg-[#1a1f2e] border rounded-[2rem] space-y-4 animate-in slide-in-from-right-4 group ${role.id === '4' ? 'border-red-500/30' : 'border-white/5'}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">建议修改</span>
                      <Volume2 size={14} className="text-amber-500" />
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs text-rose-500/60 line-through">"{c.original}"</p>
                      <p className="text-sm text-emerald-400 font-black">"{c.corrected}"</p>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed font-bold bg-black/20 p-3 rounded-xl">{c.explanation}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Mic Controls */}
      {!sessionSummary && (
        <div className={`p-12 flex flex-col items-center border-t border-white/5 shadow-2xl ${role.id === '4' ? 'bg-red-950/20' : 'bg-[#0b0e14]/98'}`}>
          {isActive ? (
            <div className="flex flex-col items-center space-y-10">
              <div className="flex items-center gap-24">
                <button className="p-7 rounded-full bg-[#1a1f2e] text-slate-500 hover:text-white transition-all shadow-xl">
                    <MicOff size={36} />
                </button>
                <div className="relative group scale-125">
                  <div className={`absolute -inset-10 rounded-full animate-voice opacity-20 ${role.id === '4' ? 'bg-red-600' : 'bg-indigo-600'}`}></div>
                  <div className={`w-32 h-32 rounded-full flex items-center justify-center shadow-2xl z-10 relative border-4 border-white/5 ${role.id === '4' ? 'bg-red-600 shadow-red-900/50' : 'bg-indigo-600 shadow-indigo-900/50'}`}>
                    <Mic size={56} className="text-white" />
                  </div>
                </div>
                <button onClick={endSession} className="p-7 rounded-full bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition-all shadow-xl">
                  <FileText size={36} />
                </button>
              </div>
              <div className="flex flex-col items-center gap-3">
                <p className={`text-[11px] font-black tracking-[0.5em] uppercase ${role.id === '4' ? 'text-red-500' : 'text-indigo-500'}`}>
                  {role.id === '4' ? '实时连接中' : '语音通道已激活'}
                </p>
                <div className="flex gap-1.5 h-4 items-end">
                   {[...Array(12)].map((_, i) => (
                    <div key={i} className={`w-1 rounded-full animate-pulse ${role.id === '4' ? 'bg-red-500' : 'bg-indigo-500'}`} style={{ height: `${30 + Math.random() * 70}%`, animationDelay: `${i * 0.1}s` }}></div>
                   ))}
                </div>
              </div>
            </div>
          ) : !isConnecting && (
            <p className="text-slate-700 text-[11px] font-black tracking-[0.4em] uppercase">Ready to Start</p>
          )}
        </div>
      )}
    </div>
  );
};

export default LiveChat;
