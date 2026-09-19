
import { useState, useEffect, useCallback } from 'react';

export interface ConsensusHistoryEntry {
  id: string;
  timestamp: number;
  raceName?: string;
  consensusHorses: number[];
  arrivee: number[];
  couplesTotal: number;
  couplesSuccess: number;
  tiercesTotal: number;
  tiercesSuccess: number;
  successRate: number;
}

export interface ConsensusStats {
  totalRaces: number;
  avgSuccessRate: number;
  totalCouplesGenerated: number;
  totalCouplesWon: number;
  totalTiercesGenerated: number;
  totalTiercesWon: number;
  couplesWinRate: number;
  tiercesWinRate: number;
  bestStreak: number;
  currentStreak: number;
}

const STORAGE_KEY = 'consensus_history';
const MAX_ENTRIES = 50;

export const useConsensusHistory = () => {
  const [history, setHistory] = useState<ConsensusHistoryEntry[]>([]);

  // Load history from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading consensus history:', error);
    }
  }, []);

  // Save history to localStorage
  const saveHistory = useCallback((newHistory: ConsensusHistoryEntry[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
      setHistory(newHistory);
    } catch (error) {
      console.error('Error saving consensus history:', error);
    }
  }, []);

  // Add new entry
  const addEntry = useCallback((entry: Omit<ConsensusHistoryEntry, 'id' | 'timestamp' | 'successRate'>) => {
    const totalCombinations = entry.couplesTotal + entry.tiercesTotal;
    const totalSuccess = entry.couplesSuccess + entry.tiercesSuccess;
    const successRate = totalCombinations > 0 ? (totalSuccess / totalCombinations) * 100 : 0;

    const newEntry: ConsensusHistoryEntry = {
      ...entry,
      id: `consensus_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      successRate,
    };

    setHistory(prev => {
      const newHistory = [newEntry, ...prev].slice(0, MAX_ENTRIES);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
      return newHistory;
    });

    return newEntry;
  }, []);

  // Delete entry
  const deleteEntry = useCallback((id: string) => {
    setHistory(prev => {
      const newHistory = prev.filter(entry => entry.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
      return newHistory;
    });
  }, []);

  // Clear all history
  const clearHistory = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setHistory([]);
  }, []);

  // Calculate statistics
  const stats: ConsensusStats = {
    totalRaces: history.length,
    avgSuccessRate: history.length > 0 
      ? history.reduce((acc, h) => acc + h.successRate, 0) / history.length 
      : 0,
    totalCouplesGenerated: history.reduce((acc, h) => acc + h.couplesTotal, 0),
    totalCouplesWon: history.reduce((acc, h) => acc + h.couplesSuccess, 0),
    totalTiercesGenerated: history.reduce((acc, h) => acc + h.tiercesTotal, 0),
    totalTiercesWon: history.reduce((acc, h) => acc + h.tiercesSuccess, 0),
    couplesWinRate: 0,
    tiercesWinRate: 0,
    bestStreak: 0,
    currentStreak: 0,
  };

  // Calculate win rates
  if (stats.totalCouplesGenerated > 0) {
    stats.couplesWinRate = (stats.totalCouplesWon / stats.totalCouplesGenerated) * 100;
  }
  if (stats.totalTiercesGenerated > 0) {
    stats.tiercesWinRate = (stats.totalTiercesWon / stats.totalTiercesGenerated) * 100;
  }

  // Calculate streaks (races with at least one success)
  let currentStreak = 0;
  let bestStreak = 0;
  for (const entry of history) {
    if (entry.couplesSuccess > 0 || entry.tiercesSuccess > 0) {
      currentStreak++;
      bestStreak = Math.max(bestStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  }
  stats.currentStreak = currentStreak;
  stats.bestStreak = bestStreak;

  return {
    history,
    stats,
    addEntry,
    deleteEntry,
    clearHistory,
  };
};

