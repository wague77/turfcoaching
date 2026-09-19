import { NextResponse } from 'next/server';
import { generateGeminiContent } from '@/lib/gemini';

export async function POST(req: Request) {
  try {
    const { horses, discipline, raceInfo } = await req.json();

    const systemInstruction = `Tu es le Moteur d'IA Avancée WAGUE-TURF, spécialisé dans le calcul des probabilités de victoire, l'indice de confiance et la sélection des combinaisons gagnantes pour les courses PMU.
Tu fournis une analyse experte, rigoureuse, précise et avec des émojis.`;

    const prompt = `
Analyse la liste de chevaux suivante pour le module WAGUE-TURF :
Discipline : ${discipline || 'Trot / Galop'}
Informations Course : ${raceInfo || 'Course du jour'}
Données des chevaux : ${JSON.stringify(horses || []).slice(0, 3000)}

Fournis :
1. 🏆 **Top 3 Bases Solides** (les incontournables)
2. 💣 **Top 2 Tocards & Outsiders à belle cote**
3. 🎯 **Ticket Sélection WAGUE-TURF** (Ordre & Désordre conseillés)
4. 📈 **Indice de Confiance Global de la Course (%)**
`;

    const text = await generateGeminiContent(prompt, systemInstruction);

    return NextResponse.json({ text, response: text });
  } catch (error: any) {
    console.error('Wague Turf AI Route Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Erreur lors du calcul WAGUE-TURF par l\'IA Gemini.' },
      { status: 500 }
    );
  }
}
