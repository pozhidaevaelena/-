
import { GoogleGenAI, Type, ThinkingLevel, Modality } from "@google/genai";
import { Post, Period, ToneOfVoice, ContentGoal, AnalysisData, PostStatus, ContentHistoryItem } from "../types";

const getAI = () => {
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("API ключ не найден. Проверьте настройки окружения (GEMINI_API_KEY).");
  }
  return new GoogleGenAI({ apiKey });
};

// Хелпер для повторных попыток при ошибке 429
const fetchWithRetry = async (fn: () => Promise<any>, retries = 3, delay = 2000): Promise<any> => {
  try {
    return await fn();
  } catch (error: any) {
    if (retries > 0 && (
      error.message?.includes('429') || 
      error.status === 429 || 
      error.message?.includes('RESOURCE_EXHAUSTED') ||
      error.message?.includes('Quota')
    )) {
      console.warn(`Quota hit, retrying in ${delay}ms... (${retries} left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchWithRetry(fn, retries - 1, delay * 2);
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
  const prompt = `Проведи глубокий анализ ниши "${niche}" на русском языке с учетом цели: "${goal}". 
  Определи 3 основных типа конкурентов, актуальные тренды и боли аудитории.
  Определи, какой контент сейчас получает больше всего охватов и конверсий для этой цели.
  
  ВЕРНИ ОТВЕТ СТРОГО В ФОРМАТЕ JSON:
  {
    "competitors": ["тип1", "тип2", "тип3"],
    "trends": ["тренд1", "тренд2", "тренд3"],
    "summary": "краткая стратегия на 3-4 предложения"
  }`;

  const response = await fetchWithRetry(() => ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
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
  }));

  if (!response.text) throw new Error("Empty AI response during analysis");
  return JSON.parse(response.text);
};

export const generateContentPlan = async (
  niche: string, 
  period: Period, 
  tone: ToneOfVoice, 
  goal: ContentGoal,
  analysis: AnalysisData,
  history: ContentHistoryItem[] = [],
  userFiles: File[] = []
): Promise<Post[]> => {
  const ai = getAI();
  const days = period === Period.WEEK ? 7 : 30;

  const relevantHistory = history.filter(h => h.niche.toLowerCase() === niche.toLowerCase()).map(h => h.title);
  const historyPrompt = relevantHistory.length > 0 
    ? `ВАЖНО: Никогда не повторяй эти темы: ${relevantHistory.join(', ')}.`
    : "";  const prompt = `Создай уникальный контент-план на ${days} дней для ниши "${niche}".
  Цель: ${goal}. 
  Стиль (ToV): ${tone}.
  Данные анализа рынка: Конкуренты: ${analysis.competitors.join(', ')}. Тренды: ${analysis.trends.join(', ')}.
  ${historyPrompt}
  
  ДЛЯ КАЖДОГО ПОСТА ОБЯЗАТЕЛЬНО:
  1. Title: Цепляющий заголовок.
  2. Type: Post, Reels или Story.
  3. Content: Глубокий текст на русском.
  4. Script: Сценарий (для видео).
  5. ImagePrompt: ДЕТАЛЬНОЕ описание образа на АНГЛИЙСКОМ. 
     ИНСТРУКЦИЯ ПО ВИЗУАЛИЗАЦИИ:
     - Сначала определи ГЛАВНУЮ ЭМОЦИЮ или СОБЫТИЕ поста.
     - Создай образ, который передает это событие БЕЗ ТЕКСТА.
     - Если пост про семейный кризис: покажи двух людей, сидящих спиной друг к другу, или разбитую вазу, которую склеивают золотом (кинцуги).
     - КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО: Кофе, ноутбуки, пустые офисы, бизнесмены в костюмах (если это не тема поста).
     - СТИЛЬ: Cinematic photography, emotional atmosphere, realistic textures.
  
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
  
  const postsWithImages = [];
  for (let index = 0; index < rawPosts.length; index++) {
    const p = rawPosts[index];
    let imageUrl = '';
    try {
      if (index > 0) await new Promise(resolve => setTimeout(resolve, 3000));

      const parts: any[] = [];
      if (userFiles.length > 0) {
        parts.push(await fileToGenerativePart(userFiles[index % userFiles.length]));
      }
      
      // Формируем максимально чистый и мощный промпт для генератора
      const finalImagePrompt = `
        Professional social media photography/illustration.
        Style: ${tone} aesthetic.
        Subject: ${p.imagePrompt}.
        Atmosphere: High-end, cinematic lighting, sharp focus, 8k resolution.
        Strict Rules: NO text, NO words, NO letters, NO logos, NO watermarks. 
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
          imageUrl = `data:image/png;base64,${part.inlineData.data}`;
          break;
        }
      }
    } catch (e) {
      console.warn("Image gen failed for post", index, e);
      imageUrl = `https://picsum.photos/seed/${Math.random()}/800/800`;
    }

    postsWithImages.push({
      ...p,
      id: Math.random().toString(36).substr(2, 9),
      date: new Date(Date.now() + index * 24 * 60 * 60 * 1000).toLocaleDateString('ru-RU'),
      status: PostStatus.PENDING,
      editCount: 0,
      imageUrl
    });
  }

  return postsWithImages;
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
