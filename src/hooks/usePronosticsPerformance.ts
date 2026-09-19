
import { useState, useEffect, useCallback } from 'react';

export interface PronosticPerformanceEntry {
  id: string;
  timestamp: number;
  date: string;
  reunion: number;
  course: number;
  // Suggestions made
  suggestedBases: number[];
  suggestedOutsiders: number[];
  suggestedCouples: string[];
  suggestedTierces: string[];
  confidence: number;
  // Actual results
  arrivee: number[];
  // Performance metrics
  basesInTop3: number[];
  basesInTop5: number[];
  outsidersInTop3: number[];
  outsidersInTop5: number[];
  winnerPredicted: boolean;
  coupleWin: boolean;
  tierceWin: boolean;
  baseSuccessRate: number; // % of bases in Top 3
  overallScore: number; // 0-100
}

export interface PronosticsPerformanceStats {
  totalEntries: number;
  avgBaseSuccessRate: number;
  avgOverallScore: number;
  winnerPredictionRate: number;
  coupleWinRate: number;
  tierceWinRate: number;
  basesInTop3Rate: number;
  bestStreak: number;
  currentStreak: number;
  avgConfidence: number;
  confidenceAccuracy: number; // How well confidence correlates with success
}

const STORAGE_KEY = 'pronostics-performance-history';
const MAX_ENTRIES = 50;

