import { NextResponse } from 'next/server';
import { generateGeminiContent } from '@/lib/gemini';

export async function POST(req: Request) {
  try {
    const { messages, raceContext, discipline } = await req.json();

    const systemInstruction = `Tu es l'Expert Hippique d'Élite & Consultant IA N°1 spécialisé dans les Paris Hippiques, le PMU, le Quinté+ et le Turf Coaching System (v8.0).
Tu réponds en Français parfait de manière fluide, claire, motivante, structurée et vivante avec des émojis adaptés.
Tu maîtrises parfaitement :
- La lecture et le décodage de la musique des chevaux (ex: 1p 3p (23) 2a Dm 4p).
- L'impact de la ferrage (Déferré des 4 - D4, Déferré des antérieurs - DA, Déferré des postérieurs - DP).
- Les tactiques des jockeys / drivers et le profil des entraineurs.
- L'analyse des cotes, des chutes de cotes, et la gestion du bankroll / gestion des mises (Kelly criterion, flat betting).
- La configuration des pistes (Terrain lourd, bon, très souple, autostart vs volt).

Discipline actuelle : ${discipline || 'Toutes disciplines (Trot, Galop, Obstacle)'}.
Contexte de la course actuelle : ${raceContext || 'Non renseigné'}.

Sois toujours précis, donne des conseils concrets et évite les réponses vagues !`;

    const formattedConversation = messages
      .map((m: { role: string; content: string }) => `${m.role === 'user' ? 'Parieur / Utilisateur' : 'Expert Turf IA'}: ${m.content}`)
      .join('\n\n');

    const prompt = `Voici l'historique complet de la discussion :\n${formattedConversation}\n\nRéponds au dernier message de l'utilisateur avec la plus haute expertise technique et hippique.`;

    const text = await generateGeminiContent(prompt, systemInstruction, 0, {
      temperature: 0.7,
      maxTokens: 3000,
    });

    return NextResponse.json({ reply: text, content: text });
  } catch (error: any) {
    console.error('Gemini Chat Route Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Erreur lors de la génération de la réponse IA.' },
      { status: 500 }
    );
  }
}

