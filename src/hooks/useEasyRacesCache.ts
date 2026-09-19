
import { useState, useEffect } from 'react';
import { Horse, Discipline, AnalysisResult } from '@/types/racing';

const EASY_RACES_STORAGE_KEY = 'easy-races-cache';

interface RaceInfo {
  reunionNumber: number;
  raceNumber: number;
  hippodrome?: string;
  discipline: Discipline;
}

export interface EasyRaceResult {
  raceInfo: RaceInfo;
  top4: Horse[];
  difficultyScore: number;
  analysis: AnalysisResult;
}

interface EasyRacesCache {
  races: EasyRaceResult[];
  lastFetch: string;
  date: string; // Date PMU format DDMMYYYY
}

export function useEasyRacesCache() {
  const [easyRaces, setEasyRaces] = useState<EasyRaceResult[]>([]);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);

  // Get today's date in PMU format (DDMMYYYY)
  const getTodayPMUDate = (): string => {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    return `${dd}${mm}${yyyy}`;
  };

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(EASY_RACES_STORAGE_KEY);
    if (stored) {
      try {
        const cache: EasyRacesCache = JSON.parse(stored);
        const today = getTodayPMUDate();
        
        // Only use cache if it's from today
        if (cache.date === today && cache.races.length > 0) {
          setEasyRaces(cache.races);
          setLastFetch(new Date(cache.lastFetch));
        }
      } catch (e) {
        console.error('Error loading easy races cache:', e);
      }
    }
  }, []);

  // Save to localStorage
  const saveToCache = (races: EasyRaceResult[]) => {
    const now = new Date();
    const cache: EasyRacesCache = {
      races,
      lastFetch: now.toISOString(),
      date: getTodayPMUDate()
    };
    localStorage.setItem(EASY_RACES_STORAGE_KEY, JSON.stringify(cache));
    setEasyRaces(races);
    setLastFetch(now);
  };

  // Clear cache
  const clearCache = () => {
    localStorage.removeItem(EASY_RACES_STORAGE_KEY);
    setEasyRaces([]);
    setLastFetch(null);
  };

  return {
    easyRaces,
    setEasyRaces: saveToCache,
    lastFetch,
    setLastFetch,
    clearCache,
    getTodayPMUDate
  };
}

