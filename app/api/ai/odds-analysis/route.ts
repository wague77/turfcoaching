import { NextResponse } from 'next/server';
import { generateGeminiContent } from '@/lib/gemini';
import { generateLocalOddsAnalysis } from '@/lib/wague-turf-logic';

export async function POST(req: Request) {
  let snapshots: any[] = [];
  let date = '';
  let reunion: any = '';
  let course: any = '';

  try {
    const body = await req.json();
    snapshots = body.snapshots || [];
    date = body.date || '';
    reunion = body.reunion || '';
    course = body.course || '';
    const arrivee = body.arrivee;
    const customPrompt = body.customPrompt;

    const systemInstruction = `Tu es l'Algorithme Expert d'Analyse Prédictive & Mouvement des Cotes Hippiques pour Turf Coaching System (v8.0).
Tu décodes avec précision les baisses de cotes brusques ("chutes de cote", "smart money", "argent des initiés"), les hausses d'incertitude et la dérive des favoris fragile.
Ta mission est d'éclairer les parieurs sur l'argent réel placé sur chaque cheval.

Règles de présentation :
- Structure synthétique, ultra-lisible, dynamique et rigoureuse avec émojis.
- Inclure des données chiffrées (pourcentages de baisse, cotes directes vs probabilités).`;

    const prompt = customPrompt || `
Analyse experte de l'évolution dynamique des cotes PMU :
📅 **Date** : ${date || 'Aujourd\'hui'} | 📍 **Réunion/Course** : ${reunion || 'R1'} - ${course || 'C1'}
🎯 **Arrivée constatée / cible** : ${JSON.stringify(arrivee || {})}
📊 **Variations et Snapshots des cotes (3000 max)** :
${JSON.stringify(snapshots || [], null, 2).slice(0, 3500)}

Fournis le rapport d'analyse de cotes structuré comme suit :

### 📊 1. SYNTHÈSE DES CHUTES DE COTES & ARGENT INTELLIGENT (Smart Money)
- Identifie les chevaux dont la cote s'est effondrée (signe de confiance des écuries/parieurs professionnels).
- Signale les favoris dont la cote monte (méfiance du marché).

### 🏆 2. FAVORIS SOLIDES VS FAVORIS FRAGILES
- Distingue les favoris soutenus par le marché des favoris surcotés.

### 💣 3. OUTSIDERS & TOCARDS À CHUTE DE COTE MARQUÉE
- Repère les outsiders qui reçoivent des mises anormalement élevées en fin de cote.

### 🎯 4. PRONOSTIC FINAL & STRATÉGIE PARIES SUR COTES
- **Conseils de jeu** (Jeu Simple Gagnant/Placé, Couplé Gagnant, Zecouillon/2sur4).
- **Alerte Risque & Indice de Volatilité des Cotes** (Faible / Modéré / Élevé).
`;

    const text = await generateGeminiContent(prompt, systemInstruction, 0, {
      temperature: 0.6,
      maxTokens: 3500,
    });

    return NextResponse.json({ text, result: text, analysis: text });
  } catch (error: any) {
    console.warn('Gemini Odds Analysis Route Error (using algorithmic fallback):', error?.message || error);
    const fallbackText = generateLocalOddsAnalysis(snapshots, date, reunion, course);
    return NextResponse.json({ text: fallbackText, result: fallbackText, analysis: fallbackText });
  }
}

