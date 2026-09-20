import { NextResponse } from 'next/server';

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
  }
  return 0;
}

export async function POST(req: Request) {
  try {
    const { date, reunion, course } = await req.json();

    if (!date || reunion === undefined || course === undefined) {
      return NextResponse.json(
        { success: false, error: 'Date, réunion et course sont requis' },
        { status: 400 }
      );
    }

    const dateStr = String(date);
    if (!validateDateFormat(dateStr)) {
      return NextResponse.json(
        { success: false, error: 'Format de date invalide (JJMMAAAA)' },
        { status: 400 }
      );
    }

    const reunionValidation = validateReunionOrCourse(reunion);
    const courseValidation = validateReunionOrCourse(course);

    if (!reunionValidation.valid || !courseValidation.valid) {
      return NextResponse.json(
        { success: false, error: 'Numéro de réunion ou de course invalide' },
        { status: 400 }
      );
    }

    const baseUrl = `https://tablette.turfinfo.api.pmu.fr/rest/client/1/programme/${dateStr}/R${reunionValidation.num}/C${courseValidation.num}`;
    const endpoints = [`${baseUrl}/arrivee-definitive`, `${baseUrl}/arrivee`, `${baseUrl}`];

    let data: any = null;
    let lastStatus = 0;

    for (const pmuUrl of endpoints) {
      try {
        const response = await fetch(pmuUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
          next: { revalidate: 30 }
        });

        lastStatus = response.status;

        if (response.ok) {
          const responseData = await response.json();
          if (responseData.arrivee && responseData.arrivee.length > 0) {
            data = responseData;
            break;
          }
          if (responseData.ordreArrivee && Array.isArray(responseData.ordreArrivee) && responseData.ordreArrivee.length > 0) {
            const participants = Array.isArray(responseData.participants) ? responseData.participants : [];
            const byNum = new Map<number, any>(participants.map((p: any) => [p.numPmu, p]));

            const arrivee = responseData.ordreArrivee.map((item: any, idx: number) => {
              const numPmu = typeof item === 'number' ? item : numberFromUnknown(item?.numPmu || item?.numero);
              const p = byNum.get(numPmu);
              return {
                numPmu,
                nom: p?.nom || p?.name || item?.nom || item?.name,
                ordreArrivee: idx + 1,
                tempsObtenu: p?.tempsObtenu || item?.tempsObtenu,
                reductionKilometrique: p?.reductionKilometrique || item?.reductionKilometrique,
              };
            });

            data = { arrivee, rapports: responseData.rapports };
            break;
          }
          if (responseData.participants) {
            const finished = responseData.participants.filter((p: any) => p.ordreArrivee && p.ordreArrivee > 0);
            if (finished.length > 0) {
              data = {
                arrivee: finished.map((p: any) => ({
                  numPmu: p.numPmu,
                  nom: p.nom || p.name,
                  ordreArrivee: p.ordreArrivee,
                  tempsObtenu: p.tempsObtenu,
                  reductionKilometrique: p.reductionKilometrique,
                })),
                rapports: responseData.rapports,
              };
              break;
            }
          }
        }
      } catch (err) {
        console.warn('Endpoint error:', pmuUrl, err);
      }
    }

    if (!data || !data.arrivee || data.arrivee.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Course non terminée ou arrivée non encore disponible.",
          notFinished: true,
        },
        { status: 200 }
      );
    }

    const results = (data.arrivee || [])
      .map((raw: any, idx: number) => {
        const numero = numberFromUnknown(raw.numPmu ?? raw.numero ?? raw.num);
        const position = numberFromUnknown(raw.ordreArrivee ?? raw.position) || idx + 1;
        const rapport = raw.rapport?.simple;

        return {
          numero,
          name: raw.nom || raw.name || '',
          position,
          time: raw.tempsObtenu || '',
          reductionKm: raw.reductionKilometrique || 0,
          rapportGagnant: rapport?.gagnant ? rapport.gagnant / 100 : null,
          rapportPlace: rapport?.place ? rapport.place / 100 : null,
        };
      })
      .filter((r: any) => r.numero > 0 && r.position > 0)
      .sort((a: any, b: any) => a.position - b.position);

    const rapports = (data.rapports || [])
      .filter((r: any) => r.dividende && r.dividende > 0)
      .map((r: any) => ({
        type: r.typePari,
        label: r.libelle,
        combination: r.combinaison || [],
        dividend: r.dividende ? r.dividende / 100 : 0,
      }));

    return NextResponse.json({
      success: true,
      results,
      rapports,
      raceStatus: data.statutCourse || 'TERMINEE',
      startTime: data.heureDepart || null,
    });
  } catch (error: any) {
    console.error('API /api/pmu/fetch-results error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Erreur serveur lors de la récupération des résultats PMU' },
      { status: 500 }
    );
  }
}
