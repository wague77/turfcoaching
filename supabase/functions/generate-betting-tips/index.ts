
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Verify AI access via session token or device ID
async function verifyAIAccess(
  supabaseUrl: string,
  serviceRoleKey: string,
  sessionToken: string | null,
  deviceId: string | null,
  aiPassword?: string | null
): Promise<{ valid: boolean; blocked?: boolean; error?: string }> {
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  
  // First, try to validate via session token
  if (sessionToken && deviceId) {
    const { data: sessionData, error: sessionError } = await supabase
      .from("ai_sessions")
      .select("is_blocked, blocked_reason, session_token, session_expiry")
      .eq("device_id", deviceId)
      .maybeSingle();

    if (!sessionError && sessionData) {
      if (sessionData.is_blocked) {
        return { valid: false, blocked: true, error: sessionData.blocked_reason || "Accès bloqué." };
      }
      if (sessionData.session_token === sessionToken) {
        if (sessionData.session_expiry && new Date(sessionData.session_expiry) > new Date()) {
          await supabase.from("ai_sessions").update({ last_used_at: new Date().toISOString() }).eq("device_id", deviceId);
          return { valid: true };
        }
        return { valid: false, error: 'Session expirée' };
      }
    }
  }
  
  // Fallback: device blocking check
  if (deviceId) {
    const { data: sessionData } = await supabase.from("ai_sessions").select("is_blocked, blocked_reason").eq("device_id", deviceId).maybeSingle();
    if (sessionData?.is_blocked) {
      return { valid: false, blocked: true, error: sessionData.blocked_reason || "Accès bloqué." };
    }
  }
  
  // Backward compatibility: password validation
  if (aiPassword) {
    const { data } = await supabase.from("ai_settings").select("password").maybeSingle();
    if (data && aiPassword === data.password) return { valid: true };
    return { valid: false, error: 'Mot de passe incorrect' };
  }
  
  return { valid: false, error: 'Session invalide' };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    const body = await req.json();
    const { horses, analysisResult, sessionToken, deviceId, aiPassword } = body;
    
    // Input validation
    if (!horses || !Array.isArray(horses) || horses.length === 0) {
      console.error('Invalid horses data: not an array or empty');
      return new Response(
        JSON.stringify({ success: false, error: 'Données des chevaux invalides' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (horses.length > 30) {
      console.error('Too many horses:', horses.length);
      return new Response(
        JSON.stringify({ success: false, error: 'Trop de chevaux (max 30)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Verify AI access
    const accessResult = await verifyAIAccess(supabaseUrl, supabaseServiceKey, sessionToken, deviceId, aiPassword);
    if (!accessResult.valid) {
      console.log('AI access denied:', accessResult.error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          blocked: accessResult.blocked,
          error: accessResult.error 
        }),
        { status: accessResult.blocked ? 403 : 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const LOVABLE_API_URL = "https://ai.gateway.lovable.dev";
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Prepare horse data summary for AI
    const horseSummary = horses?.map((h: any) => ({
      numero: h.numero,
      name: h.name || h.nom,
      rapportDirect: h.lastDirectRatio || h.rapportDirect || h.cote,
      musique: h.musique,
      driver: h.driver || h.jockey,
      entraineur: h.entraineur || h.trainer,
      gainsCareer: h.gainsCareer,
      gainsAnnee: h.gainsAnnee,
      numberOfWins: h.numberOfWins,
      numberOfRaces: h.numberOfRaces,
      age: h.age,
      sexe: h.sexe,
      deferre: h.deferre,
      handicapDistance: h.handicapDistance,
    })) || [];

    const systemPrompt = `Tu es un EXPERT TURFISTE français légendaire avec 40 ans d'expérience dans l'analyse des courses hippiques.
Tu es reconnu pour:
- Ton œil affûté pour détecter les "coups" cachés
- Ta connaissance encyclopédique des écuries et drivers
- Ton approche mathématique et intuitive combinée
- Tes pronostics régulièrement gagnants

Tu dois analyser les données comme si tu lisais la presse hippique professionnelle (Paris-Turf, Tiercé Magazine, Week-End, etc.) et donner ton AVIS PERSONNEL et TRANCHÉ.

STYLE DE RÉPONSE:
- Parle en tant qu'expert passionné
- Donne ton opinion franche (pas de langue de bois)
- Utilise le jargon turfiste approprié
- Sois percutant et mémorable
- Justifie tes choix avec des arguments techniques

FORMAT OBLIGATOIRE:

🏆 BASE SOLIDE (1-2 chevaux incontournables)
Explique POURQUOI ce sont tes bases avec arguments techniques

⚡ OUTSIDERS DANGEREUX (2-3 chevaux à surveiller)
Ces "coups" potentiels avec explication de leur potentiel caché

🎯 SYSTÈME DE JEU RECOMMANDÉ
- 2sur4: [combinaison]
- Tiercé: [combinaison avec ordre suggéré]
- Quarté: [combinaison élargie]
- Mon CHEVAL DU JOUR: [numéro + nom]

📊 ANALYSE TECHNIQUE
- Type de course et niveau
- Facteurs à surveiller (terrain, météo, déferrage, distance)
- Tendances statistiques remarquées

💡 SYNTHÈSE EXPRESS (3-4 phrases coup de poing)
Ta vision globale de la course en style journaliste hippique`;

    const userPrompt = `ANALYSE CETTE COURSE COMME UN PRO DE LA PRESSE HIPPIQUE:

📋 PARTANTS (${horseSummary.length} chevaux):
${horseSummary.map((h: any) => 
  `N°${h.numero} - ${h.name?.toUpperCase() || 'INCONNU'}
   └ Cote: ${h.rapportDirect || '?'} | Musique: ${h.musique || 'N/A'}
   └ Driver: ${h.driver || '?'} | Entraîneur: ${h.entraineur || '?'}
   └ Gains carrière: ${h.gainsCareer || '?'}€ | Victoires: ${h.numberOfWins || '?'}/${h.numberOfRaces || '?'}
   └ Age: ${h.age || '?'} ans | Sexe: ${h.sexe || '?'} | Déferré: ${h.deferre || 'N/A'}`
).join('\n\n')}

${analysisResult ? `
📈 PRÉ-ANALYSE ALGORITHMIQUE:
• Top 8 par COTE: ${analysisResult.top8ByCote?.map((h: any) => `${h.numero}-${h.nom}`).join(', ') || 'N/A'}
• Top 8 par MUSIQUE: ${analysisResult.top8ByMusic?.map((h: any) => `${h.numero}-${h.nom}`).join(', ') || 'N/A'}  
• Top 8 AJUSTÉ: ${analysisResult.top8Adjusted?.map((h: any) => `${h.numero}-${h.nom}`).join(', ') || 'N/A'}
• Difficulté estimée: ${analysisResult.difficulty || 'N/A'}
• Couples générés: ${analysisResult.couples?.slice(0, 5).map((c: any) => Array.isArray(c) ? c.join('-') : String(c)).join(' | ') || 'N/A'}` : ''}

DONNE-MOI TON ANALYSE COMPLÈTE ET TRANCHÉE, COMME DANS PARIS-TURF!`;

    console.log("Sending request to OpenRouter with", horseSummary.length, "horses");

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
        max_tokens: 1200,
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: "Limite de requêtes atteinte, réessayez plus tard." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("OpenRouter error:", response.status, errorText);
      throw new Error("Erreur du service IA");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "Analyse non disponible";
    
    console.log("AI analysis generated successfully");

    return new Response(
      JSON.stringify({ success: true, analysis: content }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating tips:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Erreur inconnue" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

