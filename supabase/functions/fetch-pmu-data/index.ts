
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// CORS
// We intentionally allow any HTTPS origin (incl. custom domains) + localhost for dev.
// Access control is enforced separately via auth/accessCode.
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
    Vary: 'Origin',
  };
}

interface PMUGains {
  gainsCarriere?: number;
  gainsVictoires?: number;
  gainsPlace?: number;
  gainsAnneeEnCours?: number;
  gainsAnneePrecedente?: number;
}

interface PMUReport {
  typePari?: string;
  rapport?: number;
  typeRapport?: string;
  indicateurTendance?: string;
  nombreIndicateurTendance?: number;
  favoris?: boolean;
  grosseCote?: boolean;
}

interface PMUDistance {
  libelleCourt?: string;
  libelleLong?: string;
}

interface PMUParticipant {
  nom?: string;
  name?: string;
  numPmu: number;
  age: number;
  sex: string;
  driver: string;
  entraineur: string;
  musique?: string;
  rapport?: {
    direct?: number;
  };
  position?: number;
  oeilleres?: string;
  supplement?: boolean;
  handicapDistance?: number;
  ordreArrivee?: number;
  handicapValeur?: number;
  jumentPleine?: boolean;
  nombreCourses?: number;
  nombreVictoires?: number;
  nombrePlaces?: number;
  nombrePlacesSecond?: number;
  nombrePlacesTroisieme?: number;
  gainsParticipant?: PMUGains;
  dernierRapportDirect?: PMUReport;
  dernierRapportReference?: PMUReport;
  distanceChevalPrecedent?: PMUDistance;
  handicapPoids?: number;
  conditionMontoir?: string;
  allure?: string;
  deferre?: string;
  incident?: string;
  indicateurInedit?: boolean;
  tempsObtenu?: string;
  reductionKilometrique?: number;
}

interface PMUResponse {
  participants: PMUParticipant[];
}

// Input validation functions
function validateDateFormat(date: string): boolean {
  // Expected format: DDMMYYYY (8 digits)
  return /^\d{8}$/.test(date);
}

function validateReunionOrCourse(value: unknown): { valid: boolean; num: number } {
  const num = parseInt(String(value), 10);
  if (!Number.isInteger(num) || num < 1 || num > 99) {
    return { valid: false, num: 0 };
  }
  return { valid: true, num };
}

// Verify access - either via Supabase Auth or valid access code
async function verifyAccess(
  supabaseUrl: string,
  supabaseAnonKey: string,
  authHeader: string | null,
  accessCode: string | null
): Promise<{ authorized: boolean; reason: string }> {
  // Create a service client for RPC call (without user auth)
  const serviceClient = createClient(supabaseUrl, supabaseAnonKey);
  
  // Check if user is authenticated via Supabase Auth (admins)
  if (authHeader) {
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    const { data: { user }, error } = await userClient.auth.getUser();
    if (!error && user) {
      console.log('User authenticated via Supabase Auth:', user.id);
      return { authorized: true, reason: 'supabase_auth' };
    }
  }
  
  // Validate access code if provided
  if (accessCode && accessCode.trim()) {
    // Use raw SQL via RPC to validate the access code
    const { data, error } = await serviceClient
      .rpc('validate_access_code', { input_code: accessCode.trim() } as never);
    
    if (error) {
      console.error('Access code validation error:', error);
      return { authorized: false, reason: 'validation_error' };
    }
    
    // The RPC returns an array with {valid, expires_at}
    const results = data as Array<{ valid: boolean; expires_at: string }> | null;
    if (results && results.length > 0 && results[0].valid === true) {
      console.log('Valid access code used');
      return { authorized: true, reason: 'access_code' };
    } else {
      console.log('Invalid or expired access code');
      return { authorized: false, reason: 'invalid_code' };
    }
  }
  
  return { authorized: false, reason: 'no_credentials' };
}

