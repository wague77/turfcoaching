
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const FUNCTIONS = [
  { name: "generate-betting-tips", label: "Conseils de paris" },
  { name: "odds-ai-analysis", label: "Analyse des cotes" },
  { name: "racing-expert-chat", label: "Maître du Turf (chat)" },
  { name: "wague-turf-ai", label: "WAGUE-TURF IA" },
  { name: "ai-analysis", label: "Analyse IA générale" },
];

const MODEL = "gemini-2.5-flash";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  const apiUrl = "https://ai.gateway.lovable.dev";

  if (!apiKey) {
    return new Response(
      JSON.stringify({ success: false, error: "LOVABLE_API_KEY manquant" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Ping BluesMinds once per function to measure latency/status
  const results = await Promise.all(
    FUNCTIONS.map(async (fn) => {
      const start = Date.now();
      try {
        const ctrl = new AbortController();
        const timeout = setTimeout(() => ctrl.abort(), 20000);
        const resp = await fetch(`${apiUrl}/v1/chat/completions`, {
          method: "POST",
          signal: ctrl.signal,
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: MODEL,
            messages: [
              { role: "user", content: `ping from ${fn.name} — réponds OK` },
            ],
            max_tokens: 10,
          }),
        });
        clearTimeout(timeout);
        const latency = Date.now() - start;
        const text = await resp.text();
        let parsed: any = null;
        try { parsed = JSON.parse(text); } catch (_) {}
        const reply = parsed?.choices?.[0]?.message?.content ?? null;

        if (!resp.ok) {
          return {
            name: fn.name,
            label: fn.label,
            status: "error" as const,
            httpStatus: resp.status,
            latency,
            error: parsed?.error?.message ?? text.slice(0, 200),
          };
        }
        return {
          name: fn.name,
          label: fn.label,
          status: "ok" as const,
          httpStatus: resp.status,
          latency,
          model: parsed?.model ?? MODEL,
          reply: (reply ?? "").toString().slice(0, 120),
        };
      } catch (err: any) {
        return {
          name: fn.name,
          label: fn.label,
          status: "error" as const,
          latency: Date.now() - start,
          error: err?.message ?? "Erreur réseau",
        };
      }
    })
  );

  const allOk = results.every((r) => r.status === "ok");
  return new Response(
    JSON.stringify({
      success: allOk,
      model: MODEL,
      checkedAt: new Date().toISOString(),
      results,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});

