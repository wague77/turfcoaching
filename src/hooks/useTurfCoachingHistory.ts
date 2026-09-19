
import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'turf-coaching-history';
const MAX_HISTORY_ITEMS = 50;

export interface TurfCoachingHistoryEntry {
  id: string;
  createdAt: string;
  raceName?: string;
  betType: 'tierce' | 'quarte' | 'quinte';
  starters: number;
  totalCombinations: number;
  filteredCombinations: number;
  betCost: number;
  filtersApplied: {
    paniers: string[];
    groupes: string[];
    simulator: string[];
    chevauxHS: number[];
    hasFavorisFilter: boolean;
    hasTocardsFilter: boolean;
    hasPronosticFilter: boolean;
    hasConsecutifsFilter: boolean;
    hasGeneratorFilters: boolean;
  };
  arrivee: number[];
  winningCombinationsCount: number;
  isSuccess: boolean;
  successRate: number; // Percentage of filtered combis that were winners
  horsesData: Array<{
    number: number;
    name: string;
    odds: number;
    isFavorite: boolean;
    isTocard: boolean;
  }>;
}

export interface TurfCoachingStats {
  totalAnalyses: number;
  successCount: number;
  successRate: number;
  avgFilteredCombinations: number;
  avgBetCost: number;
  bestStreak: number;
  currentStreak: number;
  byBetType: {
    tierce: { total: number; success: number };
    quarte: { total: number; success: number };
    quinte: { total: number; success: number };
  };
}

export function useTurfCoachingHistory() {
  const [history, setHistory] = useState<TurfCoachingHistoryEntry[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load history from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setHistory(parsed);
      }
    } catch (error) {
      console.error('Failed to load Turf-Coaching history:', error);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save history to localStorage
  const saveHistory = useCallback((newHistory: TurfCoachingHistoryEntry[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
      setHistory(newHistory);
    } catch (error) {
      console.error('Failed to save Turf-Coaching history:', error);
    }
  }, []);

  // Add a new entry
  const addEntry = useCallback((entry: Omit<TurfCoachingHistoryEntry, 'id' | 'createdAt'>) => {
    const newEntry: TurfCoachingHistoryEntry = {
      ...entry,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };

    const newHistory = [newEntry, ...history].slice(0, MAX_HISTORY_ITEMS);
    saveHistory(newHistory);
    return newEntry.id;
  }, [history, saveHistory]);

  // Update an entry (e.g., add arrival)
  const updateEntry = useCallback((id: string, updates: Partial<TurfCoachingHistoryEntry>) => {
    const newHistory = history.map(entry =>
      entry.id === id ? { ...entry, ...updates } : entry
    );
    saveHistory(newHistory);
  }, [history, saveHistory]);

  // Delete an entry
  const deleteEntry = useCallback((id: string) => {
    const newHistory = history.filter(entry => entry.id !== id);
    saveHistory(newHistory);
  }, [history, saveHistory]);

  // Clear all history
  const clearHistory = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setHistory([]);
  }, []);

  // Calculate statistics
  const stats: TurfCoachingStats = {
    totalAnalyses: history.filter(h => h.arrivee.length > 0).length,
    successCount: history.filter(h => h.isSuccess).length,
    successRate: 0,
    avgFilteredCombinations: 0,
    avgBetCost: 0,
    bestStreak: 0,
    currentStreak: 0,
    byBetType: {
      tierce: { total: 0, success: 0 },
      quarte: { total: 0, success: 0 },
      quinte: { total: 0, success: 0 },
    },
  };

  if (stats.totalAnalyses > 0) {
    stats.successRate = (stats.successCount / stats.totalAnalyses) * 100;
    
    const withArrivee = history.filter(h => h.arrivee.length > 0);
    stats.avgFilteredCombinations = withArrivee.reduce((sum, h) => sum + h.filteredCombinations, 0) / withArrivee.length;
    stats.avgBetCost = withArrivee.reduce((sum, h) => sum + h.betCost, 0) / withArrivee.length;

    // Calculate streaks
    let currentStreak = 0;
    let bestStreak = 0;
    let tempStreak = 0;

    for (const entry of withArrivee) {
      if (entry.isSuccess) {
        tempStreak++;
        bestStreak = Math.max(bestStreak, tempStreak);
      } else {
        tempStreak = 0;
      }
    }

    // Current streak from most recent
    for (const entry of withArrivee) {
      if (entry.isSuccess) {
        currentStreak++;
      } else {
        break;
      }
    }

    stats.bestStreak = bestStreak;
    stats.currentStreak = currentStreak;

    // By bet type
    withArrivee.forEach(entry => {
      stats.byBetType[entry.betType].total++;
      if (entry.isSuccess) {
        stats.byBetType[entry.betType].success++;
      }
    });
  }

  return {
    history,
    stats,
    isLoaded,
    addEntry,
    updateEntry,
    deleteEntry,
    clearHistory,
  };
}

