
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Generate a secure session token
function generateSessionToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Only accept POST
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ valid: false, error: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { password, deviceId, deviceInfo } = await req.json();

    if (!password || typeof password !== "string" || password.length > 100) {
      return new Response(
        JSON.stringify({ valid: false, error: "Password is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate deviceId format if provided
    if (deviceId && (typeof deviceId !== "string" || deviceId.length > 64)) {
      return new Response(
        JSON.stringify({ valid: false, error: "Invalid device ID" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with service role to access protected settings
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if this device is blocked
    if (deviceId) {
      const { data: sessionData, error: sessionError } = await supabase
        .from("ai_sessions")
        .select("is_blocked, blocked_reason")
        .eq("device_id", deviceId)
        .maybeSingle();

      if (!sessionError && sessionData?.is_blocked) {
        console.log("Device is blocked from AI access:", deviceId);
        return new Response(
          JSON.stringify({ 
            valid: false, 
            blocked: true,
            error: sessionData.blocked_reason || "Votre accès IA a été bloqué par l'administrateur." 
          }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Verify the password against the hashed value via RPC
    const { data: verifyResult, error } = await supabase
      .rpc("verify_ai_password", { input_password: password });

    if (error) {
      console.error("Error verifying AI password:", error);
      return new Response(
        JSON.stringify({ valid: false, error: "Internal server error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isValid = verifyResult === true;

    let sessionToken: string | null = null;

    // If valid and deviceId provided, create or update session
    if (isValid && deviceId) {
      // Generate a secure session token
      sessionToken = generateSessionToken();
      
      const sessionExpiry = new Date();
      sessionExpiry.setHours(sessionExpiry.getHours() + 24);

      const { error: upsertError } = await supabase
        .from("ai_sessions")
        .upsert({
          device_id: deviceId,
          device_info: deviceInfo || null,
          session_start: new Date().toISOString(),
          session_expiry: sessionExpiry.toISOString(),
          last_used_at: new Date().toISOString(),
          is_blocked: false,
          session_token: sessionToken
        }, {
          onConflict: 'device_id'
        });

      if (upsertError) {
        console.error("Error upserting AI session:", upsertError);
        // If session creation fails, still allow access but without token
        sessionToken = null;
      } else {
        console.log("AI session created/updated for device:", deviceId);
      }
    }

    return new Response(
      JSON.stringify({ 
        valid: isValid,
        sessionToken: isValid ? sessionToken : null,
        expiresAt: isValid ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : null
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error) {
    console.error("Error in validate-ai-password:", error);
    return new Response(
      JSON.stringify({ valid: false, error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

