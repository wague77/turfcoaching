
import { useState, useEffect, useCallback } from 'react';

export interface AIAnalysisEntry {
  id: string;
  date: string;
  reunion: number;
  course: number;
  analysis: string;
  hasArrivee: boolean;
  arrivee?: number[];
  snapshotCount: number;
  createdAt: string;
}

const STORAGE_KEY = 'ai-analysis-history';
const MAX_ENTRIES = 50;

export const useAIAnalysisHistory = () => {
  const [history, setHistory] = useState<AIAnalysisEntry[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Error loading AI analysis history:', e);
    }
  }, []);

  // Save to localStorage
  const saveToStorage = useCallback((entries: AIAnalysisEntry[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch (e) {
      console.error('Error saving AI analysis history:', e);
    }
  }, []);

  // Add new analysis
  const addAnalysis = useCallback((
    date: string,
    reunion: number,
    course: number,
    analysis: string,
    hasArrivee: boolean,
    arrivee?: number[],
    snapshotCount?: number
  ) => {
    const entry: AIAnalysisEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      date,
      reunion,
      course,
      analysis,
      hasArrivee,
      arrivee,
      snapshotCount: snapshotCount || 0,
      createdAt: new Date().toISOString(),
    };

    setHistory(prev => {
      const newHistory = [entry, ...prev].slice(0, MAX_ENTRIES);
      saveToStorage(newHistory);
      return newHistory;
    });

    return entry.id;
  }, [saveToStorage]);

  // Delete an analysis
  const deleteAnalysis = useCallback((id: string) => {
    setHistory(prev => {
      const newHistory = prev.filter(e => e.id !== id);
      saveToStorage(newHistory);
      return newHistory;
    });
  }, [saveToStorage]);

  // Clear all history
  const clearHistory = useCallback(() => {
    setHistory([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  // Get analyses for a specific race
  const getRaceAnalyses = useCallback((date: string, reunion: number, course: number) => {
    return history.filter(
      e => e.date === date && e.reunion === reunion && e.course === course
    );
  }, [history]);

  // Get unique races from history
  const getUniqueRaces = useCallback(() => {
    const races = new Map<string, { date: string; reunion: number; course: number; count: number }>();
    
    history.forEach(entry => {
      const key = `${entry.date}-R${entry.reunion}C${entry.course}`;
      if (!races.has(key)) {
        races.set(key, {
          date: entry.date,
          reunion: entry.reunion,
          course: entry.course,
          count: 1,
        });
      } else {
        races.get(key)!.count++;
      }
    });

    return Array.from(races.values());
  }, [history]);

  return {
    history,
    addAnalysis,
    deleteAnalysis,
    clearHistory,
    getRaceAnalyses,
    getUniqueRaces,
  };
};

