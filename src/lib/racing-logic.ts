
import { Discipline, Horse, AnalysisResult, RawHorseData } from '@/types/racing';

// Parse musique string to extract numeric results
export function parseMusiqueToNumbers(musique: string): number[] {
  // Remove parenthetical content like (24), then extract digits
  const cleaned = musique.replace(/\([^)]*\)/g, '');
  const items: number[] = [];
  
  // Split by common separators and extract numbers
  const parts = cleaned.split(/[-/]/);
  for (const part of parts) {
    const match = part.match(/\d+/);
    if (match) {
      items.push(parseInt(match[0], 10));
    }
  }
  
  return items.slice(0, 6); // Only consider last 6 results
}

// Score cote (lower is better, scored higher)
export function scoreCote(cote: number): number {
  if (cote <= 3) return 100;
  if (cote <= 5) return 90;
  if (cote <= 8) return 75;
  if (cote <= 12) return 60;
  if (cote <= 20) return 40;
  if (cote <= 35) return 25;
  return 10;
}

// Score musique pure (based on recent performance)
export function scoreMusiquepur(items: number[], discipline: Discipline): number {
  if (items.length === 0) return 0;
  
  let score = 0;
  const weights = [1.5, 1.3, 1.1, 1.0, 0.9, 0.8]; // More recent = more weight
  
  for (let i = 0; i < items.length && i < 6; i++) {
    const place = items[i];
    const weight = weights[i] || 0.8;
    
    let placeScore = 0;
    
    switch (discipline) {
      case 'plat':
        if (place === 1) placeScore = 100;
        else if (place === 2) placeScore = 85;
        else if (place === 3) placeScore = 70;
        else if (place === 4) placeScore = 55;
        else if (place === 5) placeScore = 40;
        else if (place <= 8) placeScore = 25;
        else placeScore = 10;
        break;
        
      case 'trot':
        if (place === 0) placeScore = 0; // Disqualified
        else if (place === 1) placeScore = 100;
        else if (place === 2) placeScore = 80;
        else if (place === 3) placeScore = 65;
        else if (place === 4) placeScore = 50;
        else if (place === 5) placeScore = 35;
        else if (place <= 8) placeScore = 20;
        else placeScore = 5;
        break;
        
      case 'obstacle':
        if (place === 1) placeScore = 100;
        else if (place === 2) placeScore = 82;
        else if (place === 3) placeScore = 68;
        else if (place === 4) placeScore = 52;
        else if (place === 5) placeScore = 38;
        else if (place <= 8) placeScore = 22;
        else placeScore = 8;
        break;
    }
    
    score += placeScore * weight;
  }
  
  // Normalize to 0-100
  const maxPossible = weights.slice(0, items.length).reduce((a, b) => a + b, 0) * 100;
  return Math.round((score / maxPossible) * 100);
}

// Adjusted musique score (combines cote and musique)
export function scoreMusiqueAjuste(scoreCote: number, scoreMusique: number): number {
  // 60% musique, 40% cote influence
  return Math.round(scoreMusique * 0.6 + scoreCote * 0.4);
}

// Determine label based on scores
export function determineLabel(horse: Horse, allHorses: Horse[]): Horse['label'] {
  const sortedByCote = [...allHorses].sort((a, b) => b.scoreCote - a.scoreCote);
  const sortedByMusique = [...allHorses].sort((a, b) => b.scoreMusique - a.scoreMusique);
  
  const coteRank = sortedByCote.findIndex(h => h.numero === horse.numero) + 1;
  const musiqueRank = sortedByMusique.findIndex(h => h.numero === horse.numero) + 1;
  
  // BASE: top 3 in both cote and musique
  if (coteRank <= 3 && musiqueRank <= 5) return 'BASE';
  
  // OUTSIDER: low cote rank but good musique
  if (coteRank > 5 && musiqueRank <= 4) return 'OUTSIDER';
  
  // DOUTEUX: high cote (favorite) but poor musique
  if (coteRank <= 3 && musiqueRank > 6) return 'DOUTEUX';
  
  return 'NEUTRE';
}

// Determine verdict for favorites
export function determineVerdict(horse: Horse, allHorses: Horse[]): Horse['verdict'] {
  const sortedByCote = [...allHorses].sort((a, b) => a.cote - b.cote);
  const coteRank = sortedByCote.findIndex(h => h.numero === horse.numero) + 1;
  
  if (coteRank > 3) return undefined; // Only favorites get verdict
  
  const sortedByMusique = [...allHorses].sort((a, b) => b.scoreMusique - a.scoreMusique);
  const musiqueRank = sortedByMusique.findIndex(h => h.numero === horse.numero) + 1;
  
  // FIABLE: favorite with strong musique backing
  if (musiqueRank <= 4 && horse.scoreMusique >= 60) return 'FIABLE';
  
  // FAUX_FAVORI: high favorite with poor musique
  if (musiqueRank > 6 || horse.scoreMusique < 40) return 'FAUX_FAVORI';
  
  return 'DOUTEUX';
}

