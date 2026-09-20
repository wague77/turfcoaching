
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { horses, discipline, raceInfo } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const LOVABLE_API_URL = "https://ai.gateway.lovable.dev";
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Build horse data summary for the prompt
    const horseSummary = (horses || []).map((h: any) => 
      `N°${h.numero} ${h.name} | Cote: ${h.cote?.toFixed(1)} | Note: ${h.note?.toFixed(1)} | Cat: ${h.category} | Driver: ${h.driver || '?'} | Musique: ${h.musique || '-'} | Victoires: ${h.numberOfWins}/${h.numberOfRaces} courses | Gains: ${((h.gainsCareer || 0) / 100).toFixed(0)}€ | Value ratio: ${h.valueRatio?.toFixed(2)} | Faux favori: ${h.isFauxFavori ? 'OUI' : 'non'} | Value bet: ${h.valueBet ? 'OUI' : 'non'}`
    ).join('\n');

    const systemPrompt = `Tu es WAGUE-TURF, un expert turf PMU légendaire avec 60 ans d'expérience. Tu analyses les courses avec une précision chirurgicale.

RÈGLES ABSOLUES:
- Réponds TOUJOURS en français
- Sois direct, précis et stratégique
- Utilise des emojis pour structurer (🏆🎯⚠️💰🔴✅)
- Donne des NUMÉROS de chevaux concrets
- Justifie chaque choix avec des données

MÉTHODOLOGIE D'ANALYSE:
1. Identifier les FAUX FAVORIS (cote basse mais note faible = DOUTEUX)
2. Repérer les drivers TOP 5 (Bonne, Abrivard, Bazire, Nivard, Gelormini...)
3. Analyser la forme récente (musique) et les gains
4. Détecter les VALUE BETS (proba estimée > proba implicite de la cote)
5. Évaluer la stratégie globale selon la difficulté de course

FORMAT DE RÉPONSE OBLIGATOIRE:

🏆 **TIERCÉ SUGGÉRÉ**
[Top 3 chevaux avec justification courte]

🎯 **QUINTÉ+ SUGGÉRÉ** 
[2 bases solides + 3 outsiders value, avec justification]

⭐ **TOP 4 OUTSIDERS** (cotes 8-15, potentiel élevé)
[4 chevaux avec analyse]

💣 **TOP 4 TOCARDS** (cotes >15, potentiel surprise)
[4 chevaux avec analyse forme récente]

👥 **5 MEILLEURS COUPLÉS**
[Avec niveau de difficulté: facile/moyen/difficile]

💰 **VALUE BETS**
[Chevaux dont la cote est supérieure à leur vraie probabilité]

⚠️ **FAUX FAVORIS - ATTENTION**
[Chevaux à éviter malgré leur cote basse, expliquer pourquoi]

📊 **VERDICT & STRATÉGIE DE JEU**
- Niveau de confiance de la course
- Le favori est-il JOUABLE ou DOUTEUX ?
- Stratégie recommandée (jouer serré / jouer large / passer)
- Budget conseillé et répartition des mises`;

    const userPrompt = `Analyse cette course et génère tes pronostics expert:

${raceInfo ? `📋 INFOS COURSE: ${raceInfo}` : ''}
${discipline ? `🏇 Discipline: ${discipline}` : ''}

📊 DONNÉES DES PARTANTS (triés par note WAGUE-TURF):
${horseSummary}

Génère ton analyse complète avec pronostics détaillés.`;

    const response = await fetch(`${LOVABLE_API_URL}/v1/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemini-3.8-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requêtes atteinte, réessayez dans quelques instants." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Crédits IA épuisés. Rechargez votre espace de travail." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erreur du service IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("wague-turf-ai error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erreur inconnue" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

