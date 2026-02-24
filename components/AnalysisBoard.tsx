
import React from 'react';
import { AnalysisData } from '../types';

interface Props {
  data: AnalysisData;
}

const AnalysisBoard: React.FC<Props> = ({ data }) => {
  return (
    <div className="grid md:grid-cols-3 gap-6 mb-10">
      <div className="glass p-6 rounded-2xl border-blue-500/20">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-blue-500/10 p-2 rounded-lg text-blue-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
          </div>
          <h3 className="font-bold text-lg">Конкуренты</h3>
        </div>
        <ul className="space-y-2">
          {data.competitors.map((c, i) => (
            <li key={i} className="text-slate-400 text-sm flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
              {c}
            </li>
          ))}
        </ul>
      </div>

      <div className="glass p-6 rounded-2xl border-purple-500/20">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-purple-500/10 p-2 rounded-lg text-purple-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
          </div>
          <h3 className="font-bold text-lg">Тренды</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {data.trends.map((t, i) => (
            <span key={i} className="bg-purple-500/10 text-purple-300 text-xs px-2 py-1 rounded-full border border-purple-500/30">
              {t}
            </span>
          ))}
        </div>
      </div>

      <div className="glass p-6 rounded-2xl border-emerald-500/20">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-emerald-500/10 p-2 rounded-lg text-emerald-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
          </div>
          <h3 className="font-bold text-lg">Стратегия</h3>
        </div>
        <p className="text-slate-400 text-xs leading-relaxed">
          {data.summary}
        </p>
      </div>
    </div>
  );
};

export default AnalysisBoard;
