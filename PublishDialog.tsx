
import React, { useState, useEffect } from 'react';

interface Props {
  onConfirm: (config: { botToken: string, chatId: string }) => void;
  onCancel: () => void;
}

const PublishDialog: React.FC<Props> = ({ onConfirm, onCancel }) => {
  const [botToken, setBotToken] = useState('');
  const [chatId, setChatId] = useState('');

  // Load saved credentials
  useEffect(() => {
    const savedToken = localStorage.getItem('cf_bot_token');
    const savedId = localStorage.getItem('cf_chat_id');
    if (savedToken) setBotToken(savedToken);
    if (savedId) setChatId(savedId);
  }, []);

  const handleConfirm = () => {
    if (!botToken || !chatId) {
      alert("Пожалуйста, заполните все поля");
      return;
    }
    // Save for next time
    localStorage.setItem('cf_bot_token', botToken);
    localStorage.setItem('cf_chat_id', chatId);
    onConfirm({ botToken, chatId });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-md animate-fade-in">
      <div className="glass w-full max-w-md p-10 rounded-[3rem] shadow-2xl neon-border relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/10 blur-3xl rounded-full"></div>
        
        <h2 className="text-3xl font-black mb-2 gradient-text uppercase tracking-tight">Настройка Бота</h2>
        <p className="text-slate-400 text-sm mb-8 font-medium">Введите данные вашего бота для публикации в канал или чат.</p>
        
        <div className="space-y-6 mb-10">
          <div className="space-y-2">
            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Telegram Bot Token</label>
            <input
              type="password"
              className="w-full bg-slate-950/50 border border-slate-700/50 rounded-2xl px-5 py-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-700 font-medium"
              placeholder="123456:ABC-DEF..."
              value={botToken}
              onChange={(e) => setBotToken(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Chat ID / Channel @link</label>
            <input
              type="text"
              className="w-full bg-slate-950/50 border border-slate-700/50 rounded-2xl px-5 py-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-700 font-medium"
              placeholder="@my_channel_name"
              value={chatId}
              onChange={(e) => setChatId(e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={handleConfirm}
            className="w-full py-5 gradient-btn rounded-2xl font-black uppercase tracking-widest text-white shadow-xl"
          >
            Подтвердить и Отправить
          </button>
          <button
            onClick={onCancel}
            className="w-full py-4 bg-slate-900/50 rounded-2xl font-bold text-slate-500 hover:text-slate-300 transition-colors uppercase text-xs tracking-widest"
          >
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
};

export default PublishDialog;
