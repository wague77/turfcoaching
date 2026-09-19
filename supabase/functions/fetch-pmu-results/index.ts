
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// CORS headers
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

// Input validation
function validateDateFormat(date: string): boolean {
  return /^\d{8}$/.test(date);
}

function validateReunionOrCourse(value: unknown): { valid: boolean; num: number } {
  const num = parseInt(String(value), 10);
  if (!Number.isInteger(num) || num < 1 || num > 99) {
    return { valid: false, num: 0 };
  }
  return { valid: true, num };
}

function numberFromUnknown(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const m = value.match(/-?\d+/);
    return m ? parseInt(m[0], 10) : 0;
  }
  if (value && typeof value === 'object') {
    const v = value as Record<string, unknown>;
    const candidates = [v.ordreArrivee, v.ordre, v.position, v.rang, v.numPmu, v.numero, v.num];
    for (const c of candidates) {
      if (typeof c === 'number') return Number.isFinite(c) ? c : 0;
      if (typeof c === 'string') {
        const m = c.match(/-?\d+/);
        if (m) return parseInt(m[0], 10);
      }
    }
    // one-level nested objects (rare but seen in some APIs)
    for (const c of candidates) {
      if (c && typeof c === 'object') {
        const vv = c as Record<string, unknown>;
        const nested = [vv.ordreArrivee, vv.ordre, vv.position, vv.rang, vv.numPmu, vv.numero, vv.num];
        for (const n of nested) {
          if (typeof n === 'number') return Number.isFinite(n) ? n : 0;
          if (typeof n === 'string') {
            const m = n.match(/-?\d+/);
            if (m) return parseInt(m[0], 10);
          }
        }
      }
    }
  }
  return 0;
}

