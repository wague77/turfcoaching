
import { useState, useEffect, useCallback } from 'react';

export interface HorseOdds {
  numero: number;
  name: string;
  cote: number;
}

export interface OddsSnapshot {
  timestamp: string;
  hour: string;
  horses: HorseOdds[];
}

export interface RaceArrivee {
  positions: number[]; // Horse numbers in order of finish (1st, 2nd, 3rd, 4th, 5th)
  recordedAt: string;
}

export interface RaceOddsHistory {
  date: string;
  reunion: number;
  course: number;
  snapshots: OddsSnapshot[];
  arrivee?: RaceArrivee;
}

const STORAGE_KEY = 'pmu-odds-history';

export function useOddsHistory() {
  const [history, setHistory] = useState<RaceOddsHistory[]>([]);
  const [currentRace, setCurrentRace] = useState<{ date: string; reunion: number; course: number } | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setHistory(parsed);
      }
    } catch (error) {
      console.error('Error loading odds history:', error);
    }
  }, []);

  // Save to localStorage whenever history changes
  useEffect(() => {
    if (history.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    }
  }, [history]);

  const addSnapshot = useCallback((
    date: string, 
    reunion: number, 
    course: number, 
    horses: HorseOdds[]
  ) => {
    const now = new Date();
    const timestamp = now.toISOString();
    const hour = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    // Sort horses by odds
    const sortedHorses = [...horses].sort((a, b) => a.cote - b.cote);

    const snapshot: OddsSnapshot = {
      timestamp,
      hour,
      horses: sortedHorses,
    };

    setHistory(prev => {
      const existingRaceIndex = prev.findIndex(
        r => r.date === date && r.reunion === reunion && r.course === course
      );

      if (existingRaceIndex >= 0) {
        // Update existing race
        const updated = [...prev];
        updated[existingRaceIndex] = {
          ...updated[existingRaceIndex],
          snapshots: [...updated[existingRaceIndex].snapshots, snapshot],
        };
        return updated;
      } else {
        // Add new race
        return [
          ...prev,
          {
            date,
            reunion,
            course,
            snapshots: [snapshot],
          },
        ];
      }
    });

    setCurrentRace({ date, reunion, course });
  }, []);

  const setRaceArrivee = useCallback((
    date: string,
    reunion: number,
    course: number,
    positions: number[]
  ) => {
    setHistory(prev => {
      const existingRaceIndex = prev.findIndex(
        r => r.date === date && r.reunion === reunion && r.course === course
      );

      if (existingRaceIndex >= 0) {
        const updated = [...prev];
        updated[existingRaceIndex] = {
          ...updated[existingRaceIndex],
          arrivee: {
            positions,
            recordedAt: new Date().toISOString(),
          },
        };
        return updated;
      }
      return prev;
    });
  }, []);

  const clearRaceArrivee = useCallback((date: string, reunion: number, course: number) => {
    setHistory(prev => {
      const existingRaceIndex = prev.findIndex(
        r => r.date === date && r.reunion === reunion && r.course === course
      );

      if (existingRaceIndex >= 0) {
        const updated = [...prev];
        const { arrivee, ...rest } = updated[existingRaceIndex];
        updated[existingRaceIndex] = rest as RaceOddsHistory;
        return updated;
      }
      return prev;
    });
  }, []);

  const getRaceHistory = useCallback((date: string, reunion: number, course: number): RaceOddsHistory | undefined => {
    return history.find(
      r => r.date === date && r.reunion === reunion && r.course === course
    );
  }, [history]);

  const clearRaceHistory = useCallback((date: string, reunion: number, course: number) => {
    setHistory(prev => prev.filter(
      r => !(r.date === date && r.reunion === reunion && r.course === course)
    ));
  }, []);

  const clearAllHistory = useCallback(() => {
    setHistory([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const getLatestSnapshot = useCallback((date: string, reunion: number, course: number): OddsSnapshot | undefined => {
    const race = getRaceHistory(date, reunion, course);
    if (!race || race.snapshots.length === 0) return undefined;
    return race.snapshots[race.snapshots.length - 1];
  }, [getRaceHistory]);

  return {
    history,
    currentRace,
    setCurrentRace,
    addSnapshot,
    getRaceHistory,
    clearRaceHistory,
    clearAllHistory,
    getLatestSnapshot,
    setRaceArrivee,
    clearRaceArrivee,
  };
}

