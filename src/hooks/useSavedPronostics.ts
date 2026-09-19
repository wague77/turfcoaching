
import { useState, useEffect } from 'react';
import { SavedPronostic, RaceResult, PronosticEvaluation } from '@/types/racing';

const STORAGE_KEY = 'saved-pronostics';
const MAX_SAVED = 10;

export const useSavedPronostics = () => {
  const [savedPronostics, setSavedPronostics] = useState<SavedPronostic[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setSavedPronostics(JSON.parse(stored));
      } catch {
        setSavedPronostics([]);
      }
    }
  }, []);

  const savePronostic = (pronostic: Omit<SavedPronostic, 'id' | 'timestamp'>) => {
    const newPronostic: SavedPronostic = {
      ...pronostic,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };

    const updated = [newPronostic, ...savedPronostics].slice(0, MAX_SAVED);
    setSavedPronostics(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return newPronostic;
  };

  const updatePronosticResult = (
    id: string, 
    raceResult: RaceResult, 
    evaluation: PronosticEvaluation
  ) => {
    const updated = savedPronostics.map(p => 
      p.id === id ? { ...p, raceResult, evaluation } : p
    );
    setSavedPronostics(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const deletePronostic = (id: string) => {
    const updated = savedPronostics.filter(p => p.id !== id);
    setSavedPronostics(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const clearAll = () => {
    setSavedPronostics([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  // Calculate global stats
  const getStats = () => {
    const evaluated = savedPronostics.filter(p => p.evaluation);
    if (evaluated.length === 0) return null;

    const avgScore = evaluated.reduce((sum, p) => sum + (p.evaluation?.overallScore || 0), 0) / evaluated.length;
    const baseSuccessRate = evaluated.filter(p => p.evaluation?.baseSuccess).length / evaluated.length * 100;
    const outsiderSuccessRate = evaluated.filter(p => p.evaluation?.outsiderSuccess).length / evaluated.length * 100;

    return {
      totalEvaluated: evaluated.length,
      avgScore: Math.round(avgScore),
      baseSuccessRate: Math.round(baseSuccessRate),
      outsiderSuccessRate: Math.round(outsiderSuccessRate),
    };
  };

  return {
    savedPronostics,
    savePronostic,
    updatePronosticResult,
    deletePronostic,
    clearAll,
    getStats,
  };
};

