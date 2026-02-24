
import React, { useState, useEffect } from 'react';
import { Post, Period, ToneOfVoice, ContentGoal, ContentPlan, PostStatus, ContentHistoryItem } from './types';
import { generateAnalysis, generateContentPlan, editPostContent } from './geminiService';
import { sendToTelegram } from './telegramService';
import WizardForm from './WizardForm';
import PostCard from './PostCard';
import PublishDialog from './PublishDialog';
import AnalysisBoard from './AnalysisBoard';

declare global {
  interface Window {
    Telegram: any;
  }
}

const App: React.FC = () => {
  const [step, setStep] = useState<'form' | 'dashboard'>('form');
  const [loadingStage, setLoadingStage] = useState<number>(-1);
  const [plan, setPlan] = useState<ContentPlan | null>(null);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [history, setHistory] = useState<ContentHistoryItem[]>([]);
  const [isTelegram, setIsTelegram] = useState(false);

  useEffect(() => {
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();
      tg.expand();
      tg.enableClosingConfirmation();
      tg.headerColor = '#0f172a';
      tg.backgroundColor = '#0f172a';
      setIsTelegram(true);
    }

    const savedHistory = localStorage.getItem('cf_content_history');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) { console.error("History load error", e); }
    }
  }, []);

  const loadingSteps = [
    "Глубокий анализ ниши и конкурентов...",
    "Проверка истории для исключения дублей...",
    "Определение стратегии под вашу цель...",
    "Генерация уникального плана и сценариев...",
    "Создание и адаптация визуального ряда..."
  ];

  const handleFormSubmit = async (data: { niche: string, period: Period, tone: ToneOfVoice, goal: ContentGoal, files: File[] }) => {
    setLoadingStage(0);
    try {
      const analysis = await generateAnalysis(data.niche);
      setLoadingStage(2);
      const posts = await generateContentPlan(data.niche, data.period, data.tone, data.goal, analysis, history, data.files);
      setLoadingStage(4);
      
      setPlan({ ...data, posts, analysis });
      setStep('dashboard');
      
      const newHistoryItem = { niche: data.niche, title: posts[0]?.title || '' };
      const updatedHistory = [...history, newHistoryItem].slice(-20);
      setHistory(updatedHistory);
      localStorage.setItem('cf_content_history', JSON.stringify(updatedHistory));
    } catch (error) {
      alert("Ошибка генерации. Попробуйте еще раз.");
    } finally {
      setLoadingStage(-1);
    }
  };

  const handleApprove = (id: string) => {
    if (!plan) return;
    setPlan({
      ...plan,
      posts: plan.posts.map(p => p.id === id ? { ...p, status: PostStatus.APPROVED } : p)
    });
    if (window.Telegram?.WebApp) window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
  };

  const handleEdit = async (id: string, feedback: string) => {
    if (!plan) return;
    setLoadingStage(3);
    try {
      const post = plan.posts.find(p => p.id === id);
      if (post) {
        const updatedPost = await editPostContent(post, feedback);
        setPlan({
          ...plan,
          posts: plan.posts.map(p => p.id === id ? updatedPost : p)
        });
      }
    } catch (e) {
      alert("Ошибка при редактировании.");
    } finally {
      setLoadingStage(-1);
    }
  };

  const approvedPosts = plan?.posts.filter(p => p.status === PostStatus.APPROVED) || [];

  const handleConfirmPublish = async (config: { botToken: string, chatId: string }) => {
    if (approvedPosts.length === 0) return;
    setLoadingStage(0);
    try {
      await sendToTelegram(config.botToken, config.chatId, approvedPosts);
      if (plan) {
        setPlan({
          ...plan,
          posts: plan.posts.map(p => 
            approvedPosts.some(ap => ap.id === p.id) ? { ...p, status: PostStatus.PUBLISHED } : p
          )
        });
      }
      setShowPublishDialog(false);
      if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.showAlert("Успешно! Все посты отправлены.");
      } else {
        alert("Успешно!");
      }
    } catch (e: any) {
      alert("Ошибка: " + e.message);
    } finally {
      setLoadingStage(-1);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 font-sans selection:bg-cyan-500/30">
      {loadingStage >= 0 && (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-xl animate-fade-in">
          <div className="relative w-32 h-32 mb-10">
            <div className="absolute inset-0 rounded-full border-4 border-cyan-500/20 border-t-cyan-500 animate-spin"></div>
            <div className="absolute inset-4 rounded-full border-4 border-blue-600/20 border-b-blue-600 animate-spin-slow"></div>
          </div>
          <p className="text-xl font-black gradient-text uppercase tracking-widest animate-pulse text-center px-6 leading-relaxed">
            {loadingStage < loadingSteps.length ? loadingSteps[loadingStage] : "Интеллектуальная обработка..."}
          </p>
        </div>
      )}

      <main className="container mx-auto pb-32">
        {step === 'form' ? (
          <WizardForm onSubmit={handleFormSubmit} isLoading={loadingStage >= 0} />
        ) : (
          <div className="px-4 pt-10 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
              <div>
                <button 
                  onClick={() => setStep('form')}
                  className="group flex items-center gap-2 text-slate-500 hover:text-cyan-400 transition-colors mb-4 uppercase text-[10px] font-black tracking-widest"
                >
                  <svg className="w-4 h-4 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" />
                  </svg>
                  Вернуться к настройкам
                </button>
                <h2 className="text-5xl font-black text-white tracking-tighter italic">
                  План для: <span className="gradient-text">{plan?.niche}</span>
                </h2>
              </div>
              <div className="flex gap-4">
                 <div className="px-6 py-3 bg-slate-900 rounded-2xl border border-white/5 text-xs font-bold uppercase tracking-widest text-slate-400">
                    {plan?.posts.length} Дней
                 </div>
                 <div className="px-6 py-3 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl text-xs font-bold uppercase tracking-widest text-cyan-400">
                    Цель: {plan?.goal}
                 </div>
              </div>
            </div>

            {plan?.analysis && <AnalysisBoard data={plan.analysis} />}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {plan?.posts.map(post => (
                <PostCard 
                  key={post.id} 
                  post={post} 
                  onApprove={handleApprove} 
                  onEdit={handleEdit} 
                />
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Global Action Button */}
      {step === 'dashboard' && approvedPosts.length > 0 && (
        <div className="fixed bottom-0 inset-x-0 p-6 z-40 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent pt-12 animate-fade-in">
          <button
            onClick={() => setShowPublishDialog(true)}
            className="w-full max-w-2xl mx-auto block py-6 rounded-[2.5rem] font-black text-xl bg-gradient-to-r from-cyan-400 via-blue-600 to-indigo-800 text-white uppercase tracking-[0.3em] shadow-[0_20px_50px_-10px_rgba(6,182,212,0.6)] hover:shadow-[0_25px_60px_-5px_rgba(6,182,212,0.8)] transition-all hover:-translate-y-2 active:scale-[0.98] border-t border-white/20 relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 skew-x-[-20deg]"></div>
            <span className="relative z-10 flex items-center justify-center gap-4">
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
               Опубликовать в ТГ ({approvedPosts.length})
            </span>
          </button>
        </div>
      )}

      {showPublishDialog && (
        <PublishDialog 
          onConfirm={handleConfirmPublish} 
          onCancel={() => setShowPublishDialog(false)} 
        />
      )}
    </div>
  );
};

export default App;