// Calculate difficulty based on score spread
export function calculateDifficulty(horses: Horse[]): { level: 'easy' | 'medium' | 'hard'; score: number } {
  if (horses.length < 3) return { level: 'hard', score: 0 };
  
  const sorted = [...horses].sort((a, b) => b.scoreTotal - a.scoreTotal);
  const top3Scores = sorted.slice(0, 3).map(h => h.scoreTotal);
  
  // Calculate spread between top horses
  const spread = top3Scores[0] - top3Scores[2];
  const avgTop3 = top3Scores.reduce((a, b) => a + b, 0) / 3;
  
  // Count how many horses are close to the leader
  const closeHorses = sorted.filter(h => sorted[0].scoreTotal - h.scoreTotal < 15).length;
  
  const difficultyScore = Math.round(100 - spread - (closeHorses > 4 ? 20 : 0) + (avgTop3 > 70 ? 10 : 0));
  
  if (spread > 20 && closeHorses <= 3) return { level: 'easy', score: difficultyScore };
  if (spread > 10 && closeHorses <= 5) return { level: 'medium', score: difficultyScore };
  return { level: 'hard', score: difficultyScore };
}

// Generate unique pairs from top 8
export function generateCouples(topHorses: Horse[]): string[] {
  const couples: string[] = [];
  const top8 = topHorses.slice(0, 8);
  
  for (let i = 0; i < top8.length; i++) {
    for (let j = i + 1; j < top8.length; j++) {
      const pair = [top8[i].numero, top8[j].numero].sort((a, b) => a - b);
      couples.push(`${pair[0]}-${pair[1]}`);
    }
  }
  
  return couples;
}

// Parse input data
export function parseHorseData(input: string): RawHorseData[] {
  const lines = input.trim().split('\n').filter(line => line.trim());
  const horses: RawHorseData[] = [];
  
  for (const line of lines) {
    const parts = line.trim().split(/\s+/);
    if (parts.length >= 3) {
      const numero = parseInt(parts[0], 10);
      const cote = parseFloat(parts[1].replace(',', '.'));
      const musique = parts.slice(2).join('');
      
      if (!isNaN(numero) && !isNaN(cote)) {
        horses.push({ numero, cote, musique });
      }
    }
  }
  
  return horses;
}

// Main analysis function
export function analyzeRace(rawData: RawHorseData[], discipline: Discipline): AnalysisResult {
  // First pass: calculate base scores
  let horses: Horse[] = rawData.map(raw => {
    const musicItems = parseMusiqueToNumbers(raw.musique);
    const coteScore = scoreCote(raw.cote);
    const musiqueScore = scoreMusiquepur(musicItems, discipline);
    const adjustedScore = scoreMusiqueAjuste(coteScore, musiqueScore);
    
    return {
      numero: raw.numero,
      name: raw.name,
      cote: raw.cote,
      musique: raw.musique,
      musicItems,
      scoreCote: coteScore,
      scoreMusique: musiqueScore,
      scoreMusiqueAjuste: adjustedScore,
      scoreTotal: Math.round((coteScore + musiqueScore + adjustedScore) / 3),
      label: 'NEUTRE' as const,
      hasWon: musicItems.includes(1),
      winPositions: musicItems.map((item, idx) => item === 1 ? idx + 1 : -1).filter(p => p > 0),
    };
  });
  
  // Second pass: determine labels
  horses = horses.map(horse => ({
    ...horse,
    label: determineLabel(horse, horses),
  }));
  
  // Third pass: determine verdicts for favorites
  horses = horses.map(horse => ({
    ...horse,
    verdict: determineVerdict(horse, horses),
  }));
  
  // Sort by different criteria
  const topByCote = [...horses].sort((a, b) => a.cote - b.cote).slice(0, 8);
  const topByMusique = [...horses].sort((a, b) => b.scoreMusique - a.scoreMusique).slice(0, 8);
  const topAjuste = [...horses].sort((a, b) => b.scoreMusiqueAjuste - a.scoreMusiqueAjuste).slice(0, 8);
  
  // Get favorites (top 3 by cote)
  const favorites = [...horses].sort((a, b) => a.cote - b.cote).slice(0, 3);
  
  // Get previous winners
  const winners = horses.filter(h => h.hasWon).sort((a, b) => a.cote - b.cote);
  
  // Generate couples from adjusted top 8
  const couples = generateCouples(topAjuste);
  
  // Calculate difficulty
  const { level: difficulty, score: difficultyScore } = calculateDifficulty(horses);
  
  return {
    horses: [...horses].sort((a, b) => b.scoreTotal - a.scoreTotal),
    topByCote,
    topByMusique,
    topAjuste,
    couples,
    difficulty,
    difficultyScore,
    favorites,
    winners,
  };
}

// Demo data (N° Rapp.Direct Musique)
export const DEMO_DATA = `1 2.5 1-3-2-1-4-2
2 4.8 5-2-3-1-6-4
3 7.2 2-1-8-3-2-1
4 3.8 3-4-2-5-1-3
5 12.5 7-6-4-8-5-2
6 1.8 1-1-2-1-3-2
7 18.0 4-5-6-3-7-4
8 5.2 2-3-1-4-2-5
9 25.0 8-7-6-5-9-8
10 3.2 3-2-4-1-2-3
11 14.5 6-4-5-7-3-6
12 4.0 1-2-3-2-4-1`;

