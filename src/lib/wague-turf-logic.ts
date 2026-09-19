
/**
 * WAGUE-TURF Logic - Expert PMU Analysis Engine
 * 60 ans d'expertise turfiste condensés en algorithmes
 */

import { PMUHorse } from '@/lib/pmu-api';

// Top drivers/jockeys bonus list
const TOP_DRIVERS = [
  'bonne', 'abrivard', 'bazire', 'nivard', 'gelormini',
  'ouvrie', 'monclin', 'raffin', 'lebourgeois', 'guelpa',
  'lecanu', 'martens', 'verbeeck', 'vernichon', 'lagadeuc',
  'blondel', 'masure', 'piton', 'balu', 'rochard'
];

export interface WagueTurfHorse {
  numero: number;
  name: string;
  cote: number;
  musique: string;
  driver: string;
  trainer: string;
  gainsCareer: number;
  gainsCurrentYear: number;
  numberOfRaces: number;
  numberOfWins: number;
  numberOfPlaces: number;
  forme: number[]; // parsed musique positions
  note: number; // computed score
  noteDetails: NoteDetails;
  category: 'base' | 'outsider' | 'tocard' | 'neutre';
  isFauxFavori: boolean;
  valueBet: boolean;
  estimatedProba: number;
  valueRatio: number; // cote / (1/proba) - >1 = value
}

export interface NoteDetails {
  baseCote: number;
  bonusForme: number;
  bonusGains: number;
  bonusDriver: number;
  penalitePosition: number;
  bonusVictoire: number;
  total: number;
}

export interface Couple {
  horses: [number, number];
  sommeCotes: number;
  difficulty: 'facile' | 'moyen' | 'difficile';
  note: number;
}

export interface WagueTurfResult {
  horses: WagueTurfHorse[];
  tierce: WagueTurfHorse[];
  quinte: WagueTurfHorse[];
  topOutsiders: WagueTurfHorse[];
  topTocards: WagueTurfHorse[];
  couples: Couple[];
  valueBets: WagueTurfHorse[];
  fauxFavoris: WagueTurfHorse[];
  commentaire: string;
}

// Parse musique to extract positions
function parseForme(musique: string): number[] {
  if (!musique) return [];
  const cleaned = musique.replace(/\([^)]*\)/g, '');
  const positions: number[] = [];
  const parts = cleaned.split(/[-/]/);
  for (const part of parts) {
    const trimmed = part.trim();
    // Handle 'D' (disqualifié), 'A' (arrêté), 'T' (tombé) as bad results
    if (/^[DAT]/i.test(trimmed)) {
      positions.push(99);
      continue;
    }
    const match = trimmed.match(/^(\d+)/);
    if (match) {
      positions.push(parseInt(match[1], 10));
    }
  }
  return positions.slice(0, 6);
}

// Count victories (position 1) in recent form
function countVictoires(forme: number[]): number {
  return forme.filter(p => p === 1).length;
}

// Count podiums (top 3) in recent form
function countPodiums(forme: number[]): number {
  return forme.filter(p => p >= 1 && p <= 3).length;
}

// Check for recent good form (DA/2a pattern - top 2 recently)
function hasRecentGoodForm(forme: number[]): boolean {
  if (forme.length === 0) return false;
  return forme.slice(0, 3).some(p => p >= 1 && p <= 3);
}

// Calculate note for a horse
function calculateNote(horse: PMUHorse, forme: number[]): NoteDetails {
  const cote = horse.lastDirectRatio > 0 ? horse.lastDirectRatio : horse.cote || 50;
  
  // Base: 1/cote component (higher for low odds)
  const baseCote = Math.round((1 / Math.max(cote, 1)) * 100 * 10) / 10;
  
  // Bonus forme: count of '1' in recent form * weight
  const victoires = countVictoires(forme);
  const podiums = countPodiums(forme);
  const bonusForme = victoires * 3 + podiums * 1.5;
  
  // Bonus gains
  const totalGains = (horse.gainsCareer || 0) + (horse.gainsCurrentYear || 0);
  const bonusGains = Math.min(Math.round(totalGains / 10000) / 10, 5); // Cap at 5
  
  // Bonus driver top5
  const driverName = (horse.driver || '').toLowerCase();
  const isTopDriver = TOP_DRIVERS.some(d => driverName.includes(d));
  const bonusDriver = isTopDriver ? 2 : 0;
  
  // Pénalité position (handicap weight, high number = penalty)
  const penalitePosition = horse.handicapWeight > 0 ? Math.max(0, (horse.handicapWeight - 55) * 0.3) : 0;
  
  // Bonus victoire meeting (consecutive wins)
  const winRate = horse.numberOfRaces > 0 ? horse.numberOfWins / horse.numberOfRaces : 0;
  const bonusVictoire = winRate > 0.2 ? 2 : winRate > 0.1 ? 1 : 0;
  
  const total = Math.round((baseCote + bonusForme + bonusGains + bonusDriver + bonusVictoire - penalitePosition) * 10) / 10;
  
  return {
    baseCote,
    bonusForme,
    bonusGains,
    bonusDriver,
    penalitePosition,
    bonusVictoire,
    total
  };
}

