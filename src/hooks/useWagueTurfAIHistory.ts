
import { useState, useEffect, useCallback } from 'react';

export interface WagueTurfAIEntry {
  id: string;
  timestamp: number;
  raceInfo: string;
  aiResponse: string;
  horsesSnapshot: { numero: number; name: string; cote: number; note: number; category: string }[];
  arrival?: number[]; // official arrival (horse numbers in order)
  comparison?: WagueTurfComparison;
}

export interface WagueTurfComparison {
  winnerPredicted: boolean;
  tierceHits: number; // how many of AI tiercé are in top 3
  quinteHits: number; // how many of AI quinté are in top 5
  outsiderHits: number; // outsiders that placed
  successRate: number; // 0-100
  details: string;
}

const STORAGE_KEY = 'wague-turf-ai-history';
const MAX_HISTORY = 30;

// Parse AI response to extract predicted horse numbers
function extractPredictedNumbers(text: string): { tierce: number[]; quinte: number[]; outsiders: number[] } {
  const tierce: number[] = [];
  const quinte: number[] = [];
  const outsiders: number[] = [];

  // Find tiercé section
  const tierceMatch = text.match(/TIERC[ÉE].*?\n([\s\S]*?)(?=\n.*?(?:QUINT|🎯|⭐|$))/i);
  if (tierceMatch) {
    const nums = tierceMatch[1].match(/N°\s*(\d+)/gi);
    nums?.forEach(m => { const n = parseInt(m.replace(/N°\s*/i, '')); if (n) tierce.push(n); });
  }

  // Find quinté section  
  const quinteMatch = text.match(/QUINT[ÉE].*?\n([\s\S]*?)(?=\n.*?(?:⭐|OUTSIDER|TOP 4|$))/i);
  if (quinteMatch) {
    const nums = quinteMatch[1].match(/N°\s*(\d+)/gi);
    nums?.forEach(m => { const n = parseInt(m.replace(/N°\s*/i, '')); if (n) quinte.push(n); });
  }

  // Find outsiders section
  const outsiderMatch = text.match(/OUTSIDER.*?\n([\s\S]*?)(?=\n.*?(?:💣|TOCARD|COUPLÉ|VALUE|$))/i);
  if (outsiderMatch) {
    const nums = outsiderMatch[1].match(/N°\s*(\d+)/gi);
    nums?.forEach(m => { const n = parseInt(m.replace(/N°\s*/i, '')); if (n) outsiders.push(n); });
  }

  // Fallback: extract all N° references if sections not found
  if (tierce.length === 0 && quinte.length === 0) {
    const allNums = text.match(/N°\s*(\d+)/gi);
    const unique = [...new Set(allNums?.map(m => parseInt(m.replace(/N°\s*/i, ''))) || [])];
    tierce.push(...unique.slice(0, 3));
    quinte.push(...unique.slice(0, 5));
    outsiders.push(...unique.slice(5, 9));
  }

  return { tierce: [...new Set(tierce)].slice(0, 3), quinte: [...new Set(quinte)].slice(0, 5), outsiders: [...new Set(outsiders)].slice(0, 4) };
}

function compareWithArrival(aiResponse: string, arrival: number[]): WagueTurfComparison {
  const predicted = extractPredictedNumbers(aiResponse);
  const top3 = arrival.slice(0, 3);
  const top5 = arrival.slice(0, 5);
  const winner = arrival[0];

  const winnerPredicted = predicted.tierce.includes(winner) || predicted.quinte.includes(winner);
  const tierceHits = predicted.tierce.filter(n => top3.includes(n)).length;
  const quinteHits = predicted.quinte.filter(n => top5.includes(n)).length;
  const outsiderHits = predicted.outsiders.filter(n => top5.includes(n)).length;

  // Score: winner=30, tierce=20 each, quinte=10 each, outsider=5 each
  const maxScore = 30 + 60 + 50 + 20; // 160
  const score = (winnerPredicted ? 30 : 0) + tierceHits * 20 + quinteHits * 10 + outsiderHits * 5;
  const successRate = Math.round((score / maxScore) * 100);

  const details = [
    winnerPredicted ? `✅ Gagnant N°${winner} prédit !` : `❌ Gagnant N°${winner} non prédit`,
    `🏆 Tiercé: ${tierceHits}/3 dans le Top 3`,
    `🎯 Quinté: ${quinteHits}/5 dans le Top 5`,
    outsiderHits > 0 ? `⭐ ${outsiderHits} outsider(s) placé(s)` : `Aucun outsider placé`,
  ].join('\n');

  return { winnerPredicted, tierceHits, quinteHits, outsiderHits, successRate, details };
}

export function useWagueTurfAIHistory() {
  const [history, setHistory] = useState<WagueTurfAIEntry[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setHistory(JSON.parse(stored));
    } catch { setHistory([]); }
  }, []);

  const save = useCallback((data: WagueTurfAIEntry[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, []);

  const addEntry = useCallback((entry: Omit<WagueTurfAIEntry, 'id' | 'timestamp'>) => {
    const newEntry: WagueTurfAIEntry = { ...entry, id: crypto.randomUUID(), timestamp: Date.now() };
    setHistory(prev => {
      const updated = [newEntry, ...prev].slice(0, MAX_HISTORY);
      save(updated);
      return updated;
    });
    return newEntry;
  }, [save]);

  const addArrival = useCallback((id: string, arrival: number[]) => {
    setHistory(prev => {
      const updated = prev.map(e => {
        if (e.id !== id) return e;
        const comparison = compareWithArrival(e.aiResponse, arrival);
        return { ...e, arrival, comparison };
      });
      save(updated);
      return updated;
    });
  }, [save]);

  const deleteEntry = useCallback((id: string) => {
    setHistory(prev => {
      const updated = prev.filter(e => e.id !== id);
      save(updated);
      return updated;
    });
  }, [save]);

  const clearHistory = useCallback(() => {
    setHistory([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const getStats = useCallback(() => {
    const withComparison = history.filter(e => e.comparison);
    if (withComparison.length === 0) return null;
    const avgSuccess = Math.round(withComparison.reduce((s, e) => s + (e.comparison?.successRate || 0), 0) / withComparison.length);
    const winnerRate = Math.round((withComparison.filter(e => e.comparison?.winnerPredicted).length / withComparison.length) * 100);
    const avgTierce = +(withComparison.reduce((s, e) => s + (e.comparison?.tierceHits || 0), 0) / withComparison.length).toFixed(1);
    return { total: history.length, compared: withComparison.length, avgSuccess, winnerRate, avgTierce };
  }, [history]);

  return { history, addEntry, addArrival, deleteEntry, clearHistory, getStats };
}

