import { getGeminiApiKey } from './env';

const MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
];

export interface GeminiOptions {
  temperature?: number;
  topK?: number;
  topP?: number;
  maxTokens?: number;
}

export async function generateGeminiContent(
  prompt: string,
  systemInstruction?: string,
  modelIndex: number = 0,
  options?: GeminiOptions
): Promise<string> {
  const model = MODELS[modelIndex] || MODELS[0];
  const apiKey = getGeminiApiKey();

  if (!apiKey) {
    throw new Error("Clé API Gemini absente. Veuillez vérifier GEMINI_API_KEY dans vos variables d'environnement.");
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const body: any = {
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: options?.temperature ?? 0.7,
      topK: options?.topK ?? 40,
      topP: options?.topP ?? 0.95,
      maxOutputTokens: options?.maxTokens ?? 3072,
    },
  };

  if (systemInstruction) {
    body.systemInstruction = {
      parts: [{ text: systemInstruction }],
    };
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn(`Gemini model ${model} failed (${response.status}): ${errorText}`);
      if (modelIndex + 1 < MODELS.length) {
        return generateGeminiContent(prompt, systemInstruction, modelIndex + 1, options);
      }
      throw new Error(`Gemini API Error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      if (modelIndex + 1 < MODELS.length) {
        return generateGeminiContent(prompt, systemInstruction, modelIndex + 1, options);
      }
      throw new Error("Aucune réponse générée par l'IA Gemini.");
    }

    return text;
  } catch (err: any) {
    if (modelIndex + 1 < MODELS.length) {
      return generateGeminiContent(prompt, systemInstruction, modelIndex + 1, options);
    }
    throw err;
  }
}
