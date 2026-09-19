import { NextResponse } from 'next/server';
import { generateGeminiContent } from '@/lib/gemini';

export async function POST(req: Request) {
  try {
    const { messages, raceContext, discipline } = await req.json();

    const systemInstruction = `Tu es un Expert Hippique d'Elite et Assistant virtuel IA spécialisé dans les Paris Hippiques, le PMU, le Quinté+ et le Turf Coaching System.
Tu réponds en français de manière claire, motivante, experte et structurée avec des emojis.
Tu analyses la musique des chevaux, les cotes, le terrain, et les tactiques d'entraînement.
Discipline actuelle : ${discipline || 'Toutes disciplines'}.
Contexte de la course : ${raceContext || 'Non renseigné'}.`;

    const formattedConversation = messages
      .map((m: { role: string; content: string }) => `${m.role === 'user' ? 'Utilisateur' : 'Expert Turf'}: ${m.content}`)
      .join('\n\n');

    const prompt = `Voici l'historique de la discussion :\n${formattedConversation}\n\nRéponds au dernier message de l'utilisateur de manière précise et pertinente.`;

    const text = await generateGeminiContent(prompt, systemInstruction);

    return NextResponse.json({ reply: text, content: text });
  } catch (error: any) {
    console.error('Gemini Chat Route Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Erreur lors de la génération de la réponse IA.' },
      { status: 500 }
    );
  }
}
