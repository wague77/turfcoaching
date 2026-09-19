
import { useState, useEffect, useCallback } from 'react';
import { ComparisonResult, ComparisonStats } from '@/types/racing';

const STORAGE_KEY = 'comparison-history';
const MAX_HISTORY = 50;

export const useComparisonHistory = () => {
  const [history, setHistory] = useState<ComparisonResult[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setHistory(JSON.parse(stored));
      } catch {
        setHistory([]);
      }
    }
  }, []);

  const saveToStorage = useCallback((data: ComparisonResult[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, []);

  const addComparison = useCallback((comparison: Omit<ComparisonResult, 'id' | 'timestamp'>) => {
    const newComparison: ComparisonResult = {
      ...comparison,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };

    setHistory(prev => {
      const updated = [newComparison, ...prev].slice(0, MAX_HISTORY);
      saveToStorage(updated);
      return updated;
    });

    return newComparison;
  }, [saveToStorage]);

  const deleteComparison = useCallback((id: string) => {
    setHistory(prev => {
      const updated = prev.filter(c => c.id !== id);
      saveToStorage(updated);
      return updated;
    });
  }, [saveToStorage]);

  const clearHistory = useCallback(() => {
    setHistory([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const getStats = useCallback((): ComparisonStats | null => {
    if (history.length === 0) return null;

    const withSuccessRate = history.filter(c => c.overallSuccessRate !== null);
    
    const avgSuccessRate = withSuccessRate.length > 0
      ? withSuccessRate.reduce((sum, c) => sum + (c.overallSuccessRate || 0), 0) / withSuccessRate.length
      : 0;

    const winnerPredictionRate = (history.filter(c => c.winnerPredicted).length / history.length) * 100;

    // Calculate bases in top 3 rate
    const totalBases = history.reduce((sum, c) => sum + c.bases.length, 0);
    const totalBasesInTop3 = history.reduce((sum, c) => sum + c.basesInTop3.length, 0);
    const basesInTop3Rate = totalBases > 0 ? (totalBasesInTop3 / totalBases) * 100 : 0;

    // Calculate streaks (consecutive success rate >= 50%)
    let bestStreak = 0;
    let currentStreak = 0;
    
    for (const comp of history) {
      if (comp.overallSuccessRate && comp.overallSuccessRate >= 50) {
        currentStreak++;
        bestStreak = Math.max(bestStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    }

    // Reset current streak for display (from most recent)
    currentStreak = 0;
    for (const comp of history) {
      if (comp.overallSuccessRate && comp.overallSuccessRate >= 50) {
        currentStreak++;
      } else {
        break;
      }
    }

    return {
      totalComparisons: history.length,
      avgSuccessRate: Math.round(avgSuccessRate),
      winnerPredictionRate: Math.round(winnerPredictionRate),
      basesInTop3Rate: Math.round(basesInTop3Rate),
      bestStreak,
      currentStreak,
    };
  }, [history]);

  return {
    history,
    addComparison,
    deleteComparison,
    clearHistory,
    getStats,
  };
};

