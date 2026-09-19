
import { useState, useEffect, useCallback } from 'react';

export interface CarreMagiqueEntry {
  id: string;
  timestamp: number;
  raceName?: string;
  baseNumero: number;
  baseName?: string;
  baseHasWon: boolean;
  associatedHorses: { numero: number; name?: string }[];
  couples: string[];
  tierces: string[]; // New: tiercé combinations
  // Results
  raceResult?: number[]; // Arrivée officielle
  evaluation?: {
    baseInTop3: boolean;
    baseInTop5: boolean;
    associatedInTop3: number[];
    associatedInTop5: number[];
    successRate: number;
    winningCouples: string[];
    winningTierces: string[]; // New: winning tiercés
  };
}

const STORAGE_KEY = 'carre_magique_history';
const MAX_ENTRIES = 50;

export const useCarreMagiqueHistory = () => {
  const [history, setHistory] = useState<CarreMagiqueEntry[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading Carré Magique history:', error);
    }
    setIsLoaded(true);
  }, []);

  // Save to localStorage
  const saveToStorage = useCallback((entries: CarreMagiqueEntry[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch (error) {
      console.error('Error saving Carré Magique history:', error);
    }
  }, []);

  // Add new entry
  const addEntry = useCallback((entry: Omit<CarreMagiqueEntry, 'id' | 'timestamp'>) => {
    const newEntry: CarreMagiqueEntry = {
      ...entry,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };

    setHistory(prev => {
      const updated = [newEntry, ...prev].slice(0, MAX_ENTRIES);
      saveToStorage(updated);
      return updated;
    });

    return newEntry.id;
  }, [saveToStorage]);

  // Update entry with results
  const updateEntryResult = useCallback((id: string, raceResult: number[]) => {
    setHistory(prev => {
      const updated = prev.map(entry => {
        if (entry.id !== id) return entry;

        // Calculate evaluation
        const top3 = raceResult.slice(0, 3);
        const top5 = raceResult.slice(0, 5);

        const baseInTop3 = top3.includes(entry.baseNumero);
        const baseInTop5 = top5.includes(entry.baseNumero);

        const associatedInTop3 = entry.associatedHorses
          .filter(h => top3.includes(h.numero))
          .map(h => h.numero);

        const associatedInTop5 = entry.associatedHorses
          .filter(h => top5.includes(h.numero))
          .map(h => h.numero);

        // Winning couples (base + associated in top 5)
        const winningCouples = entry.couples.filter(couple => {
          const [a, b] = couple.split('-').map(Number);
          return top5.includes(a) && top5.includes(b);
        });

        // Winning tiercés (all 3 horses in top 3, order matters for exact match)
        const winningTierces = (entry.tierces || []).filter(tierce => {
          const nums = tierce.split('-').map(Number);
          // Check if all 3 are in top 3
          return nums.every(n => top3.includes(n));
        });

        // Calculate success rate
        let successScore = 0;
        if (baseInTop3) successScore += 40;
        else if (baseInTop5) successScore += 20;
        successScore += associatedInTop3.length * 15;
        successScore += (associatedInTop5.length - associatedInTop3.length) * 5;
        if (winningTierces.length > 0) successScore += 20;
        const successRate = Math.min(100, successScore);

        return {
          ...entry,
          raceResult,
          evaluation: {
            baseInTop3,
            baseInTop5,
            associatedInTop3,
            associatedInTop5,
            successRate,
            winningCouples,
            winningTierces,
          },
        } as CarreMagiqueEntry;
      });

      saveToStorage(updated);
      return updated;
    });
  }, [saveToStorage]);

  // Delete entry
  const deleteEntry = useCallback((id: string) => {
    setHistory(prev => {
      const updated = prev.filter(e => e.id !== id);
      saveToStorage(updated);
      return updated;
    });
  }, [saveToStorage]);

  // Clear all
  const clearHistory = useCallback(() => {
    setHistory([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  // Get statistics
  const getStats = useCallback(() => {
    const evaluated = history.filter(e => e.evaluation);
    if (evaluated.length === 0) {
      return {
        total: history.length,
        evaluated: 0,
        avgSuccessRate: 0,
        baseInTop3Rate: 0,
        baseInTop5Rate: 0,
        winningCouplesRate: 0,
      };
    }

    const avgSuccessRate = evaluated.reduce((sum, e) => sum + (e.evaluation?.successRate || 0), 0) / evaluated.length;
    const baseInTop3Count = evaluated.filter(e => e.evaluation?.baseInTop3).length;
    const baseInTop5Count = evaluated.filter(e => e.evaluation?.baseInTop5).length;
    const winningCouplesCount = evaluated.filter(e => (e.evaluation?.winningCouples?.length || 0) > 0).length;

    return {
      total: history.length,
      evaluated: evaluated.length,
      avgSuccessRate: Math.round(avgSuccessRate),
      baseInTop3Rate: Math.round((baseInTop3Count / evaluated.length) * 100),
      baseInTop5Rate: Math.round((baseInTop5Count / evaluated.length) * 100),
      winningCouplesRate: Math.round((winningCouplesCount / evaluated.length) * 100),
    };
  }, [history]);

  return {
    history,
    isLoaded,
    addEntry,
    updateEntryResult,
    deleteEntry,
    clearHistory,
    getStats,
  };
};