// Verify access
async function verifyAccess(
  supabaseUrl: string,
  supabaseAnonKey: string,
  authHeader: string | null,
  accessCode: string | null
): Promise<{ authorized: boolean; reason: string }> {
  const serviceClient = createClient(supabaseUrl, supabaseAnonKey);

  if (authHeader) {
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error,
    } = await userClient.auth.getUser();
    if (!error && user) {
      console.log('User authenticated via Supabase Auth:', user.id);
      return { authorized: true, reason: 'supabase_auth' };
    }
  }

  if (accessCode && accessCode.trim()) {
    const { data, error } = await serviceClient.rpc('validate_access_code', {
      input_code: accessCode.trim(),
    } as never);

    if (error) {
      console.error('Access code validation error:', error);
      return { authorized: false, reason: 'validation_error' };
    }

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

interface PMUArrivee {
  numPmu: number;
  nom?: string;
  name?: string;
  ordreArrivee: number;
  tempsObtenu?: string;
  reductionKilometrique?: number;
  rapport?: {
    simple?: {
      gagnant?: number;
      place?: number;
    };
  };
}

interface PMURapport {
  typePari: string;
  libelle: string;
  combinaison?: number[];
  dividende?: number;
}

interface PMUParticipant {
  numPmu: number;
  nom?: string;
  name?: string;
  ordreArrivee?: number;
  tempsObtenu?: string;
  reductionKilometrique?: number;
}

interface PMUResultResponse {
  arrivee?: PMUArrivee[];
  rapports?: PMURapport[];
  participants?: PMUParticipant[];
  statutCourse?: string;
  heureDepart?: string;
}

const FETCH_TIMEOUT_MS = 30000;

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    const { date, reunion, course, accessCode } = await req.json();

    // Verify authorization
    const authResult = await verifyAccess(supabaseUrl, supabaseAnonKey, authHeader, accessCode || null);
    if (!authResult.authorized) {
      console.log('Unauthorized access attempt:', authResult.reason);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Authentification requise. Veuillez entrer un code d'accès valide.",
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate parameters
    if (!date || reunion === undefined || course === undefined) {
      return new Response(
        JSON.stringify({ success: false, error: 'Date, réunion et course sont requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!validateDateFormat(String(date))) {
      return new Response(
        JSON.stringify({ success: false, error: 'Format de date invalide. Attendu: JJMMAAAA' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const reunionValidation = validateReunionOrCourse(reunion);
    if (!reunionValidation.valid) {
      return new Response(
        JSON.stringify({ success: false, error: 'Numéro de réunion invalide (1-99)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const courseValidation = validateReunionOrCourse(course);
    if (!courseValidation.valid) {
      return new Response(
        JSON.stringify({ success: false, error: 'Numéro de course invalide (1-99)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Try multiple PMU API endpoints for race results
    const baseUrl = `https://tablette.turfinfo.api.pmu.fr/rest/client/1/programme/${date}/R${reunionValidation.num}/C${courseValidation.num}`;

    const endpoints = [`${baseUrl}/arrivee-definitive`, `${baseUrl}/arrivee`, `${baseUrl}`];

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let data: PMUResultResponse | null = null;
    let lastStatus = 0;

    for (const pmuUrl of endpoints) {
      console.log('Trying PMU results endpoint:', pmuUrl);

      try {
        const response = await fetch(pmuUrl, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
          signal: controller.signal,
        });

        lastStatus = response.status;

        if (response.ok) {
          const responseData = await response.json();
          console.log('Response received from', pmuUrl, '- keys:', Object.keys(responseData));

          // 1) Direct arrivee payload
          if (responseData.arrivee && responseData.arrivee.length > 0) {
            data = responseData;
            console.log('Found arrivee data with', responseData.arrivee.length, 'horses');
            break;
          }

          // 2) ordreArrivee: often an array of horse numbers in finish order
          if (responseData.ordreArrivee && Array.isArray(responseData.ordreArrivee) && responseData.ordreArrivee.length > 0) {
            const ordreArrivee = responseData.ordreArrivee as unknown[];

            if (typeof ordreArrivee[0] === 'number') {
              const participants: PMUParticipant[] = Array.isArray(responseData.participants)
                ? (responseData.participants as PMUParticipant[])
                : [];
              const byNum = new Map<number, PMUParticipant>(participants.map((p) => [p.numPmu, p]));

              const arrivee: PMUArrivee[] = (ordreArrivee as number[]).map((numPmu, idx) => {
                const p = byNum.get(numPmu);
                return {
                  numPmu,
                  nom: p?.nom || p?.name,
                  ordreArrivee: idx + 1,
                  tempsObtenu: p?.tempsObtenu,
                  reductionKilometrique: p?.reductionKilometrique,
                };
              });

              data = {
                arrivee,
                rapports: responseData.rapports,
                participants: Array.isArray(responseData.participants)
                  ? (responseData.participants as PMUParticipant[])
                  : [],
              };
              console.log('Found ordreArrivee (numbers) with', arrivee.length, 'horses');
              break;
            }

            const ordreObjects = ordreArrivee as Array<Record<string, unknown>>;
            console.log('ordreArrivee object sample:', JSON.stringify(ordreObjects[0] ?? {}).slice(0, 500));

            const arrivee: PMUArrivee[] = ordreObjects
              .map((o, idx) => {
                const numPmu = numberFromUnknown(
                  o.numPmu ?? o.numero ?? o.num ?? o.numPmuCheval ?? o.numCheval ?? o.numPmuParticipant
                );
                const ordre =
                  numberFromUnknown(o.ordreArrivee ?? o.ordre ?? o.position ?? o.rang) || idx + 1;

                return {
                  numPmu,
                  nom: (o.nom as string | undefined) || (o.name as string | undefined),
                  ordreArrivee: ordre,
                  tempsObtenu: (o.tempsObtenu as string | undefined) || (o.timeObtained as string | undefined),
                  reductionKilometrique: numberFromUnknown(o.reductionKilometrique ?? o.reductionKm),
                  rapport: o.rapport as
                    | {
                        simple?: {
                          gagnant?: number;
                          place?: number;
                        };
                      }
                    | undefined,
                };
              })
              .filter((a) => a.numPmu > 0 && a.ordreArrivee > 0);

            data = {
              arrivee,
              rapports: responseData.rapports,
              participants: Array.isArray(responseData.participants)
                ? (responseData.participants as PMUParticipant[])
                : [],
            };
            console.log('Found ordreArrivee (objects) with', arrivee.length, 'horses');
            break;
          }

          // 3) participants already include ordreArrivee
          if (responseData.participants) {
            const finishedParticipants = (responseData.participants as PMUParticipant[]).filter(
              (p) => p.ordreArrivee && p.ordreArrivee > 0
            );

            if (finishedParticipants.length > 0) {
              data = {
                arrivee: finishedParticipants.map((p) => ({
                  numPmu: p.numPmu,
                  nom: p.nom || p.name,
                  ordreArrivee: p.ordreArrivee || 0,
                  tempsObtenu: p.tempsObtenu,
                  reductionKilometrique: p.reductionKilometrique,
                })),
                rapports: responseData.rapports,
              };
              console.log('Extracted results from participants:', finishedParticipants.length, 'finished horses');
              break;
            }
          }

          console.log('Endpoint returned OK but no valid arrivee data found');
        } else {
          console.log('Endpoint returned status:', response.status);
          try {
            const errorBody = await response.text();
            console.log('Error body preview:', errorBody.substring(0, 200));
          } catch {
            // ignore
          }
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          clearTimeout(timeoutId);
          return new Response(
            JSON.stringify({ success: false, error: 'Timeout: API PMU trop lente' }),
            { status: 504, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log('Error fetching from', pmuUrl, ':', error instanceof Error ? error.message : 'Unknown error');
      }
    }

    clearTimeout(timeoutId);

    if (!data) {
      console.log('No valid arrivee data found from any endpoint. Last status:', lastStatus);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Course non terminée ou arrivée non encore disponible. Réessayez après la fin de la course.",
          notFinished: true,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('PMU results received, arrivee count:', data.arrivee?.length || 0);

    if (!data.arrivee || data.arrivee.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Aucune arrivée disponible pour cette course',
          notFinished: true,
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Transform the results (normalize payload differences between endpoints)
    const participants = (data as unknown as { participants?: PMUParticipant[] }).participants;
    const byNum = new Map<number, PMUParticipant>(
      Array.isArray(participants) ? participants.map((p) => [p.numPmu, p]) : []
    );

    const results = (data.arrivee || [])
      .map((raw, idx) => {
        const a = raw as unknown as Record<string, unknown>;

        const numero = numberFromUnknown(
          a.numPmu ?? a.numero ?? a.num ?? a.numPmuCheval ?? a.numCheval ?? a.numPmuParticipant
        );

        const position =
          numberFromUnknown(a.ordreArrivee ?? a.ordre ?? a.position ?? a.rang) || idx + 1;

        const participant = byNum.get(numero);
        const name =
          (a.nom as string | undefined) ||
          (a.name as string | undefined) ||
          (participant?.nom || participant?.name) ||
          '';

        const time =
          (a.tempsObtenu as string | undefined) ||
          (a.timeObtained as string | undefined) ||
          (participant?.tempsObtenu ?? '') ||
          '';

        const reductionKm = numberFromUnknown(
          a.reductionKilometrique ?? a.reductionKm ?? participant?.reductionKilometrique ?? 0
        );

        const rapport = a.rapport as
          | { simple?: { gagnant?: number; place?: number } }
          | undefined;

        return {
          numero,
          name,
          position,
          time,
          reductionKm,
          rapportGagnant: rapport?.simple?.gagnant ? rapport.simple.gagnant / 100 : null,
          rapportPlace: rapport?.simple?.place ? rapport.simple.place / 100 : null,
        };
      })
      .filter((r) => r.numero > 0 && r.position > 0)
      .sort((a, b) => a.position - b.position);

    const rapports = (data.rapports || [])
      .filter((r) => r.dividende && r.dividende > 0)
      .map((r) => ({
        type: r.typePari,
        label: r.libelle,
        combination: r.combinaison || [],
        dividend: r.dividende ? r.dividende / 100 : 0,
      }));

    console.log('Transformed results:', results.length, 'rapports:', rapports.length);

    return new Response(
      JSON.stringify({
        success: true,
        results,
        rapports,
        raceStatus: data.statutCourse || 'TERMINEE',
        startTime: data.heureDepart || null,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching PMU results:', error);
    const origin = req.headers.get('origin');
    const corsHeaders = getCorsHeaders(origin);
    const errorMessage = error instanceof Error ? error.message : 'Erreur lors de la récupération des arrivées';
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

