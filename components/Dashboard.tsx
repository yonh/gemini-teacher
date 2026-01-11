
import React, { useMemo } from 'react';
import { storageService } from '../services/storageService';
import { Session } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { Clock, MessageSquare, Award, Book, Bookmark, ChevronRight } from 'lucide-react';

interface DashboardProps {
  onSelectSession?: (session: Session) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onSelectSession }) => {
  const progress = useMemo(() => storageService.getProgress(), []);
  const sessions = useMemo(() => storageService.getSessions(), []);
  const keyPointsCount = useMemo(() => storageService.getKeyPoints().length, []);
  
  const languageData = useMemo(() => {
    return Object.entries(progress.languageDistribution).map(([name, value]) => ({ name, value }));
  }, [progress]);

  const recentActivity = useMemo(() => {
    return sessions.slice(-5).reverse();
  }, [sessions]);

  const COLORS = ['#8B5CF6', '#F59E0B', '#10B981'];

  return (
    <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header>
        <h1 className="text-3xl font-bold text-gray-900">学习概览</h1>
        <p className="text-gray-500">记录你的语言成长点滴</p>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: '练习总时长', value: `${Math.round(progress.totalSeconds / 60)}m`, icon: Clock, color: 'blue' },
          { label: '对话场次', value: progress.totalSessions, icon: MessageSquare, color: 'violet' },
          { label: '记重点', value: keyPointsCount, icon: Bookmark, color: 'amber' },
          { label: '掌握词汇', value: storageService.getVocab().length, icon: Book, color: 'emerald' },
          { label: '语法得分', value: `${progress.averageGrammarScore}%`, icon: Award, color: 'indigo' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-wider">{stat.label}</p>
              <p className="text-xl font-black text-gray-900">{stat.value}</p>
            </div>
            <div className={`p-2.5 rounded-xl bg-${stat.color}-50 text-${stat.color}-500`}>
              <stat.icon size={20} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="font-semibold text-lg mb-6">语种分布</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={languageData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {languageData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex justify-center gap-4 text-sm">
            {languageData.map((l, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                <span className="text-gray-600">{l.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="font-semibold text-lg mb-6">最近练习</h3>
          <div className="space-y-4">
            {recentActivity.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-400 italic py-12">
                还没有练习记录。开始你的第一次对话吧！
              </div>
            ) : (
              recentActivity.map((s) => (
                <button 
                  key={s.id} 
                  onClick={() => onSelectSession?.(s)}
                  className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-violet-50 transition-colors border border-transparent hover:border-violet-100 group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center border border-gray-200 shadow-sm group-hover:scale-110 transition-transform">
                      <span className="text-lg">🗣️</span>
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-gray-900">{s.language} 练习回顾</p>
                      <p className="text-xs text-gray-500">{new Date(s.startTime).toLocaleDateString()} · {new Date(s.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-sm font-black text-gray-900">{Math.round(s.duration / 60)} min</p>
                      <p className="text-[10px] text-gray-400 uppercase font-black">{s.messages.length} 条对话</p>
                    </div>
                    <ChevronRight className="text-gray-300 group-hover:text-violet-500 transition-colors" size={20} />
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
