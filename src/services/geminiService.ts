
import { GoogleGenAI, Type } from "@google/genai";
import { Post, Period, ToneOfVoice, ContentGoal, AnalysisData, PostStatus, ContentHistoryItem } from "../types";

const getAI = () => {
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("API ключ не найден. Проверьте настройки окружения (GEMINI_API_KEY).");
  }
  return new GoogleGenAI({ apiKey });
};

// Хелпер для повторных попыток при ошибке 429
const fetchWithRetry = async (fn: () => Promise<any>, retries = 5, delay = 5000): Promise<any> => {
  try {
    return await fn();
  } catch (error: any) {
    const isQuotaError = 
      error.message?.includes('429') || 
      error.status === 429 || 
      error.message?.includes('RESOURCE_EXHAUSTED') ||
      error.message?.includes('Quota') ||
      error.message?.includes('limit');

    if (retries > 0 && isQuotaError) {
      console.warn(`Quota hit, retrying in ${delay}ms... (${retries} left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchWithRetry(fn, retries - 1, delay * 1.5);
    }
    throw error;
  }
};

// Функция для конвертации файла в base64
const fileToGenerativePart = async (file: File) => {
  const base64EncodedDataPromise = new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise as string, mimeType: file.type },
  };
};

export const generateAnalysis = async (niche: string, goal: ContentGoal): Promise<AnalysisData> => {
  const ai = getAI();
  const prompt = `Проведи глубокий маркетинговый анализ ниши "${niche}" для цели: "${goal}".
  ИСПОЛЬЗУЙ ПОИСК GOOGLE ДЛЯ СЛЕДУЮЩИХ ЗАДАЧ:
  1. Найди 3-5 популярных Telegram-каналов конкурентов именно в нише "${niche}". 
  2. Проанализируй их контент: какие посты (кейсы, советы, новости, юмор) собирают больше всего реакций и комментариев.
  3. Найди последние новости и инфоповоды в нише "${niche}" за последние 7-14 дней.
  
  ВЕРНИ ОТВЕТ СТРОГО В ФОРМАТЕ JSON:
  {
    "competitors": ["название канала 1 (описание что заходит)", "название канала 2 (описание что заходит)", "название канала 3 (описание что заходит)"],
    "trends": ["новость/тренд 1", "новость/тренд 2", "новость/тренд 3"],
    "summary": "Стратегия на основе анализа конкурентов в Telegram и свежих новостей."
  }`;

  const response = await fetchWithRetry(() => ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          competitors: { type: Type.ARRAY, items: { type: Type.STRING } },
          trends: { type: Type.ARRAY, items: { type: Type.STRING } },
          summary: { type: Type.STRING },
        },
        required: ["competitors", "trends", "summary"]
      }
    }
  }), 5, 8000); // Больше попыток и задержка для поиска

  if (!response.text) throw new Error("Empty AI response during analysis");
  return JSON.parse(response.text);
};

export const generateContentPlan = async (
  niche: string, 
  period: Period, 
  tone: ToneOfVoice, 
  goal: ContentGoal,
  analysis: AnalysisData,
  history: ContentHistoryItem[] = []
): Promise<Post[]> => {
  const ai = getAI();
  const days = period === Period.WEEK ? 7 : 30;

  const relevantHistory = history.filter(h => h.niche.toLowerCase() === niche.toLowerCase()).map(h => h.title);
  const historyPrompt = relevantHistory.length > 0 
    ? `ВАЖНО: Никогда не повторяй эти темы: ${relevantHistory.join(', ')}.`
    : "";

  const prompt = `Создай уникальный контент-план на ${days} дней для ниши "${niche}".
  Цель: ${goal}. 
  Стиль (ToV): ${tone}.
  Данные анализа: Конкуренты: ${analysis.competitors.join(', ')}. Тренды: ${analysis.trends.join(', ')}.
  ${historyPrompt}
  
  ДЛЯ КАЖДОГО ПОСТА ОБЯЗАТЕЛЬНО:
  1. Title: Заголовок.
  2. Type: Post, Reels или Story.
  3. Content: Текст на русском (минимум 300 символов).
  4. Script: Сценарий (для видео).
  5. ImagePrompt: ГИПЕР-РЕАЛИСТИЧНОЕ описание визуальной сцены на АНГЛИЙСКОМ. 
     - Описывай ПРЯМОЙ ПРЕДМЕТ из текста поста как ГЛАВНЫЙ ОБЪЕКТ.
     - Если в тексте "шашлык" — ПЕРВЫМ СЛОВОМ должно быть "Juicy grilled meat skewers".
     - Если в тексте "улыбки гостей" — ПЕРВЫМ СЛОВОМ должно быть "Happy people laughing".
     - Описывай текстуры, освещение, фон и атмосферу.
     - ЗАПРЕЩЕНО: Использовать абстрактные понятия или скучные фоны (стены, пустые комнаты).
     - СТИЛЬ: Professional food/lifestyle photography, sharp focus, vibrant colors.
  
  Верни результат как JSON массив объектов.`;

  const response = await fetchWithRetry(() => ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            type: { type: Type.STRING, enum: ["Post", "Reels", "Story"] },
            content: { type: Type.STRING },
            script: { type: Type.STRING },
            day: { type: Type.NUMBER },
            imagePrompt: { type: Type.STRING }
          },
          required: ["title", "type", "content", "day", "imagePrompt"]
        }
      }
    }
  }));

  if (!response.text) throw new Error("Empty AI plan response");
  const rawPosts = JSON.parse(response.text);
  
  return rawPosts.map((p: any) => ({
    ...p,
    id: Math.random().toString(36).substr(2, 9),
    date: new Date(Date.now() + (p.day - 1) * 24 * 60 * 60 * 1000).toLocaleDateString('ru-RU'),
    status: PostStatus.PENDING,
    editCount: 0,
    imageUrl: '' // Будет сгенерировано позже
  }));
};

export const generateImageForPost = async (post: Post, tone: ToneOfVoice, userFiles: File[] = []): Promise<string> => {
  const ai = getAI();
  try {
    const parts: any[] = [];
    if (userFiles.length > 0) {
      parts.push(await fileToGenerativePart(userFiles[Math.floor(Math.random() * userFiles.length)]));
    }
    
    const finalImagePrompt = `
      High-quality professional photography for a Telegram channel.
      Context: This image is for a Telegram post titled "${post.title}".
      Post Content Summary: ${post.content.substring(0, 200)}...
      Visual Scene to Generate: ${post.imagePrompt}.
      Style: ${tone} aesthetic, vibrant colors, sharp focus, professional lighting.
      Strict Rules: NO text, NO words, NO letters, NO logos, NO distorted faces.
      Relevance: The image MUST directly illustrate the core topic of the post (e.g., if it's about food, show the food; if it's about people, show the people).
      ${userFiles.length > 0 ? "Visual Reference: Match the color palette and mood of the attached image." : ""}
    `.trim();

    parts.push({ text: finalImagePrompt });

    const imgResponse = await fetchWithRetry(() => ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts },
      config: {
        imageConfig: { aspectRatio: "1:1" }
      }
    }));

    for (const part of imgResponse.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image data in response");
  } catch (e) {
    console.error("Image generation failed", e);
    return `https://picsum.photos/seed/${post.id}/800/800`;
  }
};

export const editPostContent = async (post: Post, feedback: string): Promise<Post> => {
  const ai = getAI();
  const prompt = `Отредактируй пост "${post.title}" на основе обратной связи: "${feedback}". 
  Учти предыдущий контент: ${post.content}. 
  Верни обновленный JSON объект.`;

  const response = await fetchWithRetry(() => ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          content: { type: Type.STRING },
          script: { type: Type.STRING },
          imagePrompt: { type: Type.STRING }
        },
        required: ["content"]
      }
    }
  }));

  if (!response.text) throw new Error("Empty AI edit response");
  const updated = JSON.parse(response.text);
  
  // При редактировании тоже обновляем картинку
  let newImageUrl = post.imageUrl;
  try {
     const finalEditPrompt = `
       Professional update of a social media visual.
       New Subject: ${updated.imagePrompt || post.imagePrompt}.
       Feedback to incorporate: ${feedback}.
       Style: High-quality, cinematic, no text.
     `.trim();

     const imgUpdate = await fetchWithRetry(() => ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: finalEditPrompt,
        config: { imageConfig: { aspectRatio: "1:1" } }
     }));
     for (const part of imgUpdate.candidates[0].content.parts) {
        if (part.inlineData) {
          newImageUrl = `data:image/png;base64,${part.inlineData.data}`;
          break;
        }
      }
  } catch(e) {}

  return {
    ...post,
    content: updated.content,
    script: updated.script || post.script,
    imagePrompt: updated.imagePrompt || post.imagePrompt,
    imageUrl: newImageUrl,
    editCount: post.editCount + 1,
    status: PostStatus.PENDING
  };
};