// Max response size: 5MB
const MAX_RESPONSE_SIZE = 5 * 1024 * 1024;
// Max participants to prevent DoS
const MAX_PARTICIPANTS = 50;
// Fetch timeout: 30 seconds
const FETCH_TIMEOUT_MS = 30000;

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    // Parse request body first to get access code
    const { date, reunion, course, accessCode } = await req.json();

    // Verify authorization
    const authResult = await verifyAccess(supabaseUrl, supabaseAnonKey, authHeader, accessCode || null);
    if (!authResult.authorized) {
      console.log('Unauthorized access attempt:', authResult.reason);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Authentification requise. Veuillez entrer un code d\'accès valide.' 
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate required parameters exist (accessCode already extracted above)
    if (!date || reunion === undefined || course === undefined) {
      console.error('Missing parameters:', { date, reunion, course });
      return new Response(
        JSON.stringify({ success: false, error: 'Date, réunion et course sont requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate date format (DDMMYYYY)
    if (!validateDateFormat(String(date))) {
      console.error('Invalid date format:', date);
      return new Response(
        JSON.stringify({ success: false, error: 'Format de date invalide. Attendu: JJMMAAAA (ex: 24122024)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate reunion number (1-99)
    const reunionValidation = validateReunionOrCourse(reunion);
    if (!reunionValidation.valid) {
      console.error('Invalid reunion number:', reunion);
      return new Response(
        JSON.stringify({ success: false, error: 'Numéro de réunion invalide (1-99)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate course number (1-99)
    const courseValidation = validateReunionOrCourse(course);
    if (!courseValidation.valid) {
      console.error('Invalid course number:', course);
      return new Response(
        JSON.stringify({ success: false, error: 'Numéro de course invalide (1-99)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format the PMU API URL with validated values
    const pmuUrl = `https://tablette.turfinfo.api.pmu.fr/rest/client/1/programme/${date}/R${reunionValidation.num}/C${courseValidation.num}/participants`;
    
    console.log('Fetching PMU data from:', pmuUrl);

    // Fetch with timeout using AbortController
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(pmuUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('PMU API request timed out');
        return new Response(
          JSON.stringify({ success: false, error: 'Timeout: API PMU trop lente' }),
          { status: 504, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw error;
    }

    if (!response.ok) {
      console.error('PMU API error:', response.status, response.statusText);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Erreur API PMU: ${response.status} - Vérifiez la date, réunion et course` 
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check content-length before reading body
    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > MAX_RESPONSE_SIZE) {
      console.error('PMU response too large:', contentLength);
      return new Response(
        JSON.stringify({ success: false, error: 'Réponse trop volumineuse' }),
        { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data: PMUResponse = await response.json();
    console.log('PMU data received, participants count:', data.participants?.length || 0);

    // Validate response structure
    if (!data.participants || !Array.isArray(data.participants)) {
      console.error('Invalid PMU response structure');
      return new Response(
        JSON.stringify({ success: false, error: 'Format de réponse API invalide' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (data.participants.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Aucun participant trouvé pour cette course' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Limit participants to prevent DoS
    if (data.participants.length > MAX_PARTICIPANTS) {
      console.warn('Too many participants, limiting to', MAX_PARTICIPANTS);
      data.participants = data.participants.slice(0, MAX_PARTICIPANTS);
    }

    // Transform PMU data to our extended format
    const horses = data.participants.map((p) => {
      const gains = p.gainsParticipant || {};
      const lastDirect = p.dernierRapportDirect || {};
      const lastRef = p.dernierRapportReference || {};
      const distance = p.distanceChevalPrecedent || {};

      return {
        numero: p.numPmu,
        name: p.nom || p.name || '',
        age: p.age,
        sex: p.sex,
        driver: p.driver,
        trainer: p.entraineur,
        musique: p.musique || '',
        cote: p.rapport?.direct || 0,
        position: p.position || 0,
        blinkers: p.oeilleres || '',
        supplement: p.supplement || false,
        handicapDistance: p.handicapDistance || 0,
        orderOfFinish: p.ordreArrivee || 0,
        handicapValue: p.handicapValeur || 0,
        mareInFoal: p.jumentPleine || false,
        numberOfRaces: p.nombreCourses || 0,
        numberOfWins: p.nombreVictoires || 0,
        numberOfPlaces: p.nombrePlaces || 0,
        numberOfPlacesSecond: p.nombrePlacesSecond || 0,
        numberOfPlacesThird: p.nombrePlacesTroisieme || 0,
        // Gains (convert from centimes to euros)
        gainsCareer: (gains.gainsCarriere || 0) / 100,
        gainsVictory: (gains.gainsVictoires || 0) / 100,
        gainsPlace: (gains.gainsPlace || 0) / 100,
        gainsCurrentYear: (gains.gainsAnneeEnCours || 0) / 100,
        gainsPreviousYear: (gains.gainsAnneePrecedente || 0) / 100,
        // Weight
        handicapWeight: (p.handicapPoids || 0) / 10,
        weightConditionChange: p.conditionMontoir || '',
        // Distance from previous horse
        distanceShort: distance.libelleCourt || '',
        distanceLong: distance.libelleLong || '',
        // Last direct report
        lastDirectType: lastDirect.typePari || '',
        lastDirectRatio: lastDirect.rapport || 0,
        lastDirectReportType: lastDirect.typeRapport || '',
        lastDirectTrend: lastDirect.indicateurTendance || '',
        lastDirectTrendNumber: lastDirect.nombreIndicateurTendance || 0,
        lastDirectFavorite: lastDirect.favoris || false,
        lastDirectHighOdds: lastDirect.grosseCote || false,
        // Last reference report
        lastRefType: lastRef.typePari || '',
        lastRefRatio: lastRef.rapport || 0,
        lastRefReportType: lastRef.typeRapport || '',
        lastRefTrend: lastRef.indicateurTendance || '',
        lastRefTrendNumber: lastRef.nombreIndicateurTendance || 0,
        lastRefFavorite: lastRef.favoris || false,
        lastRefHighOdds: lastRef.grosseCote || false,
        // Other fields
        pace: p.allure || '',
        unshod: p.deferre || '',
        incident: p.incident || '',
        unprecedented: p.indicateurInedit || false,
        timeObtained: p.tempsObtenu || '',
        reductionKm: p.reductionKilometrique || 0,
      };
    });

    console.log('Transformed horses:', horses.length);

    return new Response(
      JSON.stringify({ success: true, horses }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching PMU data:', error);
    const origin = req.headers.get('origin');
    const corsHeaders = getCorsHeaders(origin);
    const errorMessage = error instanceof Error ? error.message : 'Erreur lors de la récupération des données';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

