import React, { useState } from 'react';
import { Post, PostStatus } from '../types';

interface Props {
  post: Post;
  onApprove: (id: string) => void;
  onEdit: (id: string, feedback: string) => void;
  onRegenerateImage: (id: string) => void;
}

const PostCard: React.FC<Props> = ({ post, onApprove, onEdit, onRegenerateImage }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  const canEdit = post.editCount < 2;

  const handleEditSubmit = () => {
    if (feedback.trim()) {
      onEdit(post.id, feedback);
      setIsEditing(false);
      setFeedback('');
    }
  };

  const handleManualGenerate = async () => {
    if (isGeneratingImage) return;
    setIsGeneratingImage(true);
    try {
      await onRegenerateImage(post.id);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const getScriptLabel = (type: string) => {
    switch (type) {
      case 'Post': return 'Текст поста';
      case 'Reels': return 'Сценарий Reels';
      case 'Story': return 'Сценарий Story';
      default: return 'Дополнительные детали';
    }
  };

  const isApproved = post.status === PostStatus.APPROVED || post.status === PostStatus.PUBLISHED;

  return (
    <div className={`group glass rounded-[2.5rem] overflow-hidden transition-all duration-500 flex flex-col h-full hover:neon-border hover:-translate-y-2 ${isApproved ? 'border-cyan-500/30 bg-cyan-500/[0.05]' : ''}`}>
      <div className="relative h-64 overflow-hidden bg-slate-900 flex items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-60 z-10"></div>
        
        {post.imageUrl ? (
          <img src={post.imageUrl} alt={post.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
        ) : (
          <div className="relative z-20 flex flex-col items-center gap-4 p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center border border-white/5">
              {isGeneratingImage ? (
                <div className="w-6 h-6 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin"></div>
              ) : (
                <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              )}
            </div>
            <div className="space-y-2">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">
                {isGeneratingImage ? 'Нейросеть рисует...' : 'Визуал не готов'}
              </span>
              {!isGeneratingImage && (
                <button 
                  onClick={handleManualGenerate}
                  className="px-4 py-2 bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-400 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-cyan-500/30"
                >
                  Сгенерировать
                </button>
              )}
            </div>
          </div>
        )}
        
        {post.imageUrl && (
          <button 
            onClick={handleManualGenerate}
            className="absolute bottom-4 right-4 z-20 p-2.5 bg-slate-900/80 backdrop-blur-xl rounded-xl text-slate-400 hover:text-cyan-400 transition-all border border-white/10 opacity-0 group-hover:opacity-100"
            title="Перегенерировать изображение"
          >
            {isGeneratingImage ? (
              <div className="w-4 h-4 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin"></div>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            )}
          </button>
        )}
        
        <div className="absolute top-6 left-6 flex gap-2">
          <div className="bg-slate-900/80 backdrop-blur-xl px-4 py-1.5 rounded-2xl text-[10px] font-black text-white uppercase tracking-widest border border-white/10">
            {post.type}
          </div>
          <div className="bg-blue-600/80 backdrop-blur-xl px-3 py-1.5 rounded-2xl text-[10px] font-black text-white border border-white/10">
            ДЕНЬ {post.day}
          </div>
        </div>

        {post.status === PostStatus.APPROVED && (
          <div className="absolute top-6 right-6 bg-cyan-500 px-3 py-1.5 rounded-2xl text-[10px] font-black text-slate-950 shadow-lg shadow-cyan-500/20 animate-pulse uppercase tracking-wider">
            Утверждено
          </div>
        )}
        {post.status === PostStatus.PUBLISHED && (
          <div className="absolute top-6 right-6 bg-emerald-500 px-3 py-1.5 rounded-2xl text-[10px] font-black text-white shadow-lg shadow-emerald-500/20 uppercase tracking-wider">
            В эфире
          </div>
        )}
      </div>

      <div className="p-8 flex-grow flex flex-col">
        <h4 className="font-bold text-xl mb-3 text-white leading-tight">{post.title}</h4>
        <p className="text-slate-400 text-sm mb-6 line-clamp-4 leading-relaxed font-medium">{post.content}</p>
        
        {post.script && (
          <div className="bg-slate-950/40 border border-slate-700/30 p-5 rounded-3xl mb-6">
            <span className="text-[10px] text-cyan-400 uppercase font-black block mb-2 tracking-widest">
              {getScriptLabel(post.type)}
            </span>
            <p className="text-xs text-slate-300 italic line-clamp-3 leading-relaxed">{post.script}</p>
          </div>
        )}

        <div className="mt-auto space-y-4 pt-6 border-t border-white/5">
          {isEditing ? (
            <div className="space-y-4">
              <textarea
                className="w-full bg-slate-950/60 border border-slate-700/50 rounded-2xl p-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 placeholder-slate-600 font-bold"
                placeholder="Что нужно улучшить в этом посте?"
                rows={3}
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleEditSubmit}
                  className="flex-1 py-3 bg-cyan-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-cyan-500 transition-colors shadow-lg shadow-cyan-500/10"
                >
                  Обновить
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-6 py-3 bg-slate-800 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-700 transition-colors"
                >
                  Отмена
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              {(post.status === PostStatus.PENDING || post.status === PostStatus.EDITING) && (
                <>
                  <button
                    onClick={() => onApprove(post.id)}
                    className="flex-1 py-4 bg-white text-slate-950 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-cyan-400 hover:text-white transition-all shadow-xl shadow-white/5"
                  >
                    Согласовать
                  </button>
                  {canEdit && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="w-14 h-14 bg-slate-800 flex items-center justify-center rounded-2xl text-slate-400 hover:text-white hover:bg-slate-700 transition-all border border-white/5"
                      title={`Правок осталось: ${2 - post.editCount}`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                  )}
                </>
              )}
              {post.status === PostStatus.APPROVED && (
                <div className="w-full text-center py-4 bg-cyan-500/10 text-cyan-400 rounded-2xl text-[10px] font-black border border-cyan-500/20 uppercase tracking-[0.2em]">
                  Ожидает массовой публикации
                </div>
              )}
              {post.status === PostStatus.PUBLISHED && (
                <div className="w-full text-center py-4 bg-emerald-500/10 text-emerald-400 rounded-2xl text-[10px] font-black border border-emerald-500/20 uppercase tracking-[0.2em]">
                  Контент опубликован
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PostCard;
