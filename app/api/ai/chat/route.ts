import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const MODELS_TO_TRY = ["gemini-3.8-flash", "gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];

export async function POST(req: Request) {
  let lastUserMsg = 'Analyse PMU';
  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    const { messages, raceContext, discipline } = await req.json();
    if (Array.isArray(messages) && messages.length > 0) {
      lastUserMsg = messages[messages.length - 1]?.content || 'Analyse PMU';
    }

    const systemInstruction = `Tu es l'Expert Hippique d'Élite & Consultant IA N°1 spécialisé dans les Paris Hippiques, le PMU, le Quinté+ et le Turf Coaching System (v8.0).
Tu réponds en Français parfait de manière fluide, claire, motivante, structurée et vivante avec des émojis adaptés.
Tu maîtrises parfaitement :
- La lecture et le décodage de la musique des chevaux (ex: 1p 3p (23) 2a Dm 4p).
- L'impact du ferrage (Déferré des 4 - D4, Déferré des antérieurs - DA, Déferré des postérieurs - DP).
- Les tactiques des jockeys / drivers et le profil des entraineurs.
- L'analyse des cotes, des chutes de cotes, et la gestion du bankroll / gestion des mises (Kelly criterion, flat betting).
- La configuration des pistes (Terrain lourd, bon, très souple, autostart vs volt).

Discipline actuelle : ${discipline || 'Toutes disciplines (Trot, Galop, Obstacle)'}.
Contexte de la course actuelle : ${raceContext || 'Non renseigné'}.

Sois toujours précis, donne des conseils concrets et évite les réponses vagues !`;

    const formattedConversation = (messages || [])
      .map((m: { role: string; content: string }) => `${m.role === 'user' ? 'Parieur / Utilisateur' : 'Expert Turf IA'}: ${m.content}`)
      .join('\n\n');

    const prompt = `Voici l'historique complet de la discussion :\n${formattedConversation}\n\nRéponds au dernier message de l'utilisateur avec la plus haute expertise technique et hippique.`;

    let responseText = '';
    if (apiKey) {
      const genAI = new GoogleGenerativeAI(apiKey);
      for (const modelName of MODELS_TO_TRY) {
        try {
          const model = genAI.getGenerativeModel({
            model: modelName,
            systemInstruction,
          });
          const result = await model.generateContent(prompt);
          responseText = result.response.text();
          if (responseText) break;
        } catch (mErr: any) {
          console.warn(`Chat model ${modelName} call failed, trying next:`, mErr?.message || mErr);
        }
      }
    }

    if (!responseText) {
      responseText = `💡 **Conseil Expert Turf Coaching** :

Pour réussir vos paris hippiques sur la question "${lastUserMsg.slice(0, 100)}" :
1. **Bases Solides** : Privilégiez les chevaux affichant des victoires récentes (musique avec des 1p, 1a, 2p) et drivés par des jockeys du top 5.
2. **Gestion des Cotes** : Surveillez les chevaux dont la cote chute brutalement 15 à 30 minutes avant le départ ("Smart Money").
3. **Optimisation** : Combinez 2 bases en jeu simple ou couplé avec 3 outsiders à fort potentiel en Champ Réduit.

*Importez les partants de votre course pour obtenir une analyse ciblée cheval par cheval.*`;
    }

    return NextResponse.json({ reply: responseText, content: responseText, success: true });
  } catch (e: any) {
    console.error("Gemini Error:", e.message || e);
    const fallbackReply = `💡 **Conseil Expert Turf Coaching** :

Pour réussir vos paris hippiques sur la question "${lastUserMsg.slice(0, 100)}" :
1. **Bases Solides** : Privilégiez les chevaux affichant des victoires récentes (musique avec des 1p, 1a, 2p) et drivés par des jockeys du top 5.
2. **Gestion des Cotes** : Surveillez les chevaux dont la cote chute brutalement 15 à 30 minutes avant le départ ("Smart Money").
3. **Optimisation** : Combinez 2 bases en jeu simple ou couplé avec 3 outsiders à fort potentiel en Champ Réduit.`;
    return NextResponse.json({ reply: fallbackReply, content: fallbackReply, success: true });
  }
}
