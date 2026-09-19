
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Simple in-memory rate limiter (for production, consider using Redis/Upstash)
const requestCounts = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 3; // 3 subscription attempts
const WINDOW_MS = 60 * 60 * 1000; // per hour

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = requestCounts.get(ip);
  
  if (!record || now > record.resetAt) {
    requestCounts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  
  if (record.count >= RATE_LIMIT) {
    return false; // Rate limit exceeded
  }
  
  record.count++;
  return true;
}

function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigin =
    origin &&
    (origin.startsWith('https://') ||
      origin.startsWith('http://localhost:') ||
      origin.startsWith('http://127.0.0.1:'))
      ? origin
      : '*';
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Only accept POST requests
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                     req.headers.get('x-real-ip') || 
                     'unknown';
    
    console.log(`Subscription attempt from IP: ${clientIp}`);
    
    // Check rate limit
    if (!checkRateLimit(clientIp)) {
      console.log(`Rate limit exceeded for IP: ${clientIp}`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Trop de tentatives. Veuillez réessayer dans 1 heure.' 
        }),
        { 
          status: 429, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    const body = await req.json();
    const { email } = body;
    
    // Email validation - check presence
    if (!email || typeof email !== 'string') {
      console.log('Email validation failed: missing or invalid type');
      return new Response(
        JSON.stringify({ success: false, error: 'Email requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Check length
    if (trimmedEmail.length > 255) {
      console.log('Email validation failed: too long');
      return new Response(
        JSON.stringify({ success: false, error: 'Email trop long' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      console.log('Email validation failed: invalid format');
      return new Response(
        JSON.stringify({ success: false, error: 'Format email invalide' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Use service role key for INSERT (bypass RLS)
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase configuration');
      throw new Error('Server configuration error');
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { error } = await supabase
      .from('email_subscribers')
      .insert({ email: trimmedEmail });
    
    if (error) {
      console.error('Database insert error:', error);
      
      // Check for duplicate email (unique constraint)
      if (error.code === '23505') {
        return new Response(
          JSON.stringify({ success: false, error: 'Cet email est déjà inscrit' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw error;
    }
    
    console.log(`Successfully subscribed: ${trimmedEmail}`);
    
    return new Response(
      JSON.stringify({ success: true, message: 'Inscription réussie' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Subscription error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Erreur lors de l\'inscription' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

