
import { GoogleGenAI, Type } from "@google/genai";
import { Post, Period, ToneOfVoice, ContentGoal, AnalysisData, PostStatus, ContentHistoryItem } from "./types";

const getAI = () => {
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("API ключ не найден. Проверьте настройки окружения (GEMINI_API_KEY).");
  }
  return new GoogleGenAI({ apiKey });
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

export const generateAnalysis = async (niche: string): Promise<AnalysisData> => {
  const ai = getAI();
  const prompt = `Проведи глубокий анализ ниши "${niche}" на русском языке. 
  Найди 3 основных конкурентов, актуальные новости и тренды на текущий момент. 
  Определи, какой контент получает больше всего откликов.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
    },
  });

  const structuredResponse = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Преврати этот анализ в JSON объект с полями: 
    competitors (массив), 
    trends (массив), 
    summary (текст). 
    Анализ: ${response.text}`,
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
  });

  if (!structuredResponse.text) throw new Error("Empty AI response");
  return JSON.parse(structuredResponse.text);
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
    : "";

  const prompt = `Создай уникальный контент-план на ${days} дней для ниши "${niche}".
  Цель: ${goal}. 
  Стиль (ToV): ${tone}.
  Тренды: ${analysis.trends.join(', ')}.
  ${historyPrompt}
  Сделай контент максимально специфичным именно для этой ниши. 
  Если цель "Продажи" - делай упор на боли и решение. 
  Если "Доверие" - на кейсы и экспертность.
  Верни результат как JSON массив объектов.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.1-pro-preview',
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
            imagePrompt: { type: Type.STRING, description: "Detailed description for image generation" }
          },
          required: ["title", "type", "content", "day", "imagePrompt"]
        }
      }
    }
  });

  if (!response.text) throw new Error("Empty AI plan response");
  const rawPosts = JSON.parse(response.text);
  
  // Для каждого поста генерируем уникальное изображение
  const postsWithImages = await Promise.all(rawPosts.map(async (p: any, index: number) => {
    let imageUrl = '';
    try {
      const imgResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            ...(userFiles.length > 0 ? [await fileToGenerativePart(userFiles[index % userFiles.length])] : []),
            { text: `Generate a high-quality unique image for a social media post. Topic: ${p.title}. Description: ${p.imagePrompt}. Ensure the style is ${tone}. ${userFiles.length > 0 ? "Incorporate the visual style/elements from the provided image." : ""}` }
          ]
        },
        config: {
          imageConfig: { aspectRatio: "1:1" }
        }
      });

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

    return {
      ...p,
      id: Math.random().toString(36).substr(2, 9),
      date: new Date(Date.now() + index * 24 * 60 * 60 * 1000).toLocaleDateString('ru-RU'),
      status: PostStatus.PENDING,
      editCount: 0,
      imageUrl
    };
  }));

  return postsWithImages;
};

export const editPostContent = async (post: Post, feedback: string): Promise<Post> => {
  const ai = getAI();
  const prompt = `Отредактируй пост "${post.title}" на основе обратной связи: "${feedback}". 
  Учти предыдущий контент: ${post.content}. 
  Верни обновленный JSON объект.`;

  const response = await ai.models.generateContent({
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
  });

  if (!response.text) throw new Error("Empty AI edit response");
  const updated = JSON.parse(response.text);
  
  // При редактировании тоже обновляем картинку
  let newImageUrl = post.imageUrl;
  try {
     const imgUpdate = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: `Update/Generate a new image for: ${updated.imagePrompt || post.title}. Feedback: ${feedback}`,
        config: { imageConfig: { aspectRatio: "1:1" } }
     });
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
    imageUrl: newImageUrl,
    editCount: post.editCount + 1,
    status: PostStatus.PENDING
  };
};
