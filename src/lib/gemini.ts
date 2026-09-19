import { GEMINI_API_KEY } from './env';

const MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];

export async function generateGeminiContent(
  prompt: string,
  systemInstruction?: string,
  modelIndex: number = 0
): Promise<string> {
  const model = MODELS[modelIndex] || MODELS[0];
  const apiKey = GEMINI_API_KEY;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const body: any = {
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 2048,
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
      // Fallback to next model if available
      if (modelIndex + 1 < MODELS.length) {
        return generateGeminiContent(prompt, systemInstruction, modelIndex + 1);
      }
      throw new Error(`Gemini API Error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error("Aucune réponse générée par l'IA Gemini.");
    }

    return text;
  } catch (err: any) {
    if (modelIndex + 1 < MODELS.length) {
      return generateGeminiContent(prompt, systemInstruction, modelIndex + 1);
    }
    throw err;
  }
}
