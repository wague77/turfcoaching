
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

interface HorseOdds {
  numero: number;
  name: string;
  cote: number;
}

interface OddsSnapshot {
  timestamp: number;
  hour: string;
  horses: HorseOdds[];
}

interface RaceArrivee {
  positions: number[];
  timestamp: number;
}

interface AnalysisRequest {
  snapshots: OddsSnapshot[];
  arrivee?: RaceArrivee;
  date: string;
  reunion: number;
  course: number;
  stream?: boolean;
  customPrompt?: string;
  sessionToken?: string;
  aiPassword?: string;
  deviceId?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const LOVABLE_API_URL = "https://ai.gateway.lovable.dev";
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const { snapshots, arrivee, date, reunion, course, stream = false, customPrompt, sessionToken, aiPassword, deviceId }: AnalysisRequest = await req.json();

    // Verify AI access (session token or password)
    const accessResult = await verifyAIAccess(supabaseUrl, supabaseServiceKey, sessionToken || null, deviceId || null, aiPassword || null);
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

    if (!snapshots || snapshots.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Aucun relevé de cotes fourni' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build context about odds evolution
    const horsesData: Record<number, { name: string; oddsHistory: number[] }> = {};
    
    snapshots.forEach((snapshot) => {
      snapshot.horses.forEach((horse) => {
        if (!horsesData[horse.numero]) {
          horsesData[horse.numero] = {
            name: horse.name,
            oddsHistory: [],
          };
        }
        horsesData[horse.numero].oddsHistory.push(horse.cote);
      });
    });

    // Calculate variations
    const variations = Object.entries(horsesData).map(([numero, data]) => {
      const first = data.oddsHistory[0];
      const last = data.oddsHistory[data.oddsHistory.length - 1];
      const variation = last - first;
      const percentChange = ((last - first) / first * 100).toFixed(1);
      
      return {
        numero: parseInt(numero),
        name: data.name,
        firstOdds: first,
        lastOdds: last,
        variation,
        percentChange,
        oddsHistory: data.oddsHistory,
        trend: variation < 0 ? 'baisse' : variation > 0 ? 'hausse' : 'stable',
      };
    }).sort((a, b) => a.lastOdds - b.lastOdds);

    // Build the prompt
    const hours = snapshots.map(s => s.hour).join(', ');
    
    let prompt = customPrompt || `Tu es un expert en paris hippiques. Analyse l'évolution des cotes de la course R${reunion}C${course} du ${date}.

## Relevés horaires: ${hours}

## Évolution des cotes par cheval:
`;

    if (!customPrompt) {
      variations.slice(0, 15).forEach((v) => {
        prompt += `
- N°${v.numero} "${v.name}": ${v.oddsHistory.map(o => o.toFixed(1)).join(' → ')} (${v.trend}: ${v.variation > 0 ? '+' : ''}${v.variation.toFixed(1)} pts, ${v.percentChange}%)`;
      });

      if (arrivee) {
        prompt += `

## ARRIVÉE OFFICIELLE: ${arrivee.positions.slice(0, 5).join(' - ')}
`;
        
        // Add arrivee analysis
        arrivee.positions.slice(0, 3).forEach((num, idx) => {
          const horse = variations.find(v => v.numero === num);
          if (horse) {
            const position = idx === 0 ? '1er' : idx === 1 ? '2ème' : '3ème';
            prompt += `- ${position}: N°${num} "${horse.name}" - Cote initiale: ${horse.firstOdds.toFixed(1)}, finale: ${horse.lastOdds.toFixed(1)}
`;
          }
        });
      }

      prompt += `

## ANALYSE DEMANDÉE:

1. **Analyse des mouvements de cotes**: Identifie les chevaux avec les baisses significatives (argent entré) et les hausses (argent sorti). Explique ce que cela signifie.

2. **Détection des signaux**: 
   - Chevaux "joués en masse" (baisse continue)
   - Chevaux "abandonnés" (hausse continue)  
   - Faux favoris potentiels

3. **Pronostics par type de pari** (basés sur l'évolution des cotes):

   📊 **SIMPLE GAGNANT**: Le cheval le plus probable avec justification
   
   📊 **SIMPLE PLACÉ**: 2-3 chevaux à jouer placé avec confiance
   
   📊 **COUPLÉ GAGNANT**: Combinaison des 2 premiers
   
   📊 **COUPLÉ PLACÉ**: Combinaisons avec le meilleur rapport qualité/risque
   
   📊 **TRIO**: Combinaison des 3 premiers (désordre)
   
   📊 **TIERCÉ**: Combinaison ordonnée des 3 premiers
   
   📊 **QUARTÉ**: Combinaison des 4 premiers
   
   📊 **QUINTÉ**: Combinaison des 5 premiers avec ordre recommandé

4. **Stratégie de mise**: Recommandations sur la répartition des mises selon le niveau de confiance.
`;

      if (arrivee) {
        prompt += `
5. **Analyse post-course**: Compare tes prédictions avec l'arrivée réelle. Quels signaux étaient corrects? Quels signaux ont été trompeurs?
`;
      }
    }

    console.log('Sending prompt to OpenRouter, streaming:', stream);

    const response = await fetch(`${LOVABLE_API_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { 
            role: 'system', 
            content: `Tu es un expert en paris hippiques français spécialisé dans l'analyse des mouvements de cotes. Tu fournis des analyses détaillées et des pronostics argumentés basés sur l'évolution des cotes. Réponds toujours en français avec un format structuré et clair. Utilise des emojis pour rendre l'analyse plus lisible.` 
          },
          { role: 'user', content: prompt }
        ],
        max_tokens: 1500,
        temperature: 0.7,
        stream: stream,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Limite de requêtes atteinte. Réessayez dans quelques minutes.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Crédits insuffisants. Veuillez recharger votre compte.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI API error: ${response.status}`);
    }

    // If streaming, return the stream directly
    if (stream) {
      console.log('Returning stream response');
      return new Response(response.body, {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // Non-streaming response
    const data = await response.json();
    const analysis = data.choices?.[0]?.message?.content;

    if (!analysis) {
      throw new Error('No analysis content received from AI');
    }

    console.log('Analysis generated successfully');

    return new Response(
      JSON.stringify({ 
        analysis,
        variations: variations.slice(0, 10),
        meta: {
          snapshotCount: snapshots.length,
          hours,
          hasArrivee: !!arrivee,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in odds-ai-analysis:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erreur inconnue' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