// Estimate probability (Poisson-like approximation)
function estimateProba(note: number, totalNotes: number): number {
  if (totalNotes <= 0) return 0.05;
  return Math.max(0.01, Math.min(0.95, note / totalNotes));
}

// Generate commentary
function generateCommentaire(result: Omit<WagueTurfResult, 'commentaire'>): string {
  const lines: string[] = [];
  
  // Favorites analysis
  const top3 = result.tierce;
  if (top3.length >= 3) {
    lines.push(`🏆 TIERCÉ SUGGÉRÉ: ${top3.map(h => `N°${h.numero} ${h.name}`).join(' - ')}`);
    lines.push('');
  }
  
  // Faux favoris warning
  if (result.fauxFavoris.length > 0) {
    lines.push(`⚠️ FAUX FAVORIS DÉTECTÉS:`);
    result.fauxFavoris.forEach(h => {
      lines.push(`  → N°${h.numero} ${h.name} (cote ${h.cote.toFixed(1)}) - Note faible ${h.note.toFixed(1)} malgré une cote basse. DOUTEUX, éviter en base!`);
    });
    lines.push('');
  }
  
  // Strategy
  const avgTopNote = top3.reduce((s, h) => s + h.note, 0) / Math.max(top3.length, 1);
  if (avgTopNote > 10) {
    lines.push(`✅ STRATÉGIE: Course abordable. Les favoris sont FIABLES. Jouer en base solide avec 1-2 outsiders.`);
  } else if (avgTopNote > 6) {
    lines.push(`⚡ STRATÉGIE: Course ouverte. Privilégier les outsiders value. Élargir la base à 3-4 chevaux.`);
  } else {
    lines.push(`🔴 STRATÉGIE: Course très ouverte/piégeuse. Jouer large ou passer. Les tocards peuvent surprendre.`);
  }
  
  // Value bets
  if (result.valueBets.length > 0) {
    lines.push('');
    lines.push(`💰 VALUE BETS (cote > proba réelle):`);
    result.valueBets.slice(0, 3).forEach(h => {
      lines.push(`  → N°${h.numero} ${h.name} - Cote ${h.cote.toFixed(1)} vs proba estimée ${(h.estimatedProba * 100).toFixed(0)}% (ratio ${h.valueRatio.toFixed(2)})`);
    });
  }
  
  // Top outsiders
  if (result.topOutsiders.length > 0) {
    lines.push('');
    lines.push(`🎯 TOP OUTSIDERS (cotes 8-15, note > moyenne):`);
    result.topOutsiders.forEach(h => {
      lines.push(`  → N°${h.numero} ${h.name} - Cote ${h.cote.toFixed(1)}, Note ${h.note.toFixed(1)}`);
    });
  }
  
  return lines.join('\n');
}

