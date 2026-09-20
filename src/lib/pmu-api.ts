
import { supabase } from '@/integrations/supabase/client';

export interface PMUHorse {
  numero: number;
  name: string;
  age: number;
  sex: string;
  driver: string;
  trainer: string;
  musique: string;
  cote: number;
  position: number;
  blinkers: string;
  supplement: boolean;
  handicapDistance: number;
  orderOfFinish: number;
  handicapValue: number;
  mareInFoal: boolean;
  numberOfRaces: number;
  numberOfWins: number;
  numberOfPlaces: number;
  numberOfPlacesSecond: number;
  numberOfPlacesThird: number;
  // Gains (in euros)
  gainsCareer: number;
  gainsVictory: number;
  gainsPlace: number;
  gainsCurrentYear: number;
  gainsPreviousYear: number;
  // Weight
  handicapWeight: number;
  weightConditionChange: string;
  // Distance from previous horse
  distanceShort: string;
  distanceLong: string;
  // Last direct report
  lastDirectType: string;
  lastDirectRatio: number;
  lastDirectReportType: string;
  lastDirectTrend: string;
  lastDirectTrendNumber: number;
  lastDirectFavorite: boolean;
  lastDirectHighOdds: boolean;
  // Last reference report
  lastRefType: string;
  lastRefRatio: number;
  lastRefReportType: string;
  lastRefTrend: string;
  lastRefTrendNumber: number;
  lastRefFavorite: boolean;
  lastRefHighOdds: boolean;
  // Other fields
  pace: string;
  unshod: string;
  incident: string;
  unprecedented: boolean;
  timeObtained: string;
  reductionKm: number;
}

interface PMUResponse {
  success: boolean;
  horses?: PMUHorse[];
  error?: string;
}

export interface PMURaceResult {
  numero: number;
  name: string;
  position: number;
  time: string;
  reductionKm: number;
  rapportGagnant: number | null;
  rapportPlace: number | null;
}

export interface PMURapport {
  type: string;
  label: string;
  combination: number[];
  dividend: number;
}

export interface PMUResultsResponse {
  success: boolean;
  results?: PMURaceResult[];
  rapports?: PMURapport[];
  raceStatus?: string;
  startTime?: string;
  error?: string;
  notFinished?: boolean;
}

export async function fetchPMUData(date: string, reunion: number, course: number): Promise<PMUResponse> {
  const accessCode = typeof window !== 'undefined' ? (sessionStorage.getItem('racing_access_code') || '') : '';
  
  try {
    const resp = await fetch('/api/pmu/fetch-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, reunion, course, accessCode }),
    });

    if (resp.ok) {
      const data = await resp.json();
      if (data.success || data.horses) {
        return data as PMUResponse;
      }
      if (data.error) {
        return { success: false, error: data.error };
      }
    }
  } catch (err) {
    console.warn('Native API /api/pmu/fetch-data error, attempting Supabase fallback', err);
  }

  // Edge Function fallback if present
  try {
    const { data, error } = await supabase.functions.invoke('fetch-pmu-data', {
      body: { date, reunion, course, accessCode },
    });

    if (!error && data) {
      return data as PMUResponse;
    }
  } catch (err) {
    console.error('Error calling fetch-pmu-data:', err);
  }

  return { success: false, error: 'Impossible d\'importer la course. Veuillez vérifier la réunion et la course.' };
}

export async function fetchPMUResults(date: string, reunion: number, course: number): Promise<PMUResultsResponse> {
  const accessCode = typeof window !== 'undefined' ? (sessionStorage.getItem('racing_access_code') || '') : '';
  
  try {
    const resp = await fetch('/api/pmu/fetch-results', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, reunion, course, accessCode }),
    });

    if (resp.ok) {
      const data = await resp.json();
      if (data.success || data.results) {
        return data as PMUResultsResponse;
      }
      if (data.error) {
        return { success: false, error: data.error, notFinished: data.notFinished };
      }
    }
  } catch (err) {
    console.warn('Native API /api/pmu/fetch-results error, attempting Supabase fallback', err);
  }

  // Edge Function fallback if present
  try {
    const { data, error } = await supabase.functions.invoke('fetch-pmu-results', {
      body: { date, reunion, course, accessCode },
    });

    if (!error && data) {
      return data as PMUResultsResponse;
    }
  } catch (err) {
    console.error('Error calling fetch-pmu-results:', err);
  }

  return { success: false, error: 'Impossible de récupérer les résultats de la course.' };
}

// Convert PMU horses to the input format expected by the racing logic
export function convertPMUToInput(horses: PMUHorse[]): string {
  return horses
    .filter(h => h.numero > 0)
    .sort((a, b) => a.numero - b.numero)
    .map(h => {
      // Format: N° Rapp.Direct Musique
      const ratio = h.lastDirectRatio > 0 ? h.lastDirectRatio : '?';
      const musique = h.musique || '0';
      return `${h.numero} ${ratio} ${musique}`;
    })
    .join('\n');
}

// Format currency for display
export function formatEuros(amount: number): string {
  if (amount === 0) return '-';
  return new Intl.NumberFormat('fr-FR', { 
    style: 'currency', 
    currency: 'EUR',
    maximumFractionDigits: 0 
  }).format(amount);
}

// Format percentage for win rate
export function formatWinRate(wins: number, races: number): string {
  if (races === 0) return '-';
  return `${((wins / races) * 100).toFixed(1)}%`;
}

