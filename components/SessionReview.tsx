
import React, { useState } from 'react';
import { Session, ChatMessage, Role } from '../types';
import { storageService } from '../services/storageService';
import { textAiService } from '../services/textAiService';
import { X, Play, Clock, MessageSquare, ShieldCheck, User, Bot, Volume2, Bookmark, Star } from 'lucide-react';

interface SessionReviewProps {
  session: Session;
  onClose: () => void;
}

export const SessionReview: React.FC<SessionReviewProps> = ({ session, onClose }) => {
  const roles = storageService.getRoles();
  const role = roles.find(r => r.id === session.roleId) || roles[0];
  const [playingId, setPlayingId] = useState<string | null>(null);

  const handlePlay = async (msg: ChatMessage) => {
    setPlayingId(msg.id);
    // 使用带语调还原的 TTS
    await textAiService.speakWithPersona(msg.text, role);
    setPlayingId(null);
  };

  return (
    <div className="fixed inset-0 z-[200] bg-[#0b0e14]/90 backdrop-blur-xl flex items-center justify-center p-4 md:p-10 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-5xl h-[90vh] rounded-[3.5rem] shadow-4xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-8 md:p-10 border-b border-gray-100 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-6">
            <div className="w-14 h-14 bg-violet-100 rounded-2xl flex items-center justify-center text-3xl">
              {role.language === 'English' ? '🇬🇧' : '🇨🇳'}
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-900">练习回顾：与 {role.name}</h2>
              <div className="flex items-center gap-4 mt-1">
                <span className="flex items-center gap-1.5 text-xs font-bold text-gray-400">
                  <Clock size={14} /> {new Date(session.startTime).toLocaleDateString()}
                </span>
                <span className="flex items-center gap-1.5 text-xs font-bold text-gray-400">
                  <MessageSquare size={14} /> {session.messages.length} 条对话
                </span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-3 bg-gray-50 hover:bg-gray-100 rounded-full transition-all text-gray-400">
            <X size={28} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 md:p-12 space-y-8 bg-gray-50/30">
          {session.summary && (
            <div className="p-8 bg-indigo-50 border border-indigo-100 rounded-[2.5rem] space-y-4">
              <h3 className="font-black text-indigo-900 flex items-center gap-2 uppercase tracking-widest text-xs">
                <ShieldCheck size={18} /> AI 导师复盘
              </h3>
              <p className="text-indigo-800 leading-relaxed font-medium">{session.summary}</p>
            </div>
          )}

          <div className="space-y-6">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] px-4">对话实录</p>
            {session.messages.map((m) => (
              <div key={m.id} className={`flex gap-4 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${m.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                   {m.role === 'user' ? <User size={18} /> : <Bot size={18} />}
                </div>
                <div className={`max-w-[80%] group relative ${m.role === 'user' ? 'items-end text-right' : 'items-start text-left'}`}>
                  <div className={`p-5 rounded-3xl inline-block ${m.role === 'user' ? 'bg-indigo-500 text-white rounded-tr-none' : 'bg-white border border-gray-100 text-gray-900 rounded-tl-none shadow-sm'}`}>
                    <p className="text-sm font-medium leading-relaxed">{m.text}</p>
                    {m.translation && <p className={`mt-2 pt-2 border-t border-black/5 text-xs italic opacity-70`}>{m.translation}</p>}
                  </div>
                  {/* Tool Buttons */}
                  <div className={`absolute top-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-all ${m.role === 'user' ? 'right-full mr-2' : 'left-full ml-2'}`}>
                     <button 
                      onClick={() => handlePlay(m)}
                      className={`p-2 rounded-full bg-white border border-gray-200 shadow-lg hover:bg-violet-50 transition-all ${playingId === m.id ? 'animate-pulse text-violet-600' : 'text-gray-400'}`}
                     >
                       <Play size={12} fill={playingId === m.id ? "currentColor" : "none"} />
                     </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-8 border-t border-gray-100 flex justify-end">
           <button onClick={onClose} className="px-12 py-4 bg-gray-900 text-white font-black rounded-2xl shadow-xl hover:bg-black transition-all">
             关闭回顾
           </button>
        </div>
      </div>
    </div>
  );
};
