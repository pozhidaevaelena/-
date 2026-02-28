
import React, { useState, useEffect } from 'react';
import { Post, Period, ToneOfVoice, ContentGoal, ContentPlan, PostStatus, ContentHistoryItem } from './types';
import { generateAnalysis, generateContentPlan, editPostContent, generateImageForPost } from './services/geminiService';
import { sendToTelegram } from './services/telegramService';
import WizardForm from './components/WizardForm';
import PostCard from './components/PostCard';
import PublishDialog from './components/PublishDialog';
import AnalysisBoard from './components/AnalysisBoard';

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
      
      // Проверка поддержки функций в зависимости от версии API Telegram
      if (tg.isVersionAtLeast('6.2')) {
        tg.enableClosingConfirmation();
      }
      
      if (tg.isVersionAtLeast('6.1')) {
        tg.headerColor = '#0f172a';
        tg.backgroundColor = '#0f172a';
      }
      
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
    if (loadingStage >= 0) return;

    try {
      setLoadingStage(0);
      
      // 1. Анализ ниши
      const analysis = await generateAnalysis(data.niche, data.goal);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setLoadingStage(2);
      
      // 2. Генерация текстового плана
      const posts = await generateContentPlan(data.niche, data.period, data.tone, data.goal, analysis, history);
      
      const newPlan: ContentPlan = {
        niche: data.niche,
        period: data.period,
        tone: data.tone,
        goal: data.goal,
        posts,
        analysis
      };

      setPlan(newPlan);
      setStep('dashboard');
      setLoadingStage(-1);
      
      // Сохранение в историю
      const newHistory = [...history, ...posts.map(p => ({ niche: data.niche, title: p.title }))];
      setHistory(newHistory);
      localStorage.setItem('cf_content_history', JSON.stringify(newHistory.slice(-100)));

      // 3. Фоновая генерация изображений
      for (const post of posts) {
        try {
          // Небольшая задержка между запросами для соблюдения лимитов
          await new Promise(resolve => setTimeout(resolve, 4000));
          const imageUrl = await generateImageForPost(post, data.tone, data.files);
          
          setPlan(prev => {
            if (!prev) return null;
            return {
              ...prev,
              posts: prev.posts.map(p => p.id === post.id ? { ...p, imageUrl } : p)
            };
          });
        } catch (e) {
          console.error(`Failed to generate image for post ${post.id}`, e);
        }
      }

    } catch (error: any) {
      console.error("Generation error:", error);
      alert(`Ошибка генерации: ${error.message || JSON.stringify(error)}. Проверьте API ключ и соединение.`);
      setLoadingStage(-1);
    }
  };

  const handleRegenerateImage = async (postId: string) => {
    if (!plan) return;
    const post = plan.posts.find(p => p.id === postId);
    if (!post) return;

    // Сбрасываем текущую картинку, чтобы показать лоадер
    setPlan(prev => {
      if (!prev) return null;
      return {
        ...prev,
        posts: prev.posts.map(p => p.id === postId ? { ...p, imageUrl: '' } : p)
      };
    });

    try {
      // Для регенерации используем пустой массив файлов, если не переданы новые, 
      // или можно расширить логику для передачи файлов из состояния
      const imageUrl = await generateImageForPost(post, plan.tone, []);
      setPlan(prev => {
        if (!prev) return null;
        return {
          ...prev,
          posts: prev.posts.map(p => p.id === postId ? { ...p, imageUrl } : p)
        };
      });
    } catch (error) {
      alert("Не удалось перегенерировать изображение.");
    }
  };

  const approvePost = (id: string) => {
    if (!plan) return;
    const updatedPosts = plan.posts.map(p => 
      p.id === id ? { ...p, status: PostStatus.APPROVED } : p
    );
    setPlan({ ...plan, posts: updatedPosts });
  };

  const handleEditPost = async (id: string, feedback: string) => {
    if (!plan) return;
    const postToEdit = plan.posts.find(p => p.id === id);
    if (!postToEdit) return;

    try {
      const updatedPost = await editPostContent(postToEdit, feedback);
      const updatedPosts = plan.posts.map(p => p.id === id ? updatedPost : p);
      setPlan({ ...plan, posts: updatedPosts });
    } catch (error) {
      alert("Ошибка при редактировании поста. Попробуйте еще раз.");
    }
  };

  const handlePublish = async (config: { botToken: string, chatId: string }) => {
    if (!plan) return;
    const approvedPosts = plan.posts.filter(p => p.status === PostStatus.APPROVED);
    
    if (approvedPosts.length === 0) {
      alert("Сначала согласуйте хотя бы один пост");
      return;
    }

    try {
      await sendToTelegram(config.botToken, config.chatId, approvedPosts);
      const updatedPosts = plan.posts.map(p => 
        p.status === PostStatus.APPROVED ? { ...p, status: PostStatus.PUBLISHED } : p
      );
      setPlan({ ...plan, posts: updatedPosts });
      setShowPublishDialog(false);
      alert("Контент успешно отправлен в Telegram!");
    } catch (error: any) {
      alert(`Ошибка публикации: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen pb-20">
      {loadingStage >= 0 && (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-2xl">
          <div className="w-24 h-24 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin mb-10 shadow-[0_0_40px_rgba(6,182,212,0.3)]"></div>
          <div className="text-center space-y-4 px-6">
            <h2 className="text-2xl font-black gradient-text uppercase tracking-[0.2em] animate-pulse">
              {loadingSteps[loadingStage]}
            </h2>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">
              Нейросеть Gemini Flash 2.5 создает ваш контент...
            </p>
          </div>
          <div className="absolute bottom-12 w-64 h-1 bg-slate-900 rounded-full overflow-hidden">
             <div 
               className="h-full bg-cyan-500 transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(6,182,212,0.8)]"
               style={{ width: `${(loadingStage + 1) * 20}%` }}
             ></div>
          </div>
        </div>
      )}

      {step === 'form' ? (
        <WizardForm onSubmit={handleFormSubmit} isLoading={loadingStage >= 0} />
      ) : (
        <div className="max-w-7xl mx-auto px-6 py-12 animate-fade-in">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <button 
                  onClick={() => setStep('form')}
                  className="p-3 bg-slate-900 rounded-2xl text-slate-400 hover:text-white transition-colors border border-white/5"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                </button>
                <span className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.3em]">Управление конвейером</span>
              </div>
              <h1 className="text-5xl font-black text-white tracking-tighter italic">
                {plan?.niche} <span className="text-slate-700">/</span> <span className="gradient-text">{plan?.period}</span>
              </h1>
            </div>
            
            <button
              onClick={() => setShowPublishDialog(true)}
              className="px-10 py-5 gradient-btn rounded-3xl font-black text-sm uppercase tracking-[0.2em] text-white flex items-center gap-4 group"
            >
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
              Опубликовать всё
            </button>
          </div>

          {plan?.analysis && <AnalysisBoard data={plan.analysis} />}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {plan?.posts.map(post => (
              <PostCard
                key={post.id}
                post={post}
                onApprove={approvePost}
                onEdit={handleEditPost}
                onRegenerateImage={handleRegenerateImage}
              />
            ))}
          </div>
        </div>
      )}

      {showPublishDialog && (
        <PublishDialog
          onConfirm={handlePublish}
          onCancel={() => setShowPublishDialog(false)}
        />
      )}
    </div>
  );
};

export default App;
