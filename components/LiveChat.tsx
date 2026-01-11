
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { GeminiLiveService } from '../services/geminiLiveService';
import { Role, ChatMessage, Session, Correction, Language } from '../types';
import { storageService } from '../services/storageService';
import { Mic, MicOff, AlertCircle, RefreshCw, X, User, Bot, Volume2, Languages, FileText, BrainCircuit, HelpCircle, Send, Sparkles } from 'lucide-react';

interface LiveChatProps {
  role: Role;
  onClose: () => void;
}

const LiveChat: React.FC<LiveChatProps> = ({ role, onClose }) => {
  const [isActive, setIsActive] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [corrections, setCorrections] = useState<Correction[]>([]);
  
  // 核心转写缓冲区：解决堆叠问题的关键
  const [interimUserText, setInterimUserText] = useState('');
  const [interimAiText, setInterimAiText] = useState('');
  
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showTranslation, setShowTranslation] = useState(true);
  const [sessionSummary, setSessionSummary] = useState<string | null>(null);
  
  // 会话后问答
  const [qaInput, setQaInput] = useState('');
  const [isQaThinking, setIsQaThinking] = useState(false);
  const [qaHistory, setQaHistory] = useState<{q: string, a: string}[]>([]);

  const serviceRef = useRef<GeminiLiveService | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const genAiRef = useRef(new GoogleGenAI({ apiKey: process.env.API_KEY || '' }));

  useEffect(() => {
    scrollToBottom();
  }, [messages, interimUserText, interimAiText, isAiThinking, qaHistory]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const translateText = async (text: string, id: string) => {
    if (!showTranslation || !text.trim()) return;
    try {
      const response = await genAiRef.current.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `你是一位专业的同声传译。请将以下${role.language}内容翻译为自然的中文，只输出翻译文本：\n"${text}"`,
      });
      const translation = response.text?.trim();
      if (translation) {
        setMessages(prev => prev.map(m => m.id === id ? { ...m, translation } : m));
      }
    } catch (e) {
      console.error("Translation Error", e);
    }
  };

  const startSession = async () => {
    setIsConnecting(true);
    const service = new GeminiLiveService(process.env.API_KEY || '');
    serviceRef.current = service;

    try {
      await service.connect(role.systemPrompt, {
        onTranscription: (text, isUser) => {
          if (isUser) {
            setInterimUserText(prev => (prev + ' ' + text).trim());
            setIsAiThinking(false);
          } else {
            setInterimAiText(prev => prev + text);
            setIsAiThinking(false);
          }
        },
        onTurnComplete: () => {
          // 处理用户 Turn 结束
          setInterimUserText(current => {
            if (current.trim()) {
              const id = `u-${Date.now()}`;
              const newMsg: ChatMessage = { id, role: 'user', text: current.trim(), timestamp: new Date().toISOString() };
              setMessages(prev => [...prev, newMsg]);
              translateText(newMsg.text, id);
              checkGrammar(newMsg.text);
              setIsAiThinking(true);
            }
            return '';
          });

          // 处理 AI Turn 结束
          setInterimAiText(current => {
            if (current.trim()) {
              const id = `a-${Date.now()}`;
              const newMsg: ChatMessage = { id, role: 'assistant', text: current.trim(), timestamp: new Date().toISOString() };
              setMessages(prev => [...prev, newMsg]);
              translateText(newMsg.text, id);
              setIsAiThinking(false);
            }
            return '';
          });
        },
        onError: (err) => console.error("Live Session Error:", err),
        onClose: () => setIsActive(false),
      });
      setIsActive(true);
      startTimeRef.current = Date.now();
    } catch (err) {
      console.error(err);
    } finally {
      setIsConnecting(false);
    }
  };

  const checkGrammar = async (text: string) => {
    const lower = text.toLowerCase();
    // 基础启发式纠错示例
    if (lower.includes('i is') || lower.includes('have go')) {
      const correction: Correction = {
        original: text,
        corrected: text.replace(/i is/i, 'I am').replace(/have go/i, 'have gone'),
        explanation: "注意主谓语一致性或完成时用法。",
        timestamp: new Date().toISOString()
      };
      setCorrections(prev => [correction, ...prev]);
    }
  };

  const generateSummary = async () => {
    const history = messages.map(m => `${m.role}: ${m.text}`).join('\n');
    try {
      const response = await genAiRef.current.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `作为语言导师，请对以下对话进行中文总结。包含：1.话题回顾 2.语法建议 3.两个追问练习题。\n\n对话历史：\n${history}`,
      });
      setSessionSummary(response.text || "总结生成失败。");
    } catch (e) {
      setSessionSummary("发生错误，无法生成总结。");
    }
  };

  const endSession = () => {
    serviceRef.current?.disconnect();
    generateSummary();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0b0e14] text-slate-100 animate-in fade-in duration-300">
      {/* 顶部状态栏 */}
      <div className="flex items-center justify-between p-4 border-b border-white/5 bg-[#12161f]/90 backdrop-blur-xl z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
            <Bot className="text-indigo-400" size={20} />
          </div>
          <div>
            <h2 className="font-bold text-slate-200">{role.name}</h2>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <p className="text-[10px] text-slate-500 font-black tracking-widest uppercase">{role.language} • 在线</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
           <button 
            onClick={() => setShowTranslation(!showTranslation)}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-full border text-[10px] font-black transition-all ${
              showTranslation ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-400' : 'bg-transparent border-white/10 text-slate-500'
            }`}
          >
            <Languages size={14} />
            {showTranslation ? '智能翻译' : '原文模式'}
          </button>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400">
            <X size={24} />
          </button>
        </div>
      </div>

      {/* 聊天主界面 */}
      <div className="flex-1 flex overflow-hidden relative">
        <div className="flex-1 flex flex-col p-4 md:p-10 overflow-y-auto scrollbar-hide space-y-8 bg-[#0b0e14]">
          {!isActive && !isConnecting && !sessionSummary && (
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-8 max-w-md mx-auto py-12">
              <div className="relative group">
                <div className="w-32 h-32 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                  <Mic size={64} className="text-indigo-400 group-hover:scale-110 transition-transform" />
                </div>
                <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20 animate-ping"></div>
              </div>
              <div className="space-y-4">
                <h3 className="text-3xl font-black text-white">开始口语冲刺</h3>
                <p className="text-slate-500 text-lg font-medium">与 {role.name} 进行沉浸式对话。我们将通过 Gemini 提供即时反馈。</p>
              </div>
              <button 
                onClick={startSession}
                className="px-14 py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full font-black shadow-2xl shadow-indigo-900/40 transition-all text-lg flex items-center gap-3"
              >
                <Sparkles size={20} />
                开启语音引擎
              </button>
            </div>
          )}

          {isConnecting && (
            <div className="flex-1 flex flex-col items-center justify-center space-y-6">
              <RefreshCw className="text-indigo-500 animate-spin" size={48} />
              <p className="text-indigo-400 font-bold tracking-widest uppercase text-xs">正在建立神经连接...</p>
            </div>
          )}

          {isActive && (
            <div className="flex flex-col space-y-8">
              {/* 已确定的历史消息 */}
              {messages.map((m) => (
                <div key={m.id} className={`flex w-full ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex items-start gap-4 max-w-[85%] md:max-w-[75%] ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border shadow-xl ${
                      m.role === 'user' ? 'bg-indigo-600 border-indigo-500' : 'bg-[#1a1f2e] border-white/5'
                    }`}>
                      {m.role === 'user' ? <User size={18} /> : <Bot size={18} className="text-indigo-400" />}
                    </div>
                    <div className={`flex flex-col space-y-1 ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                      <div className={`p-4 rounded-3xl shadow-2xl transition-all duration-300 animate-in slide-in-from-bottom-2 ${
                        m.role === 'user' 
                          ? 'bg-indigo-600 text-white rounded-tr-none' 
                          : 'bg-[#1a1f2e] text-slate-100 rounded-tl-none border border-white/5'
                      }`}>
                        <p className="text-sm md:text-base leading-relaxed whitespace-pre-wrap font-medium">{m.text}</p>
                        {showTranslation && m.translation && (
                          <div className={`mt-3 pt-3 border-t border-white/10 text-xs md:text-sm font-medium leading-relaxed italic ${
                            m.role === 'user' ? 'text-indigo-100/70' : 'text-slate-500'
                          }`}>
                            {m.translation}
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-600 font-bold px-2 uppercase">
                        {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* 实时转写区：用户（右侧虚线气泡） */}
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

              {/* 实时转写区：AI（左侧流式输出） */}
              {interimAiText && (
                <div className="flex w-full justify-start animate-in fade-in duration-200">
                  <div className="flex items-start gap-4 max-w-[85%] md:max-w-[75%]">
                    <div className="w-10 h-10 rounded-full bg-[#1a1f2e] border border-white/5 flex items-center justify-center shrink-0">
                      <Bot size={18} className="text-indigo-400" />
                    </div>
                    <div className="p-4 rounded-3xl bg-[#1a1f2e] text-slate-100 rounded-tl-none border border-white/5 shadow-2xl">
                      <p className="text-sm md:text-base leading-relaxed">{interimAiText}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* AI 思考中状态 */}
              {isAiThinking && !interimAiText && (
                <div className="flex w-full justify-start">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-[#1a1f2e] border border-white/5 flex items-center justify-center shrink-0">
                      <Bot size={18} className="text-indigo-400" />
                    </div>
                    <div className="flex gap-2 p-4 bg-[#1a1f2e]/50 rounded-full px-7 border border-white/5">
                      <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:0s]"></div>
                      <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                      <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}

          {/* 总结报告页 */}
          {sessionSummary && (
            <div className="max-w-4xl mx-auto w-full py-12 animate-in fade-in slide-in-from-bottom-12 duration-700">
              <div className="bg-[#12161f] border border-white/5 rounded-[3rem] p-8 md:p-14 shadow-2xl space-y-12">
                <div className="flex items-center gap-5 border-b border-white/5 pb-8">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 flex items-center justify-center">
                    <BrainCircuit className="text-indigo-400" size={36} />
                  </div>
                  <h3 className="text-4xl font-black text-white tracking-tighter">智能学习报告</h3>
                </div>
                <div className="prose prose-invert max-w-none bg-[#0b0e14]/60 rounded-[2rem] p-8 border border-white/5">
                   <div className="whitespace-pre-wrap leading-relaxed text-slate-300 font-medium">{sessionSummary}</div>
                </div>
                <div className="flex gap-5">
                  <button onClick={() => location.reload()} className="flex-1 py-5 bg-white/5 border border-white/10 text-white rounded-3xl font-black">重新练习</button>
                  <button onClick={onClose} className="flex-1 py-5 bg-indigo-600 text-white rounded-3xl font-black shadow-2xl shadow-indigo-900/40">完成课程</button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 侧边栏纠错 */}
        {!sessionSummary && (
          <div className="w-96 bg-[#0f131a] border-l border-white/5 p-8 overflow-y-auto hidden xl:block shadow-2xl">
            <div className="flex items-center gap-3 mb-10 pb-6 border-b border-white/5">
              <AlertCircle className="text-amber-500" size={24} />
              <h3 className="font-black text-slate-100 tracking-widest uppercase text-sm">实时纠错建议</h3>
            </div>
            <div className="space-y-6">
              {corrections.length === 0 ? (
                <div className="h-96 flex flex-col items-center justify-center opacity-10 text-center space-y-4">
                  <FileText size={64} />
                  <p className="text-sm font-black uppercase">等待语音输入...</p>
                </div>
              ) : (
                corrections.map((c, i) => (
                  <div key={i} className="p-6 bg-[#1a1f2e] border border-white/5 rounded-[2rem] space-y-4 animate-in slide-in-from-right-4 group">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Feedback {corrections.length - i}</span>
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

      {/* 底部控制栏 */}
      {!sessionSummary && (
        <div className="p-12 flex flex-col items-center bg-[#0b0e14]/98 border-t border-white/5 shadow-2xl">
          {isActive ? (
            <div className="flex flex-col items-center space-y-10">
              <div className="flex items-center gap-24">
                <button className="p-7 rounded-full bg-[#1a1f2e] text-slate-500 hover:text-white transition-all">
                    <MicOff size={36} />
                </button>
                <div className="relative group scale-125">
                  <div className="absolute -inset-10 bg-indigo-600 rounded-full animate-voice opacity-20"></div>
                  <div className="w-32 h-32 bg-indigo-600 rounded-full flex items-center justify-center shadow-[0_0_80px_rgba(79,70,229,0.5)] z-10 relative">
                    <Mic size={56} className="text-white" />
                  </div>
                </div>
                <button onClick={endSession} className="p-7 rounded-full bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition-all">
                  <FileText size={36} />
                </button>
              </div>
              <div className="flex flex-col items-center gap-3">
                <p className="text-[11px] font-black text-indigo-500 tracking-[0.5em] uppercase">神经音频流实时同步中</p>
                <div className="flex gap-1.5 h-4 items-end">
                   {[...Array(12)].map((_, i) => (
                    <div key={i} className={`w-1 bg-indigo-500 rounded-full animate-pulse`} style={{ height: `${30 + Math.random() * 70}%`, animationDelay: `${i * 0.1}s` }}></div>
                  ))}
                </div>
              </div>
            </div>
          ) : !isConnecting && (
            <p className="text-slate-700 text-[11px] font-black tracking-[0.4em] uppercase">LinguistAI Neural Engine Ready</p>
          )}
        </div>
      )}
    </div>
  );
};

export default LiveChat;
