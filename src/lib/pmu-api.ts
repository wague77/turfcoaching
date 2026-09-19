
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
  // Get the stored access code from sessionStorage
  const accessCode = sessionStorage.getItem('racing_access_code') || '';
  
  const { data, error } = await supabase.functions.invoke('fetch-pmu-data', {
    body: { date, reunion, course, accessCode },
  });

  if (error) {
    console.error('Error calling fetch-pmu-data:', error);
    return { success: false, error: error.message };
  }

  return data as PMUResponse;
}

export async function fetchPMUResults(date: string, reunion: number, course: number): Promise<PMUResultsResponse> {
  // Get the stored access code from sessionStorage
  const accessCode = sessionStorage.getItem('racing_access_code') || '';
  
  const { data, error } = await supabase.functions.invoke('fetch-pmu-results', {
    body: { date, reunion, course, accessCode },
  });

  if (error) {
    console.error('Error calling fetch-pmu-results:', error);
    return { success: false, error: error.message };
  }

  return data as PMUResultsResponse;
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

