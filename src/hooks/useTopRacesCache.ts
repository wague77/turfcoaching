
import { useState, useEffect } from 'react';
import { Horse, Discipline, AnalysisResult } from '@/types/racing';

export interface TopRaceResult {
  raceInfo: {
    reunionNumber: number;
    raceNumber: number;
    hippodrome?: string;
    discipline: Discipline;
  };
  top4: Horse[];
  averageScore: number;
  difficultyScore: number;
  difficulty: 'easy' | 'medium' | 'hard';
  analysis: AnalysisResult;
}

interface CacheData {
  races: TopRaceResult[];
  date: string;
  timestamp: number;
}

const CACHE_KEY = 'pmu-top-races-cache';
const CACHE_TTL = 4 * 60 * 60 * 1000; // 4 hours

export function useTopRacesCache() {
  const [topRaces, setTopRacesState] = useState<TopRaceResult[]>([]);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);

  const getTodayPMUDate = (): string => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    return `${day}${month}${year}`;
  };

  // Load from cache on mount
  useEffect(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const data: CacheData = JSON.parse(cached);
        const now = Date.now();
        const today = getTodayPMUDate();
        
        // Check if cache is still valid (same day and not expired)
        if (data.date === today && (now - data.timestamp) < CACHE_TTL) {
          setTopRacesState(data.races);
          setLastFetch(new Date(data.timestamp));
        }
      }
    } catch (e) {
      console.error('Error loading top races cache:', e);
    }
  }, []);

  const setTopRaces = (races: TopRaceResult[]) => {
    // Sort by average score (highest first)
    const sorted = [...races].sort((a, b) => b.averageScore - a.averageScore);
    setTopRacesState(sorted);
    setLastFetch(new Date());

    // Save to cache
    try {
      const cacheData: CacheData = {
        races: sorted,
        date: getTodayPMUDate(),
        timestamp: Date.now()
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    } catch (e) {
      console.error('Error saving top races cache:', e);
    }
  };

  return {
    topRaces,
    setTopRaces,
    lastFetch,
    getTodayPMUDate
  };
}

