
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
  aiPassword?: string | null // Deprecated - for backward compatibility only
): Promise<{ valid: boolean; blocked?: boolean; error?: string }> {
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  
  // First, try to validate via session token (preferred method)
  if (sessionToken && deviceId) {
    const { data: sessionData, error: sessionError } = await supabase
      .from("ai_sessions")
      .select("is_blocked, blocked_reason, session_token, session_expiry")
      .eq("device_id", deviceId)
      .maybeSingle();

    if (!sessionError && sessionData) {
      // Check if device is blocked
      if (sessionData.is_blocked) {
        console.log("Device is blocked from AI access:", deviceId);
        return { 
          valid: false, 
          blocked: true, 
          error: sessionData.blocked_reason || "Votre accès IA a été bloqué." 
        };
      }
      
      // Validate session token
      if (sessionData.session_token === sessionToken) {
        // Check if session is not expired
        if (sessionData.session_expiry && new Date(sessionData.session_expiry) > new Date()) {
          // Update last_used_at
          await supabase
            .from("ai_sessions")
            .update({ last_used_at: new Date().toISOString() })
            .eq("device_id", deviceId);
          return { valid: true };
        } else {
          return { valid: false, error: 'Session expirée' };
        }
      }
    }
  }
  
  // Fallback: Check if device is blocked (for password auth)
  if (deviceId) {
    const { data: sessionData, error: sessionError } = await supabase
      .from("ai_sessions")
      .select("is_blocked, blocked_reason")
      .eq("device_id", deviceId)
      .maybeSingle();

    if (!sessionError && sessionData?.is_blocked) {
      console.log("Device is blocked from AI access:", deviceId);
      return { 
        valid: false, 
        blocked: true, 
        error: sessionData.blocked_reason || "Votre accès IA a été bloqué." 
      };
    }
  }
  
  // Backward compatibility: validate password if provided
  if (aiPassword) {
    const { data, error } = await supabase
      .from("ai_settings")
      .select("password")
      .maybeSingle();
    
    if (error || !data) {
      console.error("Error fetching AI settings:", error);
      return { valid: false, error: 'Erreur de configuration' };
    }
    
    if (aiPassword === data.password) {
      return { valid: true };
    }
    return { valid: false, error: 'Mot de passe incorrect' };
  }
  
  return { valid: false, error: 'Session invalide' };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    const body = await req.json();
    const { horses, favorites, difficulty, difficultyScore, discipline, sessionToken, deviceId, aiPassword } = body;
    
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
    
    // Verify AI access (session token or password)
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

    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    const apiUrl = "https://ai.gateway.lovable.dev";
    if (!apiKey) {
      console.error('LOVABLE_API_KEY is not configured');
      throw new Error('API key not configured');
    }

    // Build a structured prompt for race analysis
    const systemPrompt = `Tu es un expert en courses hippiques français. Tu analyses les données des courses et fournis des conseils stratégiques.
    
Tu dois:
1. Analyser la fiabilité des favoris
2. Identifier les outsiders potentiels
3. Donner des conseils de jeu adaptés à la difficulté de la course
4. Proposer des combinaisons gagnantes

Réponds de manière concise et structurée en français.`;

    const horsesData = horses.slice(0, 10).map((h: any) => ({
      numero: h.numero,
      cote: h.cote,
      scoreTotal: h.scoreTotal,
      label: h.label,
      verdict: h.verdict || 'N/A'
    }));

    const favoritesData = favorites?.map((f: any) => ({
      numero: f.numero,
      cote: f.cote,
      verdict: f.verdict,
      scoreCote: f.scoreCote,
      scoreMusique: f.scoreMusique
    })) || [];

    const userPrompt = `Analyse cette course de ${discipline || 'plat'}:

**Difficulté**: ${difficulty} (score: ${difficultyScore}/10)

**Top 10 chevaux par score total**:
${JSON.stringify(horsesData, null, 2)}

**Analyse des 3 favoris**:
${JSON.stringify(favoritesData, null, 2)}

Donne-moi:
1. Une analyse rapide de la course (2-3 lignes)
2. Ta stratégie recommandée
3. Tes 3 meilleurs chevaux (bases)
4. Un outsider à surveiller
5. Une suggestion de jeu (Tiercé/Quarté/Quinté+)`;

    console.log('Calling OpenRouter API...');
    
    const response = await fetch(`${apiUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 1000,
        temperature: 0.7,
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
      console.error('OpenRouter API error:', response.status, errorText);
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('OpenRouter response received');
    
    const analysis = data.choices?.[0]?.message?.content || 'Analyse non disponible';

    return new Response(JSON.stringify({ 
      success: true,
      analysis,
      model: 'google/gemini-3-flash-preview'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-analysis function:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      analysis: null
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

