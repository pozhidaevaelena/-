
import React, { useState } from 'react';
import { Period, ToneOfVoice } from '../types';

interface Props {
  onSubmit: (data: { niche: string, period: Period, tone: ToneOfVoice, files: File[] }) => void;
  isLoading: boolean;
}

const WizardForm: React.FC<Props> = ({ onSubmit, isLoading }) => {
  const [niche, setNiche] = useState('');
  const [period, setPeriod] = useState<Period>(Period.WEEK);
  const [tone, setTone] = useState<ToneOfVoice>(ToneOfVoice.FRIENDLY);
  const [files, setFiles] = useState<File[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!niche) return;
    onSubmit({ niche, period, tone, files });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-10 animate-fade-in max-w-2xl mx-auto py-12 px-4">
      <div className="text-center mb-12">
        <div className="inline-block px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-widest mb-6">
          Next Gen Content Factory
        </div>
        <h1 className="text-5xl md:text-6xl font-black mb-6 gradient-text tracking-tight">
          ContentFactory AI
        </h1>
        <p className="text-xl text-slate-400 font-medium leading-relaxed max-w-lg mx-auto">
          Ваш персональный контент-завод 24/7. Превращаем идеи в миллионные охваты за пару кликов.
        </p>
      </div>

      <div className="glass p-10 rounded-[2.5rem] space-y-8 neon-border relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-600/20 blur-[100px] rounded-full"></div>
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-600/20 blur-[100px] rounded-full"></div>

        <div>
          <label className="block text-sm font-bold text-slate-300 mb-3 ml-1">Ниша или Тематика</label>
          <input
            type="text"
            placeholder="Например: Эксперт по нейросетям или Кофейня в Москве"
            className="w-full bg-slate-950/40 border border-slate-700/50 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-slate-600 transition-all font-medium"
            value={niche}
            onChange={(e) => setNiche(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-bold text-slate-300 mb-3 ml-1">Период контента</label>
            <div className="flex bg-slate-950/40 p-1 rounded-2xl border border-slate-700/50">
              {Object.values(Period).map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
                    period === p ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-300 mb-3 ml-1">Стиль общения</label>
            <select
              className="w-full bg-slate-950/40 border border-slate-700/50 rounded-2xl px-5 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium appearance-none cursor-pointer"
              value={tone}
              onChange={(e) => setTone(e.target.value as ToneOfVoice)}
            >
              {Object.values(ToneOfVoice).map(t => (
                <option key={t} value={t} className="bg-slate-900">{t}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-300 mb-3 ml-1">Медиа-исходники</label>
          <div className="group relative border-2 border-dashed border-slate-700/50 rounded-[2rem] p-8 text-center hover:border-blue-500/50 transition-all cursor-pointer bg-slate-950/20">
            <input
              type="file"
              multiple
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div className="transform group-hover:scale-110 transition-transform duration-300">
              <svg className="w-12 h-12 text-blue-500/50 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-slate-300 font-bold mb-1">
              {files.length > 0 ? `Файлов: ${files.length}` : 'Загрузите фото и видео'}
            </p>
            <p className="text-xs text-slate-500 font-medium">Для нейро-аватара и персонализации</p>
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-5 rounded-2xl font-black text-xl gradient-btn text-white disabled:opacity-50 uppercase tracking-widest"
      >
        {isLoading ? 'Запуск...' : 'Сгенерировать Будущее'}
      </button>
    </form>
  );
};

export default WizardForm;
