
import React, { useState, useEffect, useMemo } from 'react';
import { storageService } from '../services/storageService';
import { Course, Chapter, Role, Language } from '../types';
import { BookOpen, Search, Filter, Plus, Clock, ChevronRight, Trash2, Globe, Sparkles, Wand2, GraduationCap, Play, ExternalLink, Layout } from 'lucide-react';
import { CourseWizard } from './CourseWizard';

interface CourseLibraryProps {
  onStartChapter: (course: Course, chapter: Chapter) => void;
}

export const CourseLibrary: React.FC<CourseLibraryProps> = ({ onStartChapter }) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = () => {
    setCourses(storageService.getCourses());
  };

  const filteredCourses = useMemo(() => {
    return courses.filter(c => 
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      c.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [courses, searchQuery]);

  const handleDeleteCourse = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('确定要删除这门课程吗？')) {
      storageService.deleteCourse(id);
      loadCourses();
      if (selectedCourse?.id === id) setSelectedCourse(null);
    }
  };

  return (
    <div className="p-8 md:p-12 space-y-12 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">AI 课程中心</h1>
          <p className="text-gray-500 mt-2 font-medium">定制化的循序渐进学习路径</p>
        </div>
        <div className="flex gap-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-violet-600 transition-colors" size={20} />
            <input 
              type="text" 
              placeholder="搜索课程主题..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 pr-6 py-4 bg-white border border-gray-200 rounded-2xl w-64 md:w-80 outline-none focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500 font-bold transition-all shadow-sm"
            />
          </div>
          <button 
            onClick={() => setIsWizardOpen(true)}
            className="flex items-center gap-3 px-8 py-4 bg-violet-600 text-white rounded-2xl font-black shadow-xl shadow-violet-200 hover:bg-violet-700 transition-all hover:-translate-y-1"
          >
            <Plus size={20} />
            新课程
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Course List */}
        <div className="lg:col-span-4 space-y-4">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-4">我的课程库</p>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2 scrollbar-hide">
            {filteredCourses.length === 0 ? (
              <div className="p-12 text-center bg-gray-50 rounded-[2.5rem] border-2 border-dashed border-gray-200">
                <BookOpen size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-400 font-medium">还没有生成的课程。<br/>点右上角试试 AI 创作！</p>
              </div>
            ) : (
              filteredCourses.map(course => (
                <button
                  key={course.id}
                  onClick={() => setSelectedCourse(course)}
                  className={`w-full text-left p-6 rounded-[2rem] border transition-all relative group ${
                    selectedCourse?.id === course.id 
                    ? 'bg-white border-violet-500 shadow-2xl shadow-violet-100 ring-2 ring-violet-500/10' 
                    : 'bg-white border-gray-100 hover:border-violet-200 hover:shadow-xl'
                  }`}
                >
                  <button 
                    onClick={(e) => handleDeleteCourse(e, course.id)}
                    className="absolute top-4 right-4 p-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="px-3 py-1 bg-violet-50 text-violet-600 text-[10px] font-black uppercase rounded-lg tracking-widest">{course.category}</span>
                    <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest">
                      {course.language} • {course.difficulty}
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-gray-900 mb-2 leading-tight">{course.title}</h3>
                  <div className="flex items-center justify-between mt-6">
                    <div className="flex items-center gap-2">
                       <GraduationCap size={16} className="text-violet-400" />
                       <span className="text-xs font-bold text-gray-500">{course.chapters.length} 章节</span>
                    </div>
                    <ChevronRight size={18} className={`${selectedCourse?.id === course.id ? 'text-violet-600' : 'text-gray-300'}`} />
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Detailed Viewer */}
        <div className="lg:col-span-8">
          {selectedCourse ? (
            <div className="bg-white rounded-[3rem] border border-gray-100 p-10 md:p-14 shadow-sm animate-in zoom-in-95 duration-300 space-y-12 h-full overflow-y-auto max-h-[85vh]">
              <div className="flex flex-col gap-8">
                <div className="flex justify-between items-start">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${selectedCourse.source === 'Web Search' ? 'bg-blue-50 text-blue-500' : 'bg-emerald-50 text-emerald-500'}`}>
                        {selectedCourse.source === 'Web Search' ? <Globe size={16} /> : <Sparkles size={16} />}
                      </div>
                      <span className="text-xs font-black uppercase tracking-widest text-gray-400">{selectedCourse.source}</span>
                    </div>
                    <h2 className="text-4xl font-black text-gray-900 leading-tight">{selectedCourse.title}</h2>
                    <p className="text-lg text-gray-500 font-medium leading-relaxed max-w-2xl">{selectedCourse.description}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                   {[
                     { label: '等级', value: selectedCourse.difficulty },
                     { label: '语言', value: selectedCourse.language },
                     { label: '章节数', value: selectedCourse.chapters.length },
                     { label: '生成于', value: new Date(selectedCourse.createdAt).toLocaleDateString() },
                   ].map((item, i) => (
                     <div key={i} className="bg-gray-50 p-4 rounded-2xl">
                       <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{item.label}</p>
                       <p className="font-bold text-gray-900">{item.value}</p>
                     </div>
                   ))}
                </div>

                <div className="space-y-6">
                   <h3 className="text-xl font-black flex items-center gap-3">
                     学习目标
                   </h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     {selectedCourse.learningObjectives.map((obj, i) => (
                       <div key={i} className="flex items-start gap-3 p-4 bg-violet-50/50 rounded-2xl border border-violet-100/50">
                         <div className="w-6 h-6 rounded-full bg-violet-600 text-white flex items-center justify-center shrink-0 text-[10px] font-black">{i+1}</div>
                         <p className="text-sm font-bold text-violet-900 leading-snug">{obj}</p>
                       </div>
                     ))}
                   </div>
                </div>

                <div className="space-y-6">
                   <h3 className="text-xl font-black flex items-center gap-3">
                     课程章节
                   </h3>
                   <div className="space-y-4">
                      {selectedCourse.chapters.map((ch, i) => (
                        <div key={ch.id} className="group p-6 bg-white border border-gray-100 rounded-[2rem] hover:border-violet-300 hover:shadow-xl transition-all flex items-center justify-between">
                          <div className="flex items-center gap-6">
                            <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center font-black text-gray-400 group-hover:bg-violet-600 group-hover:text-white transition-colors">
                              {ch.order}
                            </div>
                            <div>
                              <h4 className="font-black text-lg text-gray-900">{ch.title}</h4>
                              <p className="text-sm text-gray-500 font-medium line-clamp-1">{ch.description}</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => onStartChapter(selectedCourse, ch)}
                            className="px-6 py-3 bg-gray-50 text-gray-900 font-black rounded-xl group-hover:bg-violet-600 group-hover:text-white transition-all flex items-center gap-2"
                          >
                            <Play size={16} fill="currentColor" />
                            学习此节
                          </button>
                        </div>
                      ))}
                   </div>
                </div>

                {selectedCourse.references && selectedCourse.references.length > 0 && (
                  <div className="p-8 bg-blue-50/50 rounded-[2.5rem] border border-blue-100 space-y-4">
                    <h4 className="font-black text-blue-900 flex items-center gap-2">
                      <Globe size={18} />
                      知识来源与参考
                    </h4>
                    <ul className="space-y-2">
                      {selectedCourse.references.map((ref, i) => (
                        <li key={i}>
                          <a href={ref.uri} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-2">
                            <ExternalLink size={12} />
                            {ref.title}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-6 bg-white rounded-[3rem] border border-dashed border-gray-200">
               <div className="p-8 bg-gray-50 rounded-full text-gray-300">
                  <Layout size={80} />
               </div>
               <div>
                  <h3 className="text-2xl font-black text-gray-900">预览详情</h3>
                  <p className="text-gray-400 font-medium">在左侧选择一门课程来查看大纲与章节</p>
               </div>
            </div>
          )}
        </div>
      </div>

      {isWizardOpen && <CourseWizard onClose={() => setIsWizardOpen(false)} onComplete={loadCourses} />}
    </div>
  );
};
