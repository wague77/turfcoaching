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
        { success: false, error: 'Format de date invalide (JJMMAAAA requis, ex: 20092024)' },
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

    const pmuUrl = `https://tablette.turfinfo.api.pmu.fr/rest/client/1/programme/${dateStr}/R${reunionValidation.num}/C${courseValidation.num}/participants`;

    console.log('Fetching PMU data from:', pmuUrl);

    const response = await fetch(pmuUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      next: { revalidate: 30 }
    });

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: `Erreur API PMU: ${response.status} - Vérifiez la date, réunion et course` },
        { status: response.status }
      );
    }

    const data = await response.json();

    if (!data.participants || !Array.isArray(data.participants) || data.participants.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Aucun participant trouvé pour cette course' },
        { status: 404 }
      );
    }

    const horses = data.participants.map((p: any) => {
      const gains = p.gainsParticipant || {};
      const lastDirect = p.dernierRapportDirect || {};
      const lastRef = p.dernierRapportReference || {};
      const distance = p.distanceChevalPrecedent || {};

      return {
        numero: p.numPmu,
        name: p.nom || p.name || '',
        age: p.age || 0,
        sex: p.sexe || p.sex || '',
        driver: p.driver || '',
        trainer: p.entraineur || p.trainer || '',
        musique: p.musique || '',
        cote: p.rapport?.direct || lastDirect.rapport || 0,
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
        gainsCareer: (gains.gainsCarriere || 0) / 100,
        gainsVictory: (gains.gainsVictoires || 0) / 100,
        gainsPlace: (gains.gainsPlace || 0) / 100,
        gainsCurrentYear: (gains.gainsAnneeEnCours || 0) / 100,
        gainsPreviousYear: (gains.gainsAnneePrecedente || 0) / 100,
        handicapWeight: (p.handicapPoids || 0) / 10,
        weightConditionChange: p.conditionMontoir || '',
        distanceShort: distance.libelleCourt || '',
        distanceLong: distance.libelleLong || '',
        lastDirectType: lastDirect.typePari || '',
        lastDirectRatio: lastDirect.rapport || 0,
        lastDirectReportType: lastDirect.typeRapport || '',
        lastDirectTrend: lastDirect.indicateurTendance || '',
        lastDirectTrendNumber: lastDirect.nombreIndicateurTendance || 0,
        lastDirectFavorite: lastDirect.favoris || false,
        lastDirectHighOdds: lastDirect.grosseCote || false,
        lastRefType: lastRef.typePari || '',
        lastRefRatio: lastRef.rapport || 0,
        lastRefReportType: lastRef.typeRapport || '',
        lastRefTrend: lastRef.indicateurTendance || '',
        lastRefTrendNumber: lastRef.nombreIndicateurTendance || 0,
        lastRefFavorite: lastRef.favoris || false,
        lastRefHighOdds: lastRef.grosseCote || false,
        pace: p.allure || '',
        unshod: p.deferre || '',
        incident: p.incident || '',
        unprecedented: p.indicateurInedit || false,
        timeObtained: p.tempsObtenu || '',
        reductionKm: p.reductionKilometrique || 0,
      };
    });

    return NextResponse.json({ success: true, horses });
  } catch (error: any) {
    console.error('API /api/pmu/fetch-data error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Erreur serveur lors de la récupération des données PMU' },
      { status: 500 }
    );
  }
}
