
import React, { useState } from 'react';
import { Post, PostStatus } from '../types';

interface Props {
  post: Post;
  onApprove: (id: string) => void;
  onEdit: (id: string, feedback: string) => void;
}

const PostCard: React.FC<Props> = ({ post, onApprove, onEdit }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [feedback, setFeedback] = useState('');

  const canEdit = post.editCount < 2;

  const handleEditSubmit = () => {
    if (feedback.trim()) {
      onEdit(post.id, feedback);
      setIsEditing(false);
      setFeedback('');
    }
  };

  return (
    <div className={`group glass rounded-[2.5rem] overflow-hidden transition-all duration-500 flex flex-col h-full hover:neon-border hover:-translate-y-2 ${post.status === PostStatus.APPROVED ? 'border-emerald-500/30 bg-emerald-500/[0.02]' : ''}`}>
      <div className="relative h-64 overflow-hidden">
        <img src={post.imageUrl} alt={post.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-60"></div>
        
        <div className="absolute top-6 left-6 flex gap-2">
          <div className="bg-slate-900/80 backdrop-blur-xl px-4 py-1.5 rounded-2xl text-[10px] font-black text-white uppercase tracking-widest border border-white/10">
            {post.type}
          </div>
          <div className="bg-blue-600/80 backdrop-blur-xl px-3 py-1.5 rounded-2xl text-[10px] font-black text-white border border-white/10">
            ДЕНЬ {post.day}
          </div>
        </div>

        {post.status === PostStatus.APPROVED && (
          <div className="absolute top-6 right-6 bg-emerald-500 px-3 py-1.5 rounded-2xl text-[10px] font-black text-white shadow-lg shadow-emerald-500/20">
            ГОТОВО
          </div>
        )}
      </div>

      <div className="p-8 flex-grow flex flex-col">
        <h4 className="font-bold text-xl mb-3 text-white leading-tight">{post.title}</h4>
        <p className="text-slate-400 text-sm mb-6 line-clamp-4 leading-relaxed font-medium">{post.content}</p>
        
        {post.script && (
          <div className="bg-slate-950/40 border border-slate-700/30 p-5 rounded-3xl mb-6">
            <span className="text-[10px] text-blue-400 uppercase font-black block mb-2 tracking-widest">Script for Reels</span>
            <p className="text-xs text-slate-300 italic line-clamp-3 leading-relaxed">{post.script}</p>
          </div>
        )}

        <div className="mt-auto space-y-4 pt-6 border-t border-white/5">
          {isEditing ? (
            <div className="space-y-4">
              <textarea
                className="w-full bg-slate-950/60 border border-slate-700/50 rounded-2xl p-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-600"
                placeholder="Что нужно улучшить в этом посте?"
                rows={3}
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleEditSubmit}
                  className="flex-1 py-3 bg-blue-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-500 transition-colors"
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
              {post.status !== PostStatus.APPROVED ? (
                <>
                  <button
                    onClick={() => onApprove(post.id)}
                    className="flex-1 py-4 bg-white text-slate-950 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-400 hover:text-white transition-all shadow-xl shadow-white/5"
                  >
                    Согласовать
                  </button>
                  {canEdit && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="w-14 h-14 bg-slate-800 flex items-center justify-center rounded-2xl text-slate-400 hover:text-white hover:bg-slate-700 transition-all"
                      title={`Правок осталось: ${2 - post.editCount}`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                  )}
                </>
              ) : (
                <div className="w-full text-center py-4 bg-emerald-500/10 text-emerald-400 rounded-2xl text-xs font-black border border-emerald-500/20 uppercase tracking-widest">
                  Подготовлено к печати
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
