
import React, { useState } from 'react';
import { Period, ToneOfVoice, ContentGoal } from './types';

interface Props {
  onSubmit: (data: { niche: string, period: Period, tone: ToneOfVoice, goal: ContentGoal, files: File[] }) => void;
  isLoading: boolean;
}

const WizardForm: React.FC<Props> = ({ onSubmit, isLoading }) => {
  const [niche, setNiche] = useState('');
  const [period, setPeriod] = useState<Period>(Period.WEEK);
  const [tone, setTone] = useState<ToneOfVoice>(ToneOfVoice.FRIENDLY);
  const [goal, setGoal] = useState<ContentGoal>(ContentGoal.ACQUISITION);
  const [files, setFiles] = useState<File[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!niche) return;
    onSubmit({ niche, period, tone, goal, files });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 animate-fade-in max-w-2xl mx-auto py-8 px-4">
      <div className="text-center mb-10">
        <div className="inline-block px-5 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[10px] font-black uppercase tracking-[0.4em] mb-6 animate-pulse shadow-[0_0_20px_rgba(6,182,212,0.1)]">
          FACTORY ENGINE v6.0 • ULTRA POWERED
        </div>
        <h1 className="text-6xl md:text-7xl font-black mb-4 gradient-text tracking-tighter italic filter drop-shadow-2xl">
          ContentFactory
        </h1>
        <p className="text-slate-400 font-bold leading-relaxed max-w-md mx-auto text-[10px] uppercase tracking-[0.25em] opacity-70">
          Интеллектуальный конвейер вирального контента
        </p>
      </div>

      <div className="glass p-8 md:p-12 rounded-[3rem] space-y-8 neon-border relative overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.3)]">
        {/* Экстремальные декоративные свечения */}
        <div className="absolute -top-32 -right-32 w-80 h-80 bg-cyan-500/15 blur-[120px] rounded-full animate-pulse"></div>
        <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-indigo-600/15 blur-[120px] rounded-full animate-pulse"></div>

        <div className="relative z-10">
          <label className="block text-[10px] font-black text-cyan-400/90 uppercase tracking-[0.3em] mb-4 ml-2">Ниша или Личный бренд</label>
          <input
            type="text"
            placeholder="Психолог, крипто-инвестор, кофейня..."
            className="w-full bg-slate-950/70 border-2 border-slate-800/80 rounded-[1.5rem] px-7 py-5 focus:outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 text-white placeholder-slate-700 transition-all font-bold text-xl shadow-inner"
            value={niche}
            onChange={(e) => setNiche(e.target.value)}
            required
          />
        </div>

        <div className="relative z-10">
          <label className="block text-[10px] font-black text-cyan-400/90 uppercase tracking-[0.3em] mb-4 ml-2">Главная цель контента</label>
          <div className="relative group">
            <select
              value={goal}
              onChange={(e) => setGoal(e.target.value as ContentGoal)}
              className="w-full bg-slate-950/70 border-2 border-slate-800/80 rounded-[1.5rem] px-7 py-5 text-white font-black text-lg appearance-none cursor-pointer focus:border-cyan-500 transition-all hover:bg-slate-900 shadow-xl group-hover:border-slate-700"
            >
              {Object.values(ContentGoal).map(g => (
                <option key={g} value={g} className="bg-slate-950 text-white py-4 font-bold">{g}</option>
              ))}
            </select>
            <div className="absolute right-7 top-1/2 -translate-y-1/2 pointer-events-none text-cyan-500 transition-transform group-hover:translate-y-[-40%]">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
          <div>
            <label className="block text-[10px] font-black text-cyan-400/90 uppercase tracking-[0.3em] mb-4 ml-2">Период планирования</label>
            <div className="flex bg-slate-950/70 p-1.5 rounded-[1.25rem] border-2 border-slate-800/80 shadow-inner">
              {Object.values(Period).map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  className={`flex-1 py-4 rounded-xl text-[11px] font-black transition-all uppercase tracking-[0.2em] ${
                    period === p 
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_4px_15px_rgba(6,182,212,0.4)] scale-100' 
                    : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-black text-cyan-400/90 uppercase tracking-[0.3em] mb-4 ml-2">Тон общения (ToV)</label>
            <div className="relative group">
              <select
                className="w-full bg-slate-950/70 border-2 border-slate-800/80 rounded-[1.25rem] px-6 py-4 text-white focus:outline-none focus:border-cyan-500 font-black appearance-none cursor-pointer h-[62px] shadow-inner text-sm uppercase tracking-widest group-hover:border-slate-700 transition-all"
                value={tone}
                onChange={(e) => setTone(e.target.value as ToneOfVoice)}
              >
                {Object.values(ToneOfVoice).map(t => (
                  <option key={t} value={t} className="bg-slate-950 font-black">{t}</option>
                ))}
              </select>
              <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-cyan-500 transition-transform group-hover:translate-y-[-40%]">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10">
          <label className="block text-[10px] font-black text-cyan-400/90 uppercase tracking-[0.3em] mb-4 ml-2">Медиа-исходники</label>
          <div className="group relative border-2 border-dashed border-slate-700/40 rounded-[2rem] p-10 text-center hover:border-cyan-500/60 transition-all cursor-pointer bg-slate-950/60 shadow-inner overflow-hidden">
            <div className="absolute inset-0 bg-cyan-500/[0.02] opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <input
              type="file"
              multiple
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div className="flex flex-col items-center justify-center gap-5">
               <div className="w-20 h-20 bg-gradient-to-br from-cyan-500/10 to-blue-600/10 rounded-[1.5rem] flex items-center justify-center text-cyan-500 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 border border-cyan-500/20 shadow-lg">
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
               </div>
               <div className="space-y-2">
                <p className="text-white font-black text-base uppercase tracking-[0.15em]">
                  {files.length > 0 ? `Активно файлов: ${files.length}` : 'Загрузить RAW материалы'}
                </p>
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">Нейросеть адаптирует контент под ваш визуал</p>
               </div>
            </div>
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-8 rounded-[2.5rem] font-black text-3xl bg-gradient-to-r from-cyan-400 via-blue-600 to-indigo-800 text-white disabled:opacity-50 uppercase tracking-[0.4em] shadow-[0_20px_60px_-15px_rgba(6,182,212,0.5)] hover:shadow-[0_30px_80px_-10px_rgba(6,182,212,0.7)] transition-all hover:-translate-y-2 active:scale-[0.97] relative overflow-hidden group border-t border-white/20"
      >
        <div className="absolute inset-0 bg-white/30 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 skew-x-[-20deg]"></div>
        <span className="relative z-10 drop-shadow-lg italic">{isLoading ? 'ЗАПУСК...' : 'ЗАПУСТИТЬ ЗАВОД'}</span>
      </button>
    </form>
  );
};

export default WizardForm;
