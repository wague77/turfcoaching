
/**
 * Turf-Coaching Logic - Combination Reducer for Horse Racing
 * Advanced methodology for Tiercé, Quarté and Quinté optimization
 */

export interface Horse {
  number: number;
  name: string;
  odds: number;
  citations: number; // How many times cited by press
  isTocard: boolean;
  isFavorite: boolean;
}

export interface Combination {
  horses: number[];
  panier: string;
  groupe: string;
  simulator: string;
  hasConsecutive: boolean;
  consecutiveType: string; // 'serie2', 'serie3', 'no-serie'
}

export interface RaceData {
  date: string;
  name: string;
  venue: string;
  starters: number;
  betType: 'tierce' | 'quarte' | 'quinte';
  horses: Horse[];
}

export interface ModuleFilters {
  paniers: string[];
  groupes: string[];
  simulator: string[];
  chevauxHS: number[];
  favorisCount: { min: number; max: number } | null;
  tocardsCount: { min: number; max: number } | null;
  pronostic1: { horses: number[]; condition: 'auMoins' | 'juste' | 'auMax' | 'entre'; value: number; value2?: number } | null;
  pronostic2: { horses: number[]; condition: 'auMoins' | 'juste' | 'auMax' | 'entre'; value: number; value2?: number } | null;
  pressPronosticsCount: { condition: 'auMoins' | 'juste' | 'auMax' | 'entre'; value: number; value2?: number } | null;
  eliminateSerie2: boolean;
  eliminateSerie3: boolean;
  eliminateNoSerie: boolean;
}

// Generate all possible combinations for a bet type
export function generateAllCombinations(starters: number, betType: 'tierce' | 'quarte' | 'quinte'): number[][] {
  const horses = Array.from({ length: starters }, (_, i) => i + 1);
  const combinationSize = betType === 'tierce' ? 3 : betType === 'quarte' ? 4 : 5;
  
  const combinations: number[][] = [];
  
  function combine(start: number, current: number[]) {
    if (current.length === combinationSize) {
      combinations.push([...current]);
      return;
    }
    for (let i = start; i <= starters; i++) {
      current.push(i);
      combine(i + 1, current);
      current.pop();
    }
  }
  
  combine(1, []);
  return combinations;
}

// Calculate factorial
function factorial(n: number): number {
  if (n <= 1) return 1;
  return n * factorial(n - 1);
}

// Calculate number of combinations (C(n,k))
export function calculateCombinationsCount(n: number, k: number): number {
  if (k > n) return 0;
  return factorial(n) / (factorial(k) * factorial(n - k));
}

// Assign a Panier (P12-P30, PX) to a combination based on horse analysis
export function assignPanier(combination: number[], horses: Horse[]): string {
  const combHorses = combination.map(num => horses.find(h => h.number === num)!).filter(Boolean);
  
  if (combHorses.length === 0) return 'PX';
  
  // Calculate combination score based on odds and citations
  const avgOdds = combHorses.reduce((sum, h) => sum + (h?.odds || 50), 0) / combHorses.length;
  const avgCitations = combHorses.reduce((sum, h) => sum + (h?.citations || 0), 0) / combHorses.length;
  
  // Score calculation: lower odds and higher citations = higher panier
  const score = (100 - avgOdds) + (avgCitations * 2);
  
  // Map score to panier (P12-P30)
  if (score > 80) return 'P30';
  if (score > 70) return 'P29';
  if (score > 60) return 'P28';
  if (score > 50) return 'P27';
  if (score > 40) return 'P26';
  if (score > 30) return 'P25';
  if (score > 20) return 'P24';
  if (score > 15) return 'P23';
  if (score > 10) return 'P22';
  if (score > 5) return 'P21';
  if (score > 0) return 'P20';
  if (score > -10) return 'P19';
  if (score > -20) return 'P18';
  if (score > -30) return 'P17';
  if (score > -40) return 'P16';
  if (score > -50) return 'P15';
  if (score > -60) return 'P14';
  if (score > -70) return 'P13';
  if (score > -80) return 'P12';
  return 'PX';
}

// Assign a Groupe (G1-G7) based on press citations
export function assignGroupe(combination: number[], horses: Horse[]): string {
  const combHorses = combination.map(num => horses.find(h => h.number === num)!).filter(Boolean);
  
  if (combHorses.length === 0) return 'G4';
  
  const totalCitations = combHorses.reduce((sum, h) => sum + (h?.citations || 0), 0);
  
  // Map citations to groupe
  if (totalCitations >= 30) return 'G7';
  if (totalCitations >= 25) return 'G6';
  if (totalCitations >= 20) return 'G5';
  if (totalCitations >= 15) return 'G4';
  if (totalCitations >= 10) return 'G3';
  if (totalCitations >= 5) return 'G2';
  return 'G1';
}

