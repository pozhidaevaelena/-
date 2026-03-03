
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import { Post, Period, ToneOfVoice, ContentGoal, AnalysisData, PostStatus, ContentHistoryItem } from "../types";

const getAI = () => {
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("API ключ не найден. Проверьте настройки окружения (GEMINI_API_KEY).");
  }
  return new GoogleGenAI({ apiKey });
};

// Хелпер для повторных попыток при ошибках API или сети
const fetchWithRetry = async (fn: () => Promise<any>, retries = 5, delay = 30000): Promise<any> => {
  try {
    return await fn();
  } catch (error: any) {
    const errorMessage = error.message || String(error);
    const isQuotaError = 
      errorMessage.includes('429') || 
      error.status === 429 || 
      errorMessage.includes('RESOURCE_EXHAUSTED') ||
      errorMessage.includes('Quota') ||
      errorMessage.includes('limit');
    
    const isOverloadedError = 
      errorMessage.includes('503') || 
      error.status === 503 || 
      errorMessage.includes('UNAVAILABLE') ||
      errorMessage.includes('high demand');
    
    const isNetworkError = 
      errorMessage.includes('Failed to fetch') || 
      errorMessage.includes('NetworkError') ||
      errorMessage.includes('fetch');

    if (retries > 0 && (isQuotaError || isOverloadedError || isNetworkError)) {
      const type = isQuotaError ? 'Quota' : (isOverloadedError ? 'High Demand' : 'Network');
      // Для ошибок квоты или перегрузки ждем долго
      const nextDelay = (isQuotaError || isOverloadedError) ? delay * 2 : delay * 1.5;
      console.warn(`${type} error hit: ${errorMessage}. Retrying in ${delay}ms... (${retries} left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchWithRetry(fn, retries - 1, nextDelay);
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
  const prompt = `Проведи быстрый маркетинговый анализ ниши "${niche}" для цели: "${goal}".
  ИСПОЛЬЗУЙ ПОИСК GOOGLE (ОБЯЗАТЕЛЬНО):
  1. Найди 3 РЕАЛЬНЫХ Telegram-канала конкурентов именно в нише "${niche}". Ссылки должны быть вида t.me/username или @username.
  2. Кратко опиши, какой тип контента у них самый популярный (кейсы, новости, советы).
  3. Найди 3 актуальных новости или тренда в нише "${niche}" за последние 7 дней.
  
  ВЕРНИ ОТВЕТ СТРОГО В ФОРМАТЕ JSON:
  {
    "competitors": ["@username (описание)", "@username (описание)", "@username (описание)"],
    "trends": ["конкретная новость 1", "конкретная новость 2", "конкретная новость 3"],
    "summary": "Краткая стратегия на основе найденных ТГ-каналов."
  }
  
  ОБЯЗАТЕЛЬНО: Только JSON. Если поиск не дал результатов, используй свои знания о популярных ТГ-каналах в этой нише.`;

  try {
    const response = await fetchWithRetry(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
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
    }), 3, 30000);

    if (!response.text) throw new Error("Empty AI response during analysis");
    return JSON.parse(response.text);
  } catch (error) {
    console.warn("Analysis with search failed, falling back to basic analysis", error);
    // Фолбек: генерация анализа БЕЗ поиска, если квоты на поиск исчерпаны
    const fallbackResponse = await fetchWithRetry(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt.replace("ИСПОЛЬЗУЙ ПОИСК GOOGLE:", "ИСПОЛЬЗУЙ СВОИ ЗНАНИЯ (БЕЗ ПОИСКА):"),
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
    }), 2, 10000);
    
    if (!fallbackResponse.text) throw new Error("Empty AI fallback response");
    return JSON.parse(fallbackResponse.text);
  }
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
  
  const prompt = `
    ЗАДАЧА: Составь контент-план на ${days} дней для ниши "${niche}".
    Цель: ${goal}. Стиль (ToV): ${tone}.
    
    ДАННЫЕ АНАЛИЗА (ИСПОЛЬЗУЙ ИХ):
    - Конкуренты: ${analysis.competitors.join(', ')}
    - Тренды: ${analysis.trends.join(', ')}
    - Стратегия: ${analysis.summary}
    
    ${relevantHistory.length > 0 ? `ВАЖНО: Никогда не повторяй эти темы: ${relevantHistory.join(', ')}.` : ""}
    
    ДЛЯ КАЖДОГО ПОСТА ОБЯЗАТЕЛЬНО:
    1. Title: Заголовок.
    2. Type: Post, Reels или Story.
    3. Content: Текст на русском (минимум 300 символов).
    4. Script: Сценарий (для видео).
    5. ImagePrompt: ГИПЕР-РЕАЛИСТИЧНОЕ описание визуальной сцены на АНГЛИЙСКОМ. 
       - Описывай ПРЯМОЙ ПРЕДМЕТ из текста поста как ГЛАВНЫЙ ОБЪЕКТ.
       - СТИЛЬ: Professional photography, sharp focus, vibrant colors.
    
    ВЕРНИ ОТВЕТ СТРОГО В ФОРМАТЕ JSON массив объектов.`;

  const response = await fetchWithRetry(() => ai.models.generateContent({
    model: 'gemini-3-flash-preview',
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
  }), 5, 20000);

  if (!response.text) throw new Error("Empty AI plan response");
  const rawPosts = JSON.parse(response.text);
  
  return rawPosts.map((p: any) => ({
    ...p,
    id: Math.random().toString(36).substr(2, 9),
    date: new Date(Date.now() + (p.day - 1) * 24 * 60 * 60 * 1000).toLocaleDateString('ru-RU'),
    status: PostStatus.PENDING,
    editCount: 0,
    imageUrl: ''
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
      Professional photography for ${post.type}.
      Topic: ${post.title}.
      Visual Scene: ${post.imagePrompt}.
      Style: ${tone} aesthetic, high quality, sharp focus.
      Strict Rules: NO text, NO words, NO letters, NO logos.
      ${userFiles.length > 0 ? "Visual Reference: Match the mood of the attached image." : ""}
    `.trim();

    parts.push({ text: finalImagePrompt });

    const imgResponse = await fetchWithRetry(() => ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts },
      config: {
        imageConfig: { aspectRatio: "1:1" }
      }
    }), 3, 20000);

    if (!imgResponse.candidates?.[0]?.content?.parts) {
      console.error("Full API Response:", JSON.stringify(imgResponse, null, 2));
      throw new Error("API returned no content parts for image. This might be a safety filter block.");
    }

    for (const part of imgResponse.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    
    // Если мы здесь, значит в ответе нет inlineData
    console.error("No inlineData in parts:", imgResponse.candidates[0].content.parts);
    throw new Error("No image data found in AI response (possibly blocked by safety filters or empty response)");
  } catch (e: any) {
    console.error("Image generation failed:", e.message || e);
    throw e; 
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
        contents: { parts: [{ text: finalEditPrompt }] },
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

export const generateVideoForPost = async (post: Post): Promise<string> => {
  const ai = getAI();
  try {
    const prompt = `Cinematic high-quality video for ${post.type}. Topic: ${post.title}. Scene: ${post.imagePrompt}. Professional lighting, 4k, smooth motion. NO text.`;
    
    let operation = await fetchWithRetry(() => ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt,
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: '9:16'
      }
    }), 2, 30000);

    let attempts = 0;
    while (!operation.done && attempts < 12) {
      await new Promise(resolve => setTimeout(resolve, 10000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
      attempts++;
    }

    if (!operation.done) throw new Error("Video generation timed out");

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) throw new Error("No video link returned from API");

    const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
    const response = await fetch(downloadLink, {
      method: 'GET',
      headers: {
        'x-goog-api-key': apiKey || '',
      },
    });

    if (!response.ok) throw new Error("Failed to download video file");
    
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch (e: any) {
    console.error("Video generation failed:", e);
    throw e;
  }
};
