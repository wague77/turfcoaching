
import { useState, useEffect, useCallback } from 'react';
import { RawHorseData, Discipline, AnalysisResult } from '@/types/racing';
import { PMUHorse } from '@/lib/pmu-api';

const STORAGE_KEY = 'persisted-race-data';

interface PersistedRaceData {
  inputText: string;
  parsedData: RawHorseData[];
  fetchedHorses: PMUHorse[];
  arrivee: number[];
  result: AnalysisResult | null;
  currentDiscipline: Discipline;
  pmuReunion: string;
  pmuCourse: string;
  lastUpdated: string;
}

const defaultData: PersistedRaceData = {
  inputText: '',
  parsedData: [],
  fetchedHorses: [],
  arrivee: [],
  result: null,
  currentDiscipline: 'plat',
  pmuReunion: '',
  pmuCourse: '',
  lastUpdated: '',
};

export function usePersistedRaceData() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [inputText, setInputText] = useState('');
  const [parsedData, setParsedData] = useState<RawHorseData[]>([]);
  const [fetchedHorses, setFetchedHorses] = useState<PMUHorse[]>([]);
  const [arrivee, setArrivee] = useState<number[]>([]);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [currentDiscipline, setCurrentDiscipline] = useState<Discipline>('plat');
  const [pmuReunion, setPmuReunion] = useState('');
  const [pmuCourse, setPmuCourse] = useState('');

  // Load data from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data: PersistedRaceData = JSON.parse(stored);
        
        // Restore all persisted values
        if (data.inputText) setInputText(data.inputText);
        if (data.parsedData) setParsedData(data.parsedData);
        if (data.fetchedHorses) setFetchedHorses(data.fetchedHorses);
        if (data.arrivee) setArrivee(data.arrivee);
        if (data.result) setResult(data.result);
        if (data.currentDiscipline) setCurrentDiscipline(data.currentDiscipline);
        if (data.pmuReunion) setPmuReunion(data.pmuReunion);
        if (data.pmuCourse) setPmuCourse(data.pmuCourse);
      }
    } catch (error) {
      console.error('Failed to load persisted race data:', error);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save data to localStorage whenever any value changes
  useEffect(() => {
    if (!isLoaded) return; // Don't save during initial load
    
    try {
      const dataToSave: PersistedRaceData = {
        inputText,
        parsedData,
        fetchedHorses,
        arrivee,
        result,
        currentDiscipline,
        pmuReunion,
        pmuCourse,
        lastUpdated: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    } catch (error) {
      console.error('Failed to save race data:', error);
    }
  }, [isLoaded, inputText, parsedData, fetchedHorses, arrivee, result, currentDiscipline, pmuReunion, pmuCourse]);

  // Clear all persisted data
  const clearAllData = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setInputText('');
    setParsedData([]);
    setFetchedHorses([]);
    setArrivee([]);
    setResult(null);
    setCurrentDiscipline('plat');
    setPmuReunion('');
    setPmuCourse('');
  }, []);

  return {
    isLoaded,
    inputText,
    setInputText,
    parsedData,
    setParsedData,
    fetchedHorses,
    setFetchedHorses,
    arrivee,
    setArrivee,
    result,
    setResult,
    currentDiscipline,
    setCurrentDiscipline,
    pmuReunion,
    setPmuReunion,
    pmuCourse,
    setPmuCourse,
    clearAllData,
  };
}