// Main analysis function
export function analyzeWagueTurf(pmuHorses: PMUHorse[]): WagueTurfResult {
  // Build horses with notes
  const horses: WagueTurfHorse[] = pmuHorses
    .filter(h => h.numero > 0)
    .map(h => {
      const forme = parseForme(h.musique);
      const cote = h.lastDirectRatio > 0 ? h.lastDirectRatio : h.cote || 50;
      const noteDetails = calculateNote(h, forme);
      
      return {
        numero: h.numero,
        name: h.name || `Cheval ${h.numero}`,
        cote,
        musique: h.musique || '',
        driver: h.driver || '',
        trainer: h.trainer || '',
        gainsCareer: h.gainsCareer || 0,
        gainsCurrentYear: h.gainsCurrentYear || 0,
        numberOfRaces: h.numberOfRaces || 0,
        numberOfWins: h.numberOfWins || 0,
        numberOfPlaces: h.numberOfPlaces || 0,
        forme,
        note: noteDetails.total,
        noteDetails,
        category: 'neutre' as const,
        isFauxFavori: false,
        valueBet: false,
        estimatedProba: 0,
        valueRatio: 0,
      };
    });
  
  // Calculate total notes for probability estimation
  const totalNotes = horses.reduce((s, h) => s + Math.max(h.note, 0.1), 0);
  
  // Assign probabilities and value
  horses.forEach(h => {
    h.estimatedProba = estimateProba(Math.max(h.note, 0.1), totalNotes);
    const impliedProba = 1 / Math.max(h.cote, 1);
    h.valueRatio = Math.round((h.estimatedProba / impliedProba) * 100) / 100;
    h.valueBet = h.valueRatio > 1.3 && h.cote >= 5;
  });
  
  // Sort by note descending
  horses.sort((a, b) => b.note - a.note);
  
  // Assign categories
  const avgNote = totalNotes / Math.max(horses.length, 1);
  horses.forEach((h, idx) => {
    if (idx < 3 && h.note >= avgNote) {
      h.category = 'base';
    } else if (h.cote >= 8 && h.cote <= 15 && h.note >= avgNote * 0.8) {
      h.category = 'outsider';
    } else if (h.cote > 15) {
      h.category = 'tocard';
    } else {
      h.category = 'neutre';
    }
  });
  
  // Detect faux favoris (low odds but low note)
  const sortedByCote = [...horses].sort((a, b) => a.cote - b.cote);
  sortedByCote.slice(0, 5).forEach(h => {
    if (h.note < avgNote * 0.7) {
      h.isFauxFavori = true;
    }
  });
  
  // Build results
  const tierce = horses.slice(0, 3);
  
  // Quinté: 2 bases + 3 outsiders value > 1.5
  const bases = horses.filter(h => h.category === 'base').slice(0, 2);
  const outsidersForQuinte = horses
    .filter(h => h.category !== 'base' && h.valueRatio >= 1.2)
    .sort((a, b) => b.valueRatio - a.valueRatio)
    .slice(0, 3);
  const quinte = [...bases, ...outsidersForQuinte].slice(0, 5);
  // If not enough, fill with top remaining
  if (quinte.length < 5) {
    const used = new Set(quinte.map(h => h.numero));
    const remaining = horses.filter(h => !used.has(h.numero));
    while (quinte.length < 5 && remaining.length > 0) {
      quinte.push(remaining.shift()!);
    }
  }
  
  // Top 4 outsiders: cotes 8-15, note > moyenne
  const topOutsiders = horses
    .filter(h => h.cote >= 8 && h.cote <= 15 && h.note >= avgNote * 0.7)
    .sort((a, b) => b.note - a.note)
    .slice(0, 4);
  
  // Top 4 tocards: cotes > 15, recent good form
  const topTocards = horses
    .filter(h => h.cote > 15 && hasRecentGoodForm(h.forme))
    .sort((a, b) => b.note - a.note)
    .slice(0, 4);
  // If not enough tocards with good form, add highest-noted tocards
  if (topTocards.length < 4) {
    const usedNums = new Set(topTocards.map(h => h.numero));
    const extraTocards = horses
      .filter(h => h.cote > 15 && !usedNums.has(h.numero))
      .sort((a, b) => b.note - a.note);
    while (topTocards.length < 4 && extraTocards.length > 0) {
      topTocards.push(extraTocards.shift()!);
    }
  }
  
  // Value bets
  const valueBets = horses
    .filter(h => h.valueBet)
    .sort((a, b) => b.valueRatio - a.valueRatio);
  
  // Faux favoris
  const fauxFavoris = horses.filter(h => h.isFauxFavori);
  
  // Generate 10 best couples
  const allCouples: Couple[] = [];
  const top10 = horses.slice(0, 10);
  for (let i = 0; i < top10.length; i++) {
    for (let j = i + 1; j < top10.length; j++) {
      const h1 = top10[i], h2 = top10[j];
      const sommeCotes = h1.cote + h2.cote;
      const difficulty: Couple['difficulty'] = sommeCotes < 10 ? 'facile' : sommeCotes < 20 ? 'moyen' : 'difficile';
      allCouples.push({
        horses: [h1.numero, h2.numero],
        sommeCotes: Math.round(sommeCotes * 10) / 10,
        difficulty,
        note: Math.round((h1.note + h2.note) * 10) / 10,
      });
    }
  }
  allCouples.sort((a, b) => b.note - a.note);
  const couples = allCouples.slice(0, 10);
  
  const partialResult = { horses, tierce, quinte, topOutsiders, topTocards, couples, valueBets, fauxFavoris };
  const commentaire = generateCommentaire(partialResult);
  
  return { ...partialResult, commentaire };
}

