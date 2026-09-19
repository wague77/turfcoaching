
import { useState, useEffect } from 'react';
import { EasyRaceResult } from './useEasyRacesCache';
import { TopRaceResult } from './useTopRacesCache';

const STORAGE_KEY = 'saved-races';
const MAX_SAVED = 20;

export interface SavedRace {
  id: string;
  timestamp: number;
  type: 'easy' | 'top';
  raceInfo: {
    reunionNumber: number;
    raceNumber: number;
    hippodrome?: string;
    discipline: string;
  };
  top4: Array<{
    numero: number;
    name?: string;
    cote: number;
    scoreTotal: number;
    label: string;
  }>;
  averageScore?: number;
  difficultyScore: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  arrivee?: number[]; // Arrivée saisie par l'utilisateur
}

export const useSavedRaces = () => {
  const [savedRaces, setSavedRaces] = useState<SavedRace[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setSavedRaces(JSON.parse(stored));
      } catch {
        setSavedRaces([]);
      }
    }
  }, []);

  const saveEasyRace = (race: EasyRaceResult, arrivee?: number[]) => {
    const newSavedRace: SavedRace = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      type: 'easy',
      raceInfo: {
        ...race.raceInfo,
        discipline: race.raceInfo.discipline
      },
      top4: race.top4.map(h => ({
        numero: h.numero,
        name: h.name,
        cote: h.cote,
        scoreTotal: h.scoreTotal,
        label: h.label
      })),
      difficultyScore: race.difficultyScore,
      difficulty: 'easy',
      arrivee: arrivee && arrivee.length > 0 ? arrivee : undefined
    };

    const updated = [newSavedRace, ...savedRaces.filter(r => 
      !(r.raceInfo.reunionNumber === race.raceInfo.reunionNumber && 
        r.raceInfo.raceNumber === race.raceInfo.raceNumber &&
        r.type === 'easy')
    )].slice(0, MAX_SAVED);
    
    setSavedRaces(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return newSavedRace;
  };

  const saveTopRace = (race: TopRaceResult, arrivee?: number[]) => {
    const newSavedRace: SavedRace = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      type: 'top',
      raceInfo: {
        ...race.raceInfo,
        discipline: race.raceInfo.discipline
      },
      top4: race.top4.map(h => ({
        numero: h.numero,
        name: h.name,
        cote: h.cote,
        scoreTotal: h.scoreTotal,
        label: h.label
      })),
      averageScore: race.averageScore,
      difficultyScore: race.difficultyScore,
      difficulty: race.difficulty,
      arrivee: arrivee && arrivee.length > 0 ? arrivee : undefined
    };

    const updated = [newSavedRace, ...savedRaces.filter(r => 
      !(r.raceInfo.reunionNumber === race.raceInfo.reunionNumber && 
        r.raceInfo.raceNumber === race.raceInfo.raceNumber &&
        r.type === 'top')
    )].slice(0, MAX_SAVED);
    
    setSavedRaces(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return newSavedRace;
  };

  const isRaceSaved = (reunionNumber: number, raceNumber: number, type: 'easy' | 'top') => {
    return savedRaces.some(r => 
      r.raceInfo.reunionNumber === reunionNumber && 
      r.raceInfo.raceNumber === raceNumber &&
      r.type === type
    );
  };

  const deleteRace = (id: string) => {
    const updated = savedRaces.filter(r => r.id !== id);
    setSavedRaces(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const clearAll = () => {
    setSavedRaces([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  return {
    savedRaces,
    saveEasyRace,
    saveTopRace,
    isRaceSaved,
    deleteRace,
    clearAll,
  };
};