// Assign a Simulator tranche (S90, S75, S55, S20, S3) based on betting simulation
export function assignSimulator(combination: number[], horses: Horse[]): string {
  const combHorses = combination.map(num => horses.find(h => h.number === num)!).filter(Boolean);
  
  if (combHorses.length === 0) return 'S20';
  
  // Simulate betting popularity based on odds (lower odds = more popular)
  const avgOdds = combHorses.reduce((sum, h) => sum + (h?.odds || 50), 0) / combHorses.length;
  
  if (avgOdds <= 5) return 'S90';
  if (avgOdds <= 10) return 'S75';
  if (avgOdds <= 20) return 'S55';
  if (avgOdds <= 40) return 'S20';
  return 'S3';
}

// Check for consecutive numbers in combination
export function checkConsecutive(combination: number[]): { hasConsecutive: boolean; type: string } {
  const sorted = [...combination].sort((a, b) => a - b);
  
  let maxConsecutive = 1;
  let currentConsecutive = 1;
  
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === sorted[i - 1] + 1) {
      currentConsecutive++;
      maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
    } else {
      currentConsecutive = 1;
    }
  }
  
  if (maxConsecutive >= 5) return { hasConsecutive: true, type: 'serie5' };
  if (maxConsecutive >= 4) return { hasConsecutive: true, type: 'serie4' };
  if (maxConsecutive >= 3) return { hasConsecutive: true, type: 'serie3' };
  if (maxConsecutive >= 2) return { hasConsecutive: true, type: 'serie2' };
  return { hasConsecutive: false, type: 'no-serie' };
}

// Process all combinations with metadata
export function processAllCombinations(
  combinations: number[][],
  horses: Horse[]
): Combination[] {
  return combinations.map(combo => {
    const consecutive = checkConsecutive(combo);
    return {
      horses: combo,
      panier: assignPanier(combo, horses),
      groupe: assignGroupe(combo, horses),
      simulator: assignSimulator(combo, horses),
      hasConsecutive: consecutive.hasConsecutive,
      consecutiveType: consecutive.type
    };
  });
}

// Count horses matching a condition
function countMatchingHorses(combination: number[], targetHorses: number[]): number {
  return combination.filter(h => targetHorses.includes(h)).length;
}

// Check if count matches condition
function matchesCondition(
  count: number,
  condition: 'auMoins' | 'juste' | 'auMax' | 'entre' | 'aucun',
  value: number,
  value2?: number
): boolean {
  switch (condition) {
    case 'auMoins':
      return count >= value;
    case 'juste':
      return count === value;
    case 'auMax':
      return count <= value;
    case 'entre':
      return count >= value && count <= (value2 || value);
    case 'aucun':
      return count === 0;
    default:
      return true;
  }
}

// Apply all filters to combinations
export function applyFilters(
  combinations: Combination[],
  filters: ModuleFilters,
  horses: Horse[]
): Combination[] {
  let filtered = [...combinations];
  
  // Filter by Paniers
  if (filters.paniers.length > 0) {
    filtered = filtered.filter(c => filters.paniers.includes(c.panier));
  }
  
  // Filter by Groupes
  if (filters.groupes.length > 0) {
    filtered = filtered.filter(c => filters.groupes.includes(c.groupe));
  }
  
  // Filter by Simulator
  if (filters.simulator.length > 0) {
    filtered = filtered.filter(c => filters.simulator.includes(c.simulator));
  }
  
  // Filter out Chevaux HS (eliminated horses)
  if (filters.chevauxHS.length > 0) {
    filtered = filtered.filter(c => 
      !c.horses.some(h => filters.chevauxHS.includes(h))
    );
  }
  
  // Filter by Favorites count
  if (filters.favorisCount) {
    const favorites = horses.filter(h => h.isFavorite).map(h => h.number);
    filtered = filtered.filter(c => {
      const count = countMatchingHorses(c.horses, favorites);
      return count >= filters.favorisCount!.min && count <= filters.favorisCount!.max;
    });
  }
  
  // Filter by Tocards count
  if (filters.tocardsCount) {
    const tocards = horses.filter(h => h.isTocard).map(h => h.number);
    filtered = filtered.filter(c => {
      const count = countMatchingHorses(c.horses, tocards);
      return count >= filters.tocardsCount!.min && count <= filters.tocardsCount!.max;
    });
  }
  
  // Filter by Pronostic 1
  if (filters.pronostic1 && filters.pronostic1.horses.length > 0) {
    filtered = filtered.filter(c => {
      const count = countMatchingHorses(c.horses, filters.pronostic1!.horses);
      return matchesCondition(
        count,
        filters.pronostic1!.condition,
        filters.pronostic1!.value,
        filters.pronostic1!.value2
      );
    });
  }
  
  // Filter by Pronostic 2
  if (filters.pronostic2 && filters.pronostic2.horses.length > 0) {
    filtered = filtered.filter(c => {
      const count = countMatchingHorses(c.horses, filters.pronostic2!.horses);
      return matchesCondition(
        count,
        filters.pronostic2!.condition,
        filters.pronostic2!.value,
        filters.pronostic2!.value2
      );
    });
  }
  
  // Filter by consecutive numbers
  if (filters.eliminateSerie2) {
    filtered = filtered.filter(c => c.consecutiveType !== 'serie2');
  }
  if (filters.eliminateSerie3) {
    filtered = filtered.filter(c => !['serie3', 'serie4', 'serie5'].includes(c.consecutiveType));
  }
  if (filters.eliminateNoSerie) {
    filtered = filtered.filter(c => c.consecutiveType !== 'no-serie');
  }
  
  return filtered;
}

