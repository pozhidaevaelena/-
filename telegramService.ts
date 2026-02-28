
import { Post } from "./types";

export const sendToTelegram = async (botToken: string, chatId: string, posts: Post[]): Promise<boolean> => {
  try {
    for (const post of posts) {
      const caption = `<b>${post.title}</b>\n\n${post.content}${post.script ? `\n\n🎬 <b>Сценарий:</b>\n<i>${post.script}</i>` : ''}`;
      
      const url = `https://api.telegram.org/bot${botToken}/sendPhoto`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          photo: post.imageUrl,
          caption: caption,
          parse_mode: 'HTML'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.description || 'Ошибка API Telegram');
      }

      await new Promise(r => setTimeout(r, 1000));
    }
    return true;
  } catch (error) {
    console.error("Telegram publish error:", error);
    throw error;
  }
};
