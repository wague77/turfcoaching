
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, voiceId } = await req.json();
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");

    if (!ELEVENLABS_API_KEY) {
      throw new Error("ELEVENLABS_API_KEY non configurée");
    }

    if (!text || text.trim().length === 0) {
      throw new Error("Texte requis");
    }

    // Clean text for speech (remove markdown, emojis, etc.)
    const cleanedText = text
      .replace(/#{1,6}\s/g, '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/`(.*?)`/g, '$1')
      .replace(/```[\s\S]*?```/g, '')
      .replace(/\[(.*?)\]\(.*?\)/g, '$1')
      .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')
      .replace(/•/g, '')
      .replace(/\n+/g, '. ')
      .replace(/\s+/g, ' ')
      .trim();

    if (cleanedText.length === 0) {
      throw new Error("Texte vide après nettoyage");
    }

    // Use a male voice - "Daniel" is a deep, professional male voice
    // Good for authoritative AI assistant responses
    const selectedVoiceId = voiceId || "onwK4e9ZLuTAKqWW03F9"; // Daniel - Male voice

    console.log(`Generating TTS for ${cleanedText.length} characters with voice ${selectedVoiceId}`);

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${selectedVoiceId}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: cleanedText,
          model_id: "eleven_multilingual_v2", // Best for French
          voice_settings: {
            stability: 0.6,
            similarity_boost: 0.75,
            style: 0.4,
            use_speaker_boost: true,
            speed: 1.0,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("ElevenLabs API error:", errorText);
      throw new Error(`Erreur ElevenLabs: ${response.status}`);
    }

    const audioBuffer = await response.arrayBuffer();
    
    // Return base64 encoded audio for easier client handling
    const base64Audio = base64Encode(audioBuffer);

    return new Response(
      JSON.stringify({ 
        success: true, 
        audioContent: base64Audio,
        format: "audio/mpeg"
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("TTS Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Erreur de synthèse vocale";
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});