export function usePronosticsPerformance() {
  const [history, setHistory] = useState<PronosticPerformanceEntry[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading pronostics performance history:', error);
    }
  }, []);

  // Save to localStorage whenever history changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (error) {
      console.error('Error saving pronostics performance history:', error);
    }
  }, [history]);

  const addEntry = useCallback((
    date: string,
    reunion: number,
    course: number,
    suggestedBases: number[],
    suggestedOutsiders: number[],
    suggestedCouples: string[],
    suggestedTierces: string[],
    confidence: number,
    arrivee: number[]
  ) => {
    // Check if entry already exists for this race
    const existingIndex = history.findIndex(
      e => e.date === date && e.reunion === reunion && e.course === course
    );
    
    if (existingIndex >= 0) {
      // Update existing entry
      setHistory(prev => {
        const updated = [...prev];
        updated[existingIndex] = calculateEntry(
          updated[existingIndex].id,
          updated[existingIndex].timestamp,
          date, reunion, course,
          suggestedBases, suggestedOutsiders, suggestedCouples, suggestedTierces,
          confidence, arrivee
        );
        return updated;
      });
      return;
    }

    // Add new entry
    const entry = calculateEntry(
      crypto.randomUUID(),
      Date.now(),
      date, reunion, course,
      suggestedBases, suggestedOutsiders, suggestedCouples, suggestedTierces,
      confidence, arrivee
    );

    setHistory(prev => {
      const updated = [entry, ...prev];
      return updated.slice(0, MAX_ENTRIES);
    });
  }, [history]);

  const deleteEntry = useCallback((id: string) => {
    setHistory(prev => prev.filter(e => e.id !== id));
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const getStats = useCallback((): PronosticsPerformanceStats => {
    if (history.length === 0) {
      return {
        totalEntries: 0,
        avgBaseSuccessRate: 0,
        avgOverallScore: 0,
        winnerPredictionRate: 0,
        coupleWinRate: 0,
        tierceWinRate: 0,
        basesInTop3Rate: 0,
        bestStreak: 0,
        currentStreak: 0,
        avgConfidence: 0,
        confidenceAccuracy: 0,
      };
    }

    const totalEntries = history.length;
    const avgBaseSuccessRate = history.reduce((sum, e) => sum + e.baseSuccessRate, 0) / totalEntries;
    const avgOverallScore = history.reduce((sum, e) => sum + e.overallScore, 0) / totalEntries;
    const winnerPredictionRate = (history.filter(e => e.winnerPredicted).length / totalEntries) * 100;
    const coupleWinRate = (history.filter(e => e.coupleWin).length / totalEntries) * 100;
    const tierceWinRate = (history.filter(e => e.tierceWin).length / totalEntries) * 100;
    
    // Calculate bases in Top 3 rate
    const totalBases = history.reduce((sum, e) => sum + e.suggestedBases.length, 0);
    const basesInTop3Count = history.reduce((sum, e) => sum + e.basesInTop3.length, 0);
    const basesInTop3Rate = totalBases > 0 ? (basesInTop3Count / totalBases) * 100 : 0;

    // Calculate streaks (successful = at least 1 base in Top 3)
    let bestStreak = 0;
    let currentStreak = 0;
    let tempStreak = 0;
    
    // Sort by timestamp descending for current streak
    const sortedHistory = [...history].sort((a, b) => b.timestamp - a.timestamp);
    
    sortedHistory.forEach((entry, index) => {
      const isSuccess = entry.basesInTop3.length > 0;
      if (isSuccess) {
        tempStreak++;
        if (index === 0 || sortedHistory[index - 1].basesInTop3.length > 0) {
          currentStreak = tempStreak;
        }
        bestStreak = Math.max(bestStreak, tempStreak);
      } else {
        tempStreak = 0;
        if (index === 0) currentStreak = 0;
      }
    });

    // Calculate confidence accuracy
    const avgConfidence = history.reduce((sum, e) => sum + e.confidence, 0) / totalEntries;
    
    // Group by confidence ranges and compare to actual success
    const highConfidence = history.filter(e => e.confidence >= 70);
    const lowConfidence = history.filter(e => e.confidence < 50);
    
    const highConfidenceSuccess = highConfidence.length > 0 
      ? highConfidence.filter(e => e.overallScore >= 50).length / highConfidence.length 
      : 0;
    const lowConfidenceSuccess = lowConfidence.length > 0 
      ? lowConfidence.filter(e => e.overallScore >= 50).length / lowConfidence.length 
      : 0;
    
    // Confidence accuracy = how much better high confidence performs vs low confidence
    const confidenceAccuracy = highConfidence.length > 0 && lowConfidence.length > 0
      ? Math.min(100, Math.max(0, (highConfidenceSuccess - lowConfidenceSuccess + 0.5) * 100))
      : avgOverallScore; // Fallback to overall score if not enough data

    return {
      totalEntries,
      avgBaseSuccessRate,
      avgOverallScore,
      winnerPredictionRate,
      coupleWinRate,
      tierceWinRate,
      basesInTop3Rate,
      bestStreak,
      currentStreak,
      avgConfidence,
      confidenceAccuracy,
    };
  }, [history]);

  return {
    history,
    addEntry,
    deleteEntry,
    clearHistory,
    getStats,
  };
}

function calculateEntry(
  id: string,
  timestamp: number,
  date: string,
  reunion: number,
  course: number,
  suggestedBases: number[],
  suggestedOutsiders: number[],
  suggestedCouples: string[],
  suggestedTierces: string[],
  confidence: number,
  arrivee: number[]
): PronosticPerformanceEntry {
  const top3 = arrivee.slice(0, 3);
  const top5 = arrivee.slice(0, 5);
  const winner = arrivee[0];

  const basesInTop3 = suggestedBases.filter(b => top3.includes(b));
  const basesInTop5 = suggestedBases.filter(b => top5.includes(b));
  const outsidersInTop3 = suggestedOutsiders.filter(o => top3.includes(o));
  const outsidersInTop5 = suggestedOutsiders.filter(o => top5.includes(o));
  
  const winnerPredicted = suggestedBases.includes(winner) || suggestedOutsiders.includes(winner);
  
  // Check couple win (any suggested couple matches top 2 in any order)
  const actualCouple = [arrivee[0], arrivee[1]].sort((a, b) => a - b).join('-');
  const coupleWin = suggestedCouples.includes(actualCouple);
  
  // Check tierce win (any suggested tierce matches top 3 in any order)
  const actualTierce = [arrivee[0], arrivee[1], arrivee[2]].sort((a, b) => a - b).join('-');
  const tierceWin = suggestedTierces.includes(actualTierce);

  // Calculate base success rate
  const baseSuccessRate = suggestedBases.length > 0 
    ? (basesInTop3.length / suggestedBases.length) * 100 
    : 0;

  // Calculate overall score (weighted)
  let overallScore = 0;
  if (winnerPredicted) overallScore += 30;
  if (basesInTop3.length >= 1) overallScore += 20;
  if (basesInTop3.length >= 2) overallScore += 15;
  if (outsidersInTop3.length >= 1) overallScore += 10;
  if (coupleWin) overallScore += 15;
  if (tierceWin) overallScore += 10;
  
  overallScore = Math.min(100, overallScore);

  return {
    id,
    timestamp,
    date,
    reunion,
    course,
    suggestedBases,
    suggestedOutsiders,
    suggestedCouples,
    suggestedTierces,
    confidence,
    arrivee,
    basesInTop3,
    basesInTop5,
    outsidersInTop3,
    outsidersInTop5,
    winnerPredicted,
    coupleWin,
    tierceWin,
    baseSuccessRate,
    overallScore,
  };
}

