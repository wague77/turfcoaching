import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { generateLocalWagueTurfAnalysis } from '@/lib/wague-turf-logic';

const MODELS_TO_TRY = ["gemini-3.8-flash", "gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];

export async function POST(req: Request) {
  let horses: any[] = [];
  let discipline = '';
  let raceInfo = '';

  try {
    const body = await req.json();
    horses = body.horses || [];
    discipline = body.discipline || '';
    raceInfo = body.raceInfo || '';

    const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    const systemInstruction = `Tu es l'Algorithme Expert & Moteur d'IA Avancée WAGUE-TURF v8.0, leader dans le calcul probabiliste des courses hippiques PMU (Trot, Galop, Haies, Steeple-chase).
Tu analyses avec une précision chirurgicale les données des chevaux : Musique récente, cote probabilité, ferrage (D4/DP/DA), jockey/driver, régularité et forme du moment.
Ta mission est d'optimiser les chances de gains des parieurs en fournissant des choix stratégiques à fort rendement (Value Bets & Bases en béton).

Règles de présentation :
- Réponds en Français fluide, professionnel, dynamique avec une structure claire et des émojis pertinents.
- Structure ta réponse en 5 sections distinctes très lisibles.`;

    const prompt = `
Analyse experte approfondie de la course pour le module WAGUE-TURF :
📌 **Discipline** : ${discipline || 'Trot / Galop / Obstacle'}
🏇 **Informations Course** : ${raceInfo || 'Course du jour'}
📊 **Données des partants (${horses?.length || 0} chevaux)** :
${JSON.stringify(horses || [], null, 2).slice(0, 4000)}

Génère une analyse experte complète avec les 5 sections suivantes :

### 🏆 1. BASES SOLIDES (Top 3 Indispensables)
- Identifie les 3 chevaux les plus sûrs de la course (Bases béton).
- Donne une explication technique concise pour chaque cheval (musique, driver, adéquation parcours).

### ⚡ 2. SECOND LEVEL & CHALLENGERS
- Les 2 ou 3 chevaux d'appui capables de pimenter les arrivées dans le Tiercé/Quarté/Quinté+.

### 💣 3. TOCARDS & OUTSIDERS À FORTE VALEUR (Value Bets)
- Les 2 tocards/outsiders dangereux qui peuvent faire exploser les rapports du PMU.

### 🎯 4. TICKETS SÉLECTION OPTIMISÉS WAGUE-TURF
- **Quinté+ Sélection en 8 chevaux** (ordre préférentiel)
- **Ticket Réduit / Champ Réduit** (Bases + Associés)
- **Couplé Gagnant / Placé conseillé**

### 📈 5. STRATÉGIE DE JEU & INDICE DE CONFIANCE
- **Indice de Confiance Global** (ex: 85%)
- **Conseils de gestion des mises** (Jeux simples, combinés ou couverture).
`;

    let text = '';
    if (apiKey) {
      const genAI = new GoogleGenerativeAI(apiKey);
      for (const modelName of MODELS_TO_TRY) {
        try {
          const model = genAI.getGenerativeModel({
            model: modelName,
            systemInstruction,
          });
          const result = await model.generateContent(prompt);
          text = result.response.text();
          if (text) break;
        } catch (mErr: any) {
          console.warn(`Model ${modelName} call failed, trying next:`, mErr?.message || mErr);
        }
      }
    }

    if (!text) {
      text = generateLocalWagueTurfAnalysis(horses, discipline, raceInfo);
    }

    return NextResponse.json({ text, response: text, success: true });
  } catch (e: any) {
    console.error("Gemini Error (using algorithmic fallback):", e.message || e);
    const fallbackText = generateLocalWagueTurfAnalysis(horses, discipline, raceInfo);
    return NextResponse.json({ text: fallbackText, response: fallbackText, success: true });
  }
}
