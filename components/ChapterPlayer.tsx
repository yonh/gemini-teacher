
import React, { useState, useEffect } from 'react';
import { Course, Chapter, Role, Language } from '../types';
import { X, ArrowLeft, BookOpen, MessageCircle, ArrowRight, CheckCircle2, Bookmark, Loader2, HelpCircle, GraduationCap } from 'lucide-react';
import { storageService } from '../services/storageService';
import { textAiService } from '../services/textAiService';
import { GoogleGenAI, Type } from '@google/genai';

interface ChapterPlayerProps {
  course: Course;
  chapter: Chapter;
  onClose: () => void;
  onStartPractice: (role: Role, courseContext?: { course: Course, chapter: Chapter }) => void;
}

interface QuizQuestion {
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
}

export const ChapterPlayer: React.FC<ChapterPlayerProps> = ({ course, chapter, onClose, onStartPractice }) => {
  const [isCompleted, setIsCompleted] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [quizDone, setQuizDone] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  useEffect(() => {
    const isDone = course.completedChapterIds?.includes(chapter.id) || false;
    setIsCompleted(isDone);
  }, [course, chapter]);

  const handleToggleComplete = () => {
    storageService.toggleChapterCompletion(course.id, chapter.id);
    setIsCompleted(!isCompleted);
  };

  const handlePracticeClick = () => {
    const roles = storageService.getRoles();
    // Choose a role of the same language, or default to first one
    // Smart adaptation: If it's business, look for interviewer or coach
    const suitableRole = roles.find(r => r.language === course.language) || roles[0];
    
    onStartPractice(suitableRole, { course, chapter });
  };

  const startQuiz = async () => {
    setShowQuiz(true);
    setIsGeneratingQuiz(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Based on the following language learning content, generate 3 multiple choice questions in ${course.language} (if applicable) to test the user's understanding. 
      Content: ${chapter.content}
      
      Output JSON format: 
      {
        "questions": [
          { "question": "...", "options": ["a", "b", "c", "d"], "answerIndex": 0, "explanation": "..." }
        ]
      }`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              questions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    question: { type: Type.STRING },
                    options: { type: Type.ARRAY, items: { type: Type.STRING } },
                    answerIndex: { type: Type.NUMBER },
                    explanation: { type: Type.STRING }
                  },
                  required: ["question", "options", "answerIndex", "explanation"]
                }
              }
            }
          }
        }
      });
      
      const data = JSON.parse(response.text || '{"questions":[]}');
      setQuizQuestions(data.questions);
    } catch (e) {
      console.error("Quiz generation failed", e);
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  const handleAnswer = (idx: number) => {
    setSelectedOption(idx);
    if (idx === quizQuestions[currentQuizIndex].answerIndex) {
      setQuizScore(s => s + 1);
    }
  };

  const nextQuestion = () => {
    if (currentQuizIndex < quizQuestions.length - 1) {
      setCurrentQuizIndex(i => i + 1);
      setSelectedOption(null);
    } else {
      setQuizDone(true);
      if (quizScore >= Math.floor(quizQuestions.length * 0.7)) {
        if (!isCompleted) handleToggleComplete();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col animate-in slide-in-from-bottom-6 duration-500">
      <header className="flex items-center justify-between p-6 border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-6">
          <button onClick={onClose} className="p-3 hover:bg-gray-100 rounded-2xl transition-all">
            <ArrowLeft size={24} />
          </button>
          <div>
            <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
              <span>{course.title}</span>
              <span>•</span>
              <span className="text-violet-600">章节 {chapter.order}</span>
            </div>
            <h2 className="text-2xl font-black text-gray-900">{chapter.title}</h2>
          </div>
        </div>
        <div className="flex gap-4">
           <button 
            onClick={handleToggleComplete}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black shadow-lg transition-all ${
              isCompleted ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-gray-900 text-white'
            }`}
           >
              {isCompleted ? <CheckCircle2 size={20} /> : null}
              {isCompleted ? '已完成' : '标记完成'}
           </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-10 md:p-20 bg-gray-50/50">
          <div className="max-w-4xl mx-auto space-y-12">
             <div className="bg-white p-12 rounded-[3rem] shadow-sm border border-gray-100 relative group">
                <div className="prose prose-violet max-w-none prose-headings:font-black prose-p:font-medium prose-p:leading-relaxed text-gray-700 whitespace-pre-wrap leading-loose">
                   {chapter.content}
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-20">
                <div className="bg-indigo-600 rounded-[2.5rem] p-10 text-white space-y-6 shadow-xl shadow-indigo-100 hover:scale-[1.02] transition-transform">
                   <div className="p-3 bg-white/10 rounded-2xl w-fit"><MessageCircle size={32} /></div>
                   <div className="space-y-2">
                      <h3 className="text-2xl font-black">开启实战演练</h3>
                      <p className="text-indigo-100 font-medium text-sm leading-relaxed">基于本章内容，与 AI 导师进行一场针对性的语音对话，在实战中巩固记忆。</p>
                   </div>
                   <button 
                    onClick={handlePracticeClick}
                    className="w-full py-5 bg-white text-indigo-600 rounded-2xl font-black text-lg hover:bg-indigo-50 transition-all flex items-center justify-center gap-3"
                   >
                     立即对话练习
                     <ArrowRight size={20} />
                   </button>
                </div>

                <div className="bg-emerald-600 rounded-[2.5rem] p-10 text-white space-y-6 shadow-xl shadow-emerald-100 hover:scale-[1.02] transition-transform">
                   <div className="p-3 bg-white/10 rounded-2xl w-fit"><HelpCircle size={32} /></div>
                   <div className="space-y-2">
                      <h3 className="text-2xl font-black">掌握度测试</h3>
                      <p className="text-emerald-100 font-medium text-sm leading-relaxed">通过 3 个 AI 自动生成的习题，检测你对本章知识点的掌握程度。</p>
                   </div>
                   <button 
                    onClick={startQuiz}
                    className="w-full py-5 bg-white text-emerald-600 rounded-2xl font-black text-lg hover:bg-emerald-50 transition-all"
                   >
                     进入测评
                   </button>
                </div>
             </div>
          </div>
        </div>

        {/* Sidebar Roadmap */}
        <div className="w-80 border-l border-gray-100 bg-white hidden xl:flex flex-col p-8 space-y-8">
           <div className="flex items-center justify-between border-b border-gray-50 pb-4">
              <h3 className="font-black text-lg text-gray-900">课程路线图</h3>
              <div className="text-[10px] font-black text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded">
                Progress: {course.completedChapterIds?.length || 0}/{course.chapters.length}
              </div>
           </div>
           <div className="space-y-4">
             {course.chapters.map(ch => (
               <div key={ch.id} className={`p-4 rounded-2xl border flex items-center gap-4 transition-all ${
                 ch.id === chapter.id 
                 ? 'bg-violet-50 border-violet-200 shadow-sm' 
                 : course.completedChapterIds?.includes(ch.id)
                   ? 'bg-emerald-50/30 border-emerald-100/50 grayscale-[0.5]'
                   : 'border-transparent text-gray-400'
               }`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs ${
                    ch.id === chapter.id 
                    ? 'bg-violet-600 text-white' 
                    : course.completedChapterIds?.includes(ch.id)
                      ? 'bg-emerald-500 text-white'
                      : 'bg-gray-100'
                  }`}>
                    {course.completedChapterIds?.includes(ch.id) ? <CheckCircle2 size={12} /> : ch.order}
                  </div>
                  <span className={`text-sm font-bold truncate ${ch.id === chapter.id ? 'text-violet-900' : ''}`}>
                    {ch.title}
                  </span>
               </div>
             ))}
           </div>
        </div>
      </div>

      {/* Quiz Overlay */}
      {showQuiz && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-2xl rounded-[3.5rem] p-10 md:p-14 shadow-4xl space-y-10 overflow-hidden flex flex-col max-h-[90vh]">
              <div className="flex justify-between items-center border-b border-gray-50 pb-6">
                 <div className="flex items-center gap-3">
                   <div className="p-3 bg-emerald-100 rounded-2xl text-emerald-600"><HelpCircle size={24} /></div>
                   <h2 className="text-2xl font-black">掌握度随堂测验</h2>
                 </div>
                 <button onClick={() => setShowQuiz(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400"><X size={24} /></button>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 space-y-8">
                 {isGeneratingQuiz ? (
                   <div className="flex flex-col items-center justify-center py-20 space-y-6">
                      <Loader2 className="animate-spin text-emerald-600" size={48} />
                      <p className="font-bold text-gray-400 animate-pulse">正在根据本节内容生成题目...</p>
                   </div>
                 ) : quizDone ? (
                   <div className="text-center space-y-10 py-10">
                      <div className="w-32 h-32 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                        <CheckCircle2 size={64} className="text-emerald-600" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-3xl font-black">测验结束！</h3>
                        <p className="text-gray-500 text-lg">得分: <span className="text-emerald-600 font-black">{quizScore}</span> / {quizQuestions.length}</p>
                      </div>
                      <div className="p-6 bg-emerald-50 rounded-3xl border border-emerald-100 text-sm text-emerald-800 font-medium">
                        {quizScore >= quizQuestions.length * 0.7 ? "太棒了！你已经较好地掌握了本章内容。" : "看来还需要再复习一下哦。"}
                      </div>
                   </div>
                 ) : quizQuestions.length > 0 ? (
                   <div className="space-y-8 animate-in slide-in-from-right-12 duration-500">
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                           <span className="px-3 py-1 bg-gray-100 rounded-lg text-[10px] font-black text-gray-400 uppercase">Question {currentQuizIndex + 1} of {quizQuestions.length}</span>
                        </div>
                        <h4 className="text-2xl font-black text-gray-900 leading-tight">{quizQuestions[currentQuizIndex].question}</h4>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-4">
                         {quizQuestions[currentQuizIndex].options.map((opt, i) => (
                           <button 
                            key={i}
                            disabled={selectedOption !== null}
                            onClick={() => handleAnswer(i)}
                            className={`p-6 text-left rounded-2xl border-2 font-bold transition-all flex items-center justify-between group ${
                              selectedOption === i
                                ? i === quizQuestions[currentQuizIndex].answerIndex
                                  ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                                  : 'bg-red-50 border-red-500 text-red-700'
                                : selectedOption !== null && i === quizQuestions[currentQuizIndex].answerIndex
                                  ? 'bg-emerald-50 border-emerald-500/30 text-emerald-700/50'
                                  : 'bg-gray-50 border-gray-100 hover:border-emerald-300 hover:bg-white'
                            }`}
                           >
                              {opt}
                              {selectedOption === i && (
                                i === quizQuestions[currentQuizIndex].answerIndex ? <CheckCircle2 size={20} /> : <X size={20} />
                              )}
                           </button>
                         ))}
                      </div>

                      {selectedOption !== null && (
                        <div className="p-6 bg-blue-50/50 rounded-2xl border border-blue-100/50 animate-in fade-in duration-300">
                           <p className="text-xs font-black text-blue-900 uppercase tracking-widest mb-1">解析</p>
                           <p className="text-sm text-blue-800/80 leading-relaxed font-medium">{quizQuestions[currentQuizIndex].explanation}</p>
                        </div>
                      )}
                   </div>
                 ) : (
                   <div className="py-20 text-center text-gray-400 font-bold italic">无法生成题目，请稍后再试。</div>
                 )}
              </div>

              {!isGeneratingQuiz && (
                <div className="pt-8 border-t border-gray-50">
                  {quizDone ? (
                    <button onClick={() => setShowQuiz(false)} className="w-full py-5 bg-gray-900 text-white rounded-2xl font-black shadow-xl">返回课程</button>
                  ) : (
                    <button 
                      disabled={selectedOption === null}
                      onClick={nextQuestion} 
                      className="w-full py-5 bg-indigo-600 disabled:bg-gray-200 text-white rounded-2xl font-black shadow-xl flex items-center justify-center gap-3 transition-all"
                    >
                      {currentQuizIndex < quizQuestions.length - 1 ? '下一题' : '查看结果'}
                      <ArrowRight size={20} />
                    </button>
                  )}
                </div>
              )}
           </div>
        </div>
      )}
    </div>
  );
};
