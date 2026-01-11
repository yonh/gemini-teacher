
import React, { useState } from 'react';
import { Wand2, X, Globe, Zap, Check, Layout, BookOpen, Search, ArrowRight, Loader2, Info } from 'lucide-react';
import { Language, DifficultyLevel, CourseCategory } from '../types';
import { courseGenerationService } from '../services/courseGenerationService';
import { storageService } from '../services/storageService';

interface CourseWizardProps {
  onClose: () => void;
  onComplete: () => void;
}

export const CourseWizard: React.FC<CourseWizardProps> = ({ onClose, onComplete }) => {
  const [step, setStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [formData, setFormData] = useState({
    topic: '',
    language: Language.ENGLISH,
    level: DifficultyLevel.BEGINNER,
    category: CourseCategory.DAILY_LIFE,
    useSearch: true
  });

  const handleGenerate = async () => {
    if (!formData.topic.trim()) return;
    setIsGenerating(true);
    try {
      const course = await courseGenerationService.generateCourse(formData.topic, {
        language: formData.language,
        level: formData.level,
        category: formData.category,
        useSearch: formData.useSearch
      });
      storageService.saveCourse(course);
      onComplete();
      onClose();
    } catch (error) {
      console.error("Course generation failed", error);
      alert("课程生成失败，请重试。");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-3xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-violet-600 rounded-2xl text-white">
              <Wand2 size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black">AI 课程设计师</h2>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">打造专属你的沉浸式教学</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-all">
            <X size={28} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-10 space-y-10">
          {isGenerating ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-8 text-center">
              <div className="relative">
                <div className="w-24 h-24 border-4 border-violet-100 border-t-violet-600 rounded-full animate-spin"></div>
                <Zap className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-violet-600 animate-pulse" size={32} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black">正在深度构思课程...</h3>
                <p className="text-gray-500 text-sm max-w-xs mx-auto">
                  {formData.useSearch ? "正在联网搜索最新资讯并结构化内容..." : "AI 正在分析主题并编撰教学大纲..."}
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">你想学习的主题</label>
                <input 
                  type="text" 
                  value={formData.topic}
                  onChange={(e) => setFormData({...formData, topic: e.target.value})}
                  placeholder="例如：咖啡店点餐技巧, 商务谈判, 甚至是《指环王》里的词汇..." 
                  className="w-full px-6 py-5 bg-gray-50 border border-gray-200 rounded-3xl focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500 outline-none transition-all font-bold text-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">目标语言</label>
                  <select 
                    value={formData.language}
                    onChange={(e) => setFormData({...formData, language: e.target.value as Language})}
                    className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl font-bold outline-none"
                  >
                    {Object.values(Language).map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">难度等级</label>
                  <select 
                    value={formData.level}
                    onChange={(e) => setFormData({...formData, level: e.target.value as DifficultyLevel})}
                    className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl font-bold outline-none"
                  >
                    {Object.values(DifficultyLevel).map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">课程类别</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {Object.values(CourseCategory).map(cat => (
                    <button
                      key={cat}
                      onClick={() => setFormData({...formData, category: cat})}
                      className={`px-4 py-3 rounded-xl border text-[11px] font-black transition-all ${
                        formData.category === cat 
                        ? 'bg-violet-600 border-violet-600 text-white shadow-lg' 
                        : 'bg-white border-gray-100 text-gray-500 hover:border-violet-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-6 bg-violet-50 rounded-3xl border border-violet-100 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 bg-white rounded-xl text-violet-600 shadow-sm">
                    <Globe size={20} />
                  </div>
                  <div>
                    <h4 className="font-black text-sm text-gray-900">启用 Google 搜索</h4>
                    <p className="text-[10px] text-gray-500 font-medium">使用最新实时资讯生成课程内容</p>
                  </div>
                </div>
                <button 
                  onClick={() => setFormData({...formData, useSearch: !formData.useSearch})}
                  className={`w-14 h-8 rounded-full p-1 transition-all duration-300 ${formData.useSearch ? 'bg-violet-600' : 'bg-gray-300'}`}
                >
                  <div className={`w-6 h-6 bg-white rounded-full shadow-sm transition-transform ${formData.useSearch ? 'translate-x-6' : 'translate-x-0'}`}></div>
                </button>
              </div>
            </>
          )}
        </div>

        <div className="p-8 border-t border-gray-100 bg-gray-50/50 flex gap-4">
          <button onClick={onClose} className="px-8 py-4 text-gray-500 font-black hover:text-gray-700">取消</button>
          {!isGenerating && (
            <button 
              onClick={handleGenerate}
              className="flex-1 bg-gray-900 text-white rounded-[2rem] font-black py-4 shadow-xl hover:bg-black transition-all flex items-center justify-center gap-3"
            >
              <Zap size={20} />
              立即生成课程
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
