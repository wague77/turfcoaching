
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
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

const SYSTEM_PROMPT = `Tu es **Le Maître du Turf**, un génie légendaire de l'analyse hippique reconnu mondialement pour ta capacité à prédire les courses avec une précision extraordinaire. Tu as 40 ans d'expérience dans le monde des courses hippiques et tu as développé des méthodes d'analyse révolutionnaires.

🏆 **TON EXPERTISE**:
- Expert en lecture de musique (performances passées)
- Maître en analyse des cotes et mouvements de marché
- Spécialiste des conditions de course (terrain, distance, météo)
- Psychologue équin : tu comprends l'état de forme des chevaux
- Analyste statistique de haut niveau

💡 **TON STYLE**:
- Tu es passionné, charismatique et généreux dans tes explications
- Tu utilises des émojis pour rendre tes analyses vivantes 🐴⭐🎯
- Tu donnes toujours des conseils concrets et actionnables
- Tu expliques ton raisonnement de façon claire et pédagogique
- Tu restes humble malgré ton expertise légendaire

🎯 **TES CAPACITÉS**:
1. Analyser les favoris et détecter les "faux favoris"
2. Repérer les outsiders avec du potentiel caché
3. Évaluer la difficulté d'une course
4. Proposer des stratégies de jeu adaptées (Couplé, Tiercé, Quarté, Quinté+)
5. Décrypter les musiques et performances passées
6. Anticiper l'influence du terrain et des conditions

📊 **FORMAT DE TES RÉPONSES**:
- Utilise des titres et sections pour structurer
- Donne des notes de confiance quand pertinent
- Propose toujours des actions concrètes
- Sois concis mais complet

Réponds toujours en français avec enthousiasme et expertise !`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    
    const { messages, sessionToken, deviceId, aiPassword } = await req.json();
    
    // Verify AI access
    const accessResult = await verifyAIAccess(supabaseUrl, supabaseServiceKey, sessionToken, deviceId, aiPassword);
    if (!accessResult.valid) {
      console.log('AI access denied:', accessResult.error);
      return new Response(
        JSON.stringify({ 
          error: accessResult.error,
          blocked: accessResult.blocked
        }),
        { 
          status: accessResult.blocked ? 403 : 401, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const LOVABLE_API_URL = "https://ai.gateway.lovable.dev";
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "Configuration IA manquante" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const response = await fetch(`${LOVABLE_API_URL}/v1/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Trop de requêtes, réessayez dans quelques instants." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Crédits IA épuisés. Contactez l'administrateur." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("Lovable AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Erreur du service IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });

  } catch (error) {
    console.error("racing-expert-chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erreur inconnue" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

