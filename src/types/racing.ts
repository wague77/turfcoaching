
export type Discipline = 'plat' | 'trot' | 'obstacle';

export interface Horse {
  numero: number;
  name?: string;
  cote: number;
  musique: string;
  musicItems: number[];
  scoreCote: number;
  scoreMusique: number;
  scoreMusiqueAjuste: number;
  scoreTotal: number;
  label: 'BASE' | 'OUTSIDER' | 'DOUTEUX' | 'NEUTRE';
  verdict?: 'FIABLE' | 'DOUTEUX' | 'FAUX_FAVORI';
  hasWon: boolean;
  winPositions: number[];
}

export interface AnalysisResult {
  horses: Horse[];
  topByCote: Horse[];
  topByMusique: Horse[];
  topAjuste: Horse[];
  couples: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  difficultyScore: number;
  favorites: Horse[];
  winners: Horse[];
}

export interface RawHorseData {
  numero: number;
  name?: string;
  cote: number;
  musique: string;
}

export interface RaceResult {
  first: number;
  second: number;
  third: number;
  fourth?: number;
  fifth?: number;
}

export interface PronosticEvaluation {
  baseSuccess: boolean;
  outsiderSuccess: boolean;
  trifectaScore: number; // 0-3 horses correct
  superfectaScore?: number; // 0-4 horses correct
  overallScore: number; // 0-100%
}

export interface SavedPronostic {
  id: string;
  timestamp: number;
  raceName?: string;
  horseCount: number;
  tips: string;
  analysisResult?: AnalysisResult | null;
  raceResult?: RaceResult;
  evaluation?: PronosticEvaluation;
}

// New: Comparison history types
export interface ComparisonResult {
  id: string;
  timestamp: number;
  raceName?: string;
  arrivee: number[]; // Official finish order
  bases: number[]; // AI predicted bases
  outsiders: number[]; // AI predicted outsiders
  allMentioned: number[]; // All mentioned horses
  winnerPredicted: boolean;
  basesInTop3: number[];
  basesInTop5: number[];
  outsidersInTop3: number[];
  outsidersInTop5: number[];
  allInTop3: number[];
  allInTop5: number[];
  baseSuccessRate: number | null;
  overallSuccessRate: number | null;
  tierceScore: number;
}

export interface ComparisonStats {
  totalComparisons: number;
  avgSuccessRate: number;
  winnerPredictionRate: number;
  basesInTop3Rate: number;
  bestStreak: number;
  currentStreak: number;
}

