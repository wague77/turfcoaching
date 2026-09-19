import { NextResponse } from 'next/server';
import { generateGeminiContent } from '@/lib/gemini';

export async function POST(req: Request) {
  try {
    const { snapshots, arrivee, date, reunion, course, customPrompt } = await req.json();

    const systemInstruction = `Tu es un Algorithme Expert d'Analyse Prédictive des Cotes Hippiques pour Turf Coaching System (v8.0).
Tu analyses l'évolution des cotes, les baisses soudaines (smart money), les favoris solides et les tocards dangereux.
Réponds avec un rapport synthétique, structuré, clair et illustré d'emojis.`;

    const prompt = customPrompt || `
Analyse les données d'évolution des cotes ci-dessous :
Date: ${date || 'Aujourd\'hui'} | Réunion: ${reunion || 'R1'} | Course: ${course || 'C1'}
Arrivée constatée / cible : ${JSON.stringify(arrivee || {})}
Instantanés des cotes : ${JSON.stringify(snapshots || []).slice(0, 3000)}

Fais un rapport détaillé :
1. **Synthèse des Variations de Cotes** (chutes de cotes et argent intelligent)
2. **Favoris & Bases Solides**
3. **Outsiders & Tocards à surveiller**
4. **Pronostic & Conseils de Jeux**
`;

    const text = await generateGeminiContent(prompt, systemInstruction);

    return NextResponse.json({ text, result: text, analysis: text });
  } catch (error: any) {
    console.error('Gemini Odds Analysis Route Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Erreur lors de l\'analyse des cotes par l\'IA Gemini.' },
      { status: 500 }
    );
  }
}
