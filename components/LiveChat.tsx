
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { GeminiLiveService } from '../services/geminiLiveService';
import { Role, ChatMessage, Session, Correction, Language } from '../types';
import { storageService } from '../services/storageService';
import { Mic, MicOff, AlertCircle, RefreshCw, X, User, Bot, Volume2, Languages, FileText, BrainCircuit, HelpCircle, Send, CheckCircle2 } from 'lucide-react';

interface LiveChatProps {
  role: Role;
  onClose: () => void;
}

const LiveChat: React.FC<LiveChatProps> = ({ role, onClose }) => {
  const [isActive, setIsActive] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [corrections, setCorrections] = useState<Correction[]>([]);
  const [currentTranscription, setCurrentTranscription] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showTranslation, setShowTranslation] = useState(true);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [sessionSummary, setSessionSummary] = useState<string | null>(null);
  
  // 会话后问答状态
  const [qaInput, setQaInput] = useState('');
  const [isQaThinking, setIsQaThinking] = useState(false);
  const [qaHistory, setQaHistory] = useState<{q: string, a: string}[]>([]);

  const serviceRef = useRef<GeminiLiveService | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const genAiRef = useRef(new GoogleGenAI({ apiKey: process.env.API_KEY || '' }));

  useEffect(() => {
    scrollToBottom();
  }, [messages, currentTranscription, isAiThinking, qaHistory]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // 智能翻译函数
  const translateText = async (text: string, id: string) => {
    if (!showTranslation || !text.trim()) return;
    try {
      const response = await genAiRef.current.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `你是一个语言学习助手。请将以下${role.language}对话内容翻译成自然、准确的中文，只输出翻译结果：\n"${text}"`,
      });
      const translation = response.text?.trim();
      if (translation) {
        setMessages(prev => prev.map(m => m.id === id ? { ...m, translation } : m));
      }
    } catch (e) {
      console.error("翻译请求失败", e);
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
            // 用户说话：更新当前正在转写的临时文本
            setCurrentTranscription(prev => (prev + ' ' + text).trim());
            setIsAiThinking(false);
          } else {
            // AI 说话：实时流式追加到最后一条 AI 消息中
            setIsAiThinking(false);
            setMessages(prev => {
              const last = prev[prev.length - 1];
              if (last && last.role === 'assistant' && !last.translation) {
                return [...prev.slice(0, -1), { ...last, text: last.text + text }];
              }
              const newId = `ai-${Date.now()}-${Math.random()}`;
              return [...prev, { id: newId, role: 'assistant', text, timestamp: new Date().toISOString() }];
            });
          }
        },
        onTurnComplete: () => {
          setMessages(prev => {
            const nextMessages = [...prev];
            
            // 1. 如果有用户转写内容，将其“固化”为正式消息并翻译
            if (currentTranscription.trim()) {
              const uId = `user-${Date.now()}`;
              const userMsg: ChatMessage = { 
                id: uId, 
                role: 'user', 
                text: currentTranscription.trim(), 
                timestamp: new Date().toISOString() 
              };
              translateText(userMsg.text, uId);
              checkGrammar(userMsg.text);
              setCurrentTranscription('');
              setIsAiThinking(true);
              nextMessages.push(userMsg);
            } else {
              // 2. 如果是 AI 说话结束，为最后一条 AI 消息触发翻译
              const last = nextMessages[nextMessages.length - 1];
              if (last && last.role === 'assistant' && !last.translation) {
                translateText(last.text, last.id);
              }
            }
            return nextMessages;
          });
        },
        onError: (err) => console.error("连接异常:", err),
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
    // 启发式反馈（可扩展为调用 LLM 进行深度纠错）
    const lower = text.toLowerCase();
    if (lower.includes('i is') || lower.includes('go yesterday')) {
      const correction: Correction = {
        original: text,
        corrected: text.replace(/i is/i, 'I am').replace(/go yesterday/i, 'went yesterday'),
        explanation: "注意主谓一致或动词过去式用法。",
        timestamp: new Date().toISOString()
      };
      setCorrections(prev => [correction, ...prev]);
    }
  };

  const generateSummary = async () => {
    setIsSummarizing(true);
    const history = messages.map(m => `${m.role === 'user' ? '用户' : 'AI'}: ${m.text}`).join('\n');
    try {
      const response = await genAiRef.current.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `请分析这段${role.language}学习对话，提供一份详细的中文总结报告。要求包括：
1. 话题回顾：简述我们聊了什么。
2. 表现亮点：用户做得好的地方。
3. 改进建议：常见的语法或词汇建议。
4. 挑战：列出2个基于对话背景的测试题。

对话历史：\n${history}`,
      });
      setSessionSummary(response.text || "未能生成总结。");
    } catch (e) {
      setSessionSummary("总结生成出错，请稍后查看。");
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleAskQuestion = async () => {
    if (!qaInput.trim()) return;
    const q = qaInput;
    setQaInput('');
    setIsQaThinking(true);
    
    const history = messages.map(m => `${m.role}: ${m.text}`).join('\n');
    try {
      const response = await genAiRef.current.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `你是一位语言老师。用户正针对刚刚完成的对话内容向你提问。请结合上下文给出详细、专业的中文解答。
        
        用户问题: "${q}"
        对话上下文: \n${history}`,
      });
      setQaHistory(prev => [...prev, { q, a: response.text || '老师开小差了，没能回答。' }]);
    } catch (e) {
      setQaHistory(prev => [...prev, { q, a: '发生网络错误，请重试。' }]);
    } finally {
      setIsQaThinking(false);
    }
  };

  const endSession = () => {
    serviceRef.current?.disconnect();
    const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
    
    const session: Session = {
      id: Date.now().toString(),
      roleId: role.id,
      startTime: new Date(startTimeRef.current).toISOString(),
      endTime: new Date().toISOString(),
      duration,
      language: role.language,
      messages,
      corrections,
    };

    storageService.saveSession(session);
    generateSummary();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0b0e14] text-slate-100 animate-in fade-in duration-300">
      {/* 头部：控制条 */}
      <div className="flex items-center justify-between p-4 border-b border-white/5 bg-[#12161f]/95 backdrop-blur-2xl z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
            <Bot className="text-indigo-400" size={20} />
          </div>
          <div>
            <h2 className="font-bold text-slate-100">{role.name}</h2>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{role.language} • LIVE</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
           <button 
            onClick={() => setShowTranslation(!showTranslation)}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-full border text-[11px] font-black tracking-tighter transition-all ${
              showTranslation ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400' : 'bg-transparent border-white/10 text-slate-500'
            }`}
          >
            <Languages size={14} />
            {showTranslation ? '显示翻译' : '原文模式'}
          </button>
          <button 
            onClick={isActive ? endSession : onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400"
          >
            <X size={24} />
          </button>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* 对话列表 */}
        <div className="flex-1 flex flex-col p-4 md:p-8 overflow-y-auto space-y-6 scrollbar-hide bg-[#0b0e14]">
          {!isActive && !isConnecting && !sessionSummary && (
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-8 max-w-lg mx-auto">
              <div className="w-32 h-32 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center relative group">
                <Mic size={64} className="text-indigo-400 group-hover:scale-110 transition-transform" />
                <div className="absolute inset-0 rounded-full border-4 border-indigo-500/30 animate-ping"></div>
              </div>
              <div className="space-y-4">
                <h3 className="text-4xl font-black text-white leading-tight tracking-tight">Ready to Practice?</h3>
                <p className="text-slate-500 text-lg font-medium leading-relaxed">
                  点击下方按钮，开始与 {role.name} 进行沉浸式{role.language}对话。我们将实时为您纠错并提供翻译。
                </p>
              </div>
              <button 
                onClick={startSession}
                className="px-14 py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full font-black transition-all shadow-2xl shadow-indigo-900/40 text-lg hover:-translate-y-1 active:scale-95 flex items-center gap-3"
              >
                <Mic size={24} />
                开启语音对话
              </button>
            </div>
          )}

          {isConnecting && (
            <div className="flex-1 flex flex-col items-center justify-center space-y-6">
              <RefreshCw className="text-indigo-500 animate-spin" size={48} />
              <p className="text-indigo-400 font-black tracking-widest uppercase text-xs animate-pulse">正在唤醒 AI 导师...</p>
            </div>
          )}

          {isActive && (
            <div className="flex flex-col space-y-8">
              {messages.map((m) => (
                <div key={m.id} className={`flex w-full ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex items-start gap-4 max-w-[85%] md:max-w-[70%] ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border shadow-lg ${
                      m.role === 'user' ? 'bg-indigo-600 border-indigo-500 shadow-indigo-500/20' : 'bg-[#1a1f2e] border-white/5 shadow-black/20'
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
                      <span className="text-[10px] text-slate-600 font-bold px-2 tracking-tighter uppercase">
                        {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              
              {currentTranscription && (
                <div className="flex w-full justify-end">
                  <div className="flex flex-row-reverse items-start gap-4 max-w-[85%] md:max-w-[70%]">
                    <div className="w-10 h-10 rounded-full bg-indigo-600/30 flex items-center justify-center shrink-0 border border-indigo-500/20">
                      <User size={18} className="opacity-50" />
                    </div>
                    <div className="p-4 rounded-3xl bg-indigo-600/20 border border-indigo-500/30 text-white italic shadow-lg rounded-tr-none">
                      <p className="text-sm opacity-80">{currentTranscription}<span className="animate-pulse">...</span></p>
                    </div>
                  </div>
                </div>
              )}

              {isAiThinking && !currentTranscription && (
                <div className="flex w-full justify-start">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-[#1a1f2e] border border-white/5 flex items-center justify-center shrink-0">
                      <Bot size={18} className="text-indigo-400" />
                    </div>
                    <div className="flex gap-2 p-4 bg-[#1a1f2e]/50 rounded-full px-7 border border-white/5 shadow-inner">
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

          {/* 会话总结与后期问答页 */}
          {sessionSummary && (
            <div className="max-w-4xl mx-auto w-full py-12 animate-in fade-in slide-in-from-bottom-12 duration-700">
              <div className="bg-[#12161f] border border-white/5 rounded-[3rem] p-8 md:p-14 shadow-[0_40px_80px_-15px_rgba(0,0,0,0.6)] space-y-12">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-b border-white/5 pb-8">
                  <div className="flex items-center gap-5">
                    <div className="w-16 h-16 rounded-[1.5rem] bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shadow-inner">
                      <BrainCircuit className="text-indigo-400" size={36} />
                    </div>
                    <div>
                      <h3 className="text-4xl font-black text-white tracking-tighter">学习周报 · 智能分析</h3>
                      <p className="text-slate-500 font-bold uppercase text-xs tracking-widest mt-1">Intelligence Session Insight</p>
                    </div>
                  </div>
                  <div className="px-5 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-500" />
                    <span className="text-emerald-500 font-black text-xs uppercase tracking-widest">Completed</span>
                  </div>
                </div>

                <div className="prose prose-invert max-w-none bg-[#0b0e14]/60 rounded-[2.5rem] p-8 md:p-10 border border-white/5 relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl rounded-full"></div>
                   <div className="whitespace-pre-wrap leading-relaxed text-base md:text-lg text-slate-300 font-medium">{sessionSummary}</div>
                </div>

                {/* 会话后期 Q&A */}
                <div className="space-y-8 pt-6">
                  <div className="flex items-center gap-3">
                    <HelpCircle className="text-indigo-400" size={24} />
                    <h4 className="text-2xl font-black text-white">针对性追问</h4>
                  </div>
                  
                  <div className="space-y-6">
                    {qaHistory.map((item, i) => (
                      <div key={i} className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
                        <div className="flex justify-end">
                          <p className="bg-indigo-600/10 border border-indigo-500/30 text-indigo-300 px-6 py-3 rounded-2xl text-sm font-bold shadow-lg">Q: {item.q}</p>
                        </div>
                        <div className="bg-[#1a1f2e] border border-white/5 p-6 rounded-[2rem] text-slate-300 text-sm md:text-base leading-relaxed font-medium shadow-2xl">
                          <div className="flex gap-4">
                             <Bot size={20} className="text-indigo-400 shrink-0 mt-1" />
                             <p>{item.a}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/20 to-violet-500/20 rounded-[2rem] blur opacity-0 group-focus-within:opacity-100 transition-opacity"></div>
                    <input 
                      type="text" 
                      value={qaInput}
                      onChange={(e) => setQaInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAskQuestion()}
                      placeholder="问我关于刚对话中的知识点、单词或文化..."
                      className="w-full bg-[#0b0e14] border border-white/10 rounded-[2rem] py-5 pl-8 pr-20 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-slate-200 placeholder-slate-600 relative z-10 font-medium"
                    />
                    <button 
                      onClick={handleAskQuestion}
                      disabled={isQaThinking || !qaInput.trim()}
                      className="absolute right-4 top-4 p-3 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-500 transition-all disabled:opacity-50 disabled:grayscale z-10 shadow-xl"
                    >
                      {isQaThinking ? <RefreshCw className="animate-spin" size={24} /> : <Send size={24} />}
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-5 pt-8 border-t border-white/5">
                  <button 
                    onClick={() => { setSessionSummary(null); setMessages([]); setCorrections([]); setQaHistory([]); }}
                    className="flex-1 min-w-[200px] px-8 py-5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-3xl font-black transition-all text-lg"
                  >
                    重置并开启新会话
                  </button>
                  <button 
                    onClick={onClose}
                    className="flex-1 min-w-[200px] px-8 py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-3xl font-black transition-all shadow-2xl shadow-indigo-900/50 text-lg"
                  >
                    回到仪表盘
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 侧边栏：实时反馈 */}
        {!sessionSummary && (
          <div className="w-96 bg-[#0f131a] border-l border-white/5 p-8 overflow-y-auto hidden xl:block shadow-[-20px_0_40px_rgba(0,0,0,0.3)]">
            <div className="flex items-center gap-3 mb-10 pb-6 border-b border-white/5">
              <AlertCircle className="text-amber-500" size={24} />
              <h3 className="font-black text-slate-100 tracking-widest uppercase text-sm">Real-time Correction</h3>
            </div>
            
            <div className="space-y-8">
              {corrections.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-96 text-center space-y-6 opacity-5 grayscale">
                  <FileText size={64} />
                  <p className="text-sm font-black tracking-[0.3em] uppercase italic">Awaiting Voice Input</p>
                </div>
              ) : (
                corrections.map((c, i) => (
                  <div key={i} className="p-6 bg-[#1a1f2e] border border-white/5 rounded-[2rem] space-y-5 hover:border-amber-500/40 transition-all animate-in slide-in-from-right-4 group shadow-xl">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-slate-600 tracking-[0.2em] uppercase">Grammar Log {corrections.length - i}</span>
                      <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Volume2 size={14} className="text-amber-500" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs text-rose-500/60 line-through font-bold">"{c.original}"</p>
                      <p className="text-sm text-emerald-400 font-black leading-relaxed">"{c.corrected}"</p>
                    </div>
                    <div className="p-4 bg-[#0b0e14] rounded-2xl border border-white/5">
                       <p className="text-xs text-slate-500 leading-relaxed font-bold italic">
                        {c.explanation}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* 控制底栏 */}
      {!sessionSummary && (
        <div className="p-12 flex flex-col items-center bg-[#0b0e14]/98 backdrop-blur-3xl border-t border-white/5 shadow-2xl">
          {isActive ? (
            <div className="flex flex-col items-center space-y-10 max-w-lg w-full">
              <div className="flex items-center gap-28">
                <button className="p-7 rounded-full bg-[#1a1f2e] border border-white/5 hover:bg-slate-800 transition-all text-slate-500 hover:text-white group relative shadow-2xl">
                    <MicOff size={36} />
                    <div className="absolute -bottom-14 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-[#1a1f2e] px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap z-30">暂时静音</div>
                </button>
                
                <div className="relative group scale-125">
                  <div className="absolute -inset-10 bg-indigo-600 rounded-full animate-voice opacity-20"></div>
                  <div className="absolute -inset-20 bg-indigo-600 rounded-full animate-ping opacity-5"></div>
                  <div className="w-32 h-32 bg-indigo-600 rounded-full flex items-center justify-center shadow-[0_0_100px_rgba(79,70,229,0.5)] z-10 relative border-4 border-indigo-400/20 active:scale-95 transition-transform cursor-pointer">
                    <Mic size={56} className="text-white" />
                  </div>
                </div>
                
                <button 
                  onClick={endSession}
                  className="p-7 rounded-full bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 text-rose-500 transition-all group relative shadow-2xl"
                >
                  <FileText size={36} />
                  <div className="absolute -bottom-14 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-rose-500/10 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap z-30">结束并生成周报</div>
                </button>
              </div>
              
              <div className="flex flex-col items-center gap-3">
                <p className="text-[11px] font-black text-indigo-500 tracking-[0.5em] uppercase animate-pulse">Neural Audio Stream Active</p>
                <div className="flex gap-2 items-end h-5">
                  {[...Array(12)].map((_, i) => (
                    <div key={i} className={`w-1 bg-indigo-500/80 rounded-full animate-pulse`} style={{ height: `${30 + Math.random() * 70}%`, animationDelay: `${i * 0.08}s` }}></div>
                  ))}
                </div>
              </div>
            </div>
          ) : !isConnecting && (
            <p className="text-slate-700 text-[11px] font-black tracking-[0.4em] uppercase">Unified Voice Processor Initialized</p>
          )}
          
          {isSummarizing && (
            <div className="flex flex-col items-center gap-5 text-indigo-400 font-black animate-pulse">
              <BrainCircuit className="animate-spin duration-[5s]" size={40} />
              <p className="text-sm uppercase tracking-[0.4em]">Synthesizing Neural Summary...</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LiveChat;