// Get panier statistics
export function getPanierStats(combinations: Combination[]): Map<string, number> {
  const stats = new Map<string, number>();
  const paniers = ['PX', 'P12', 'P13', 'P14', 'P15', 'P16', 'P17', 'P18', 'P19', 'P20', 
                   'P21', 'P22', 'P23', 'P24', 'P25', 'P26', 'P27', 'P28', 'P29', 'P30'];
  
  paniers.forEach(p => stats.set(p, 0));
  combinations.forEach(c => {
    stats.set(c.panier, (stats.get(c.panier) || 0) + 1);
  });
  
  return stats;
}

// Get groupe statistics
export function getGroupeStats(combinations: Combination[]): Map<string, number> {
  const stats = new Map<string, number>();
  const groupes = ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7'];
  
  groupes.forEach(g => stats.set(g, 0));
  combinations.forEach(c => {
    stats.set(c.groupe, (stats.get(c.groupe) || 0) + 1);
  });
  
  return stats;
}

// Get simulator statistics
export function getSimulatorStats(combinations: Combination[]): Map<string, number> {
  const stats = new Map<string, number>();
  const tranches = ['S90', 'S75', 'S55', 'S20', 'S3'];
  
  tranches.forEach(s => stats.set(s, 0));
  combinations.forEach(c => {
    stats.set(c.simulator, (stats.get(c.simulator) || 0) + 1);
  });
  
  return stats;
}

// Generate suggested paniers based on race analysis
export function getSuggestedPaniers(horses: Horse[]): string[] {
  const avgOdds = horses.reduce((sum, h) => sum + h.odds, 0) / horses.length;
  
  // Easy race (low odds favorites)
  if (avgOdds < 15) {
    return ['P26', 'P27', 'P28'];
  }
  // Moderate race
  if (avgOdds < 25) {
    return ['P24', 'P25', 'P26'];
  }
  // Open race
  return ['P21', 'P22', 'P23'];
}

// Generate suggested groupes
export function getSuggestedGroupes(horses: Horse[]): string[] {
  const totalCitations = horses.reduce((sum, h) => sum + h.citations, 0);
  const avgCitations = totalCitations / horses.length;
  
  if (avgCitations > 5) {
    return ['G4', 'G5', 'G6'];
  }
  if (avgCitations > 3) {
    return ['G3', 'G4', 'G5'];
  }
  return ['G2', 'G3', 'G4'];
}

// Generate suggested simulator tranches
export function getSuggestedSimulator(horses: Horse[]): string[] {
  const avgOdds = horses.reduce((sum, h) => sum + h.odds, 0) / horses.length;
  
  if (avgOdds < 10) {
    return ['S90', 'S75'];
  }
  if (avgOdds < 20) {
    return ['S75', 'S55'];
  }
  return ['S55', 'S20'];
}

// Get race difficulty assessment
export function getRaceDifficulty(horses: Horse[]): { label: 'facile' | 'moyenne' | 'difficile'; index: number } {
  if (horses.length === 0) return { label: 'moyenne', index: 5 };
  
  const avgOdds = horses.reduce((sum, h) => sum + h.odds, 0) / horses.length;
  const lowOddsCount = horses.filter(h => h.odds < 5).length;
  const favoriteSpread = horses.filter(h => h.isFavorite).length;
  
  // Calculate difficulty index (1-10 scale)
  let index = 5; // Default medium
  
  if (lowOddsCount >= 3 && avgOdds < 15) {
    // Easy race: clear favorites
    index = Math.max(1, 4 - lowOddsCount);
    return { label: 'facile', index };
  }
  if (lowOddsCount >= 1 && avgOdds < 25) {
    // Medium race
    index = 4 + Math.min(3, Math.floor((avgOdds - 15) / 5));
    return { label: 'moyenne', index };
  }
  // Difficult race: no clear favorites
  index = 7 + Math.min(3, Math.floor((avgOdds - 25) / 10));
  return { label: 'difficile', index };
}

// Calculate bet cost
export function calculateBetCost(combinationsCount: number, betType: 'tierce' | 'quarte' | 'quinte'): number {
  // 1€ per combination is standard
  return combinationsCount;
}

