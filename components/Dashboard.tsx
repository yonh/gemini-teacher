
import React, { useMemo } from 'react';
import { storageService } from '../services/storageService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { Clock, MessageSquare, Award, Book } from 'lucide-react';

const Dashboard: React.FC = () => {
  const progress = useMemo(() => storageService.getProgress(), []);
  const sessions = useMemo(() => storageService.getSessions(), []);
  
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
        <h1 className="text-3xl font-bold text-gray-900">Learning Progress</h1>
        <p className="text-gray-500">Summary of your linguistic journey</p>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Time', value: `${Math.round(progress.totalSeconds / 60)}m`, icon: Clock, color: 'blue' },
          { label: 'Sessions', value: progress.totalSessions, icon: MessageSquare, color: 'violet' },
          { label: 'Grammar Score', value: `${progress.averageGrammarScore}%`, icon: Award, color: 'amber' },
          { label: 'New Words', value: storageService.getVocab().length, icon: Book, color: 'emerald' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">{stat.label}</p>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            </div>
            <div className={`p-3 rounded-xl bg-${stat.color}-50 text-${stat.color}-500`}>
              <stat.icon size={24} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Language Split */}
        <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="font-semibold text-lg mb-6">Language Split</h3>
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

        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="font-semibold text-lg mb-6">Recent Sessions</h3>
          <div className="space-y-4">
            {recentActivity.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-400 italic">
                No sessions yet. Start your first conversation!
              </div>
            ) : (
              recentActivity.map((s) => (
                <div key={s.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center border border-gray-200 shadow-sm">
                      <span className="text-lg">🗣️</span>
                    </div>
                    <div>
                      <p className="font-medium">{s.language} Practice</p>
                      <p className="text-xs text-gray-500">{new Date(s.startTime).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{Math.round(s.duration / 60)} min</p>
                    <p className="text-[10px] text-gray-400 uppercase">{s.corrections.length} corrections</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
