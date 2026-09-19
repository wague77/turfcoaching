
import { useState, useEffect, useCallback, useRef } from 'react';
import { BetSession, BetHistory, StakeCalculation } from '@/types/betting';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { useAuth } from './useAuth';

const LOCAL_STORAGE_KEY = 'pmu-bet-distributor-history';

const getInitialHistory = (): BetHistory => ({
  sessions: [],
  globalBalance: 0,
  totalRaces: 0,
  wins: 0,
  losses: 0,
  currentRecoveryLevel: 0,
  recoveryAccumulated: 0,
  bankroll: 0,
  initialBankroll: 0,
  betPercentage: 5,
  bankrollHistory: [],
});

export const useBetDistributor = () => {
  const [history, setHistory] = useState<BetHistory>(getInitialHistory);
  const [isLoading, setIsLoading] = useState(true);
  const { user, isLoading: authLoading } = useAuth();
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasLoadedRef = useRef(false);

  // Load from Supabase on mount when user is authenticated
  useEffect(() => {
    if (authLoading) return;
    if (hasLoadedRef.current) return;

    const loadFromSupabase = async () => {
      if (!user) {
        // Not authenticated, try to load from localStorage
        const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            setHistory({
              ...getInitialHistory(),
              ...parsed,
              bankrollHistory: Array.isArray(parsed.bankrollHistory) ? parsed.bankrollHistory : [],
            });
          } catch (e) {
            console.error('Error parsing localStorage:', e);
          }
        }
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('bet_distributor_history')
          .select('history_data')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error loading from Supabase:', error);
          // Fallback to localStorage
          const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
          if (stored) {
            const parsed = JSON.parse(stored);
            setHistory({
              ...getInitialHistory(),
              ...parsed,
              bankrollHistory: Array.isArray(parsed.bankrollHistory) ? parsed.bankrollHistory : [],
            });
          }
        } else if (data?.history_data) {
          const parsed = data.history_data as unknown as BetHistory;
          setHistory({
            ...getInitialHistory(),
            ...parsed,
            bankrollHistory: Array.isArray(parsed.bankrollHistory) ? parsed.bankrollHistory : [],
          });
        } else {
          // No data in Supabase, try localStorage and migrate
          const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
          if (stored) {
            const parsed = JSON.parse(stored);
            setHistory({
              ...getInitialHistory(),
              ...parsed,
              bankrollHistory: Array.isArray(parsed.bankrollHistory) ? parsed.bankrollHistory : [],
            });
          }
        }
        hasLoadedRef.current = true;
      } catch (e) {
        console.error('Error loading history:', e);
      } finally {
        setIsLoading(false);
      }
    };

    loadFromSupabase();
  }, [user, authLoading]);

  // Save to Supabase with debounce
  const saveToSupabase = useCallback(async (historyData: BetHistory) => {
    // Also save to localStorage as backup
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(historyData));

    if (!user) return;

    try {
      const historyJson = JSON.parse(JSON.stringify(historyData)) as Json;

      // Check if record exists
      const { data: existing } = await supabase
        .from('bet_distributor_history')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        // Update existing record
        const { error } = await supabase
          .from('bet_distributor_history')
          .update({ history_data: historyJson })
          .eq('user_id', user.id);

        if (error) {
          console.error('Error updating in Supabase:', error);
        }
      } else {
        // Insert new record
        const { error } = await supabase
          .from('bet_distributor_history')
          .insert([{
            user_id: user.id,
            device_id: 'deprecated', // Keep for backwards compatibility
            history_data: historyJson,
          }]);

        if (error) {
          console.error('Error inserting in Supabase:', error);
        }
      }
    } catch (e) {
      console.error('Error saving history:', e);
    }
  }, [user]);

  // Debounced save effect
  useEffect(() => {
    if (isLoading || authLoading) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveToSupabase(history);
    }, 500);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [history, isLoading, authLoading, saveToSupabase]);

  // Calculate stakes for simple win bets (each horse to win)
  const calculateStakes = useCallback((
    targetProfit: number,
    odds: number[],
    recoveryAmount: number = 0
  ): StakeCalculation[] => {
    const totalTarget = targetProfit + recoveryAmount;
    
    return odds.map((odd, index) => {
      const stake = Math.ceil(totalTarget / (odd - 1));
      const potentialWin = stake * odd;
      
      return {
        horse: index + 1,
        odds: odd,
        stake,
        potentialWin,
      };
    });
  }, []);

  const addSession = useCallback((session: Omit<BetSession, 'id' | 'timestamp'>, totalStake: number = 0) => {
    const newSession: BetSession = {
      ...session,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };

    setHistory(prev => {
      const newBankroll = prev.bankroll > 0 ? Math.max(0, prev.bankroll - totalStake) : prev.bankroll;
      const stakeSnapshot = {
        timestamp: Date.now(),
        bankroll: newBankroll,
        label: 'Mise',
      };
      
      return {
        ...prev,
        sessions: [newSession, ...prev.sessions],
        bankroll: newBankroll,
        bankrollHistory: prev.bankroll > 0 ? [...prev.bankrollHistory, stakeSnapshot] : prev.bankrollHistory,
      };
    });

    return newSession.id;
  }, []);

  const updateSessionResult = useCallback((
    sessionId: string,
    winner: number,
    stakes: StakeCalculation[]
  ) => {
    setHistory(prev => {
      const sessionIndex = prev.sessions.findIndex(s => s.id === sessionId);
      if (sessionIndex === -1) return prev;

      const session = prev.sessions[sessionIndex];
      const winningStake = stakes.find(s => s.horse === winner);
      const totalStake = stakes.reduce((sum, s) => sum + s.stake, 0);
      
      let profit: number;
      let isWin: boolean;
      let bankrollChange: number;

      if (winningStake) {
        profit = winningStake.potentialWin - totalStake;
        isWin = true;
        bankrollChange = winningStake.potentialWin;
      } else {
        profit = -totalStake;
        isWin = false;
        bankrollChange = 0;
      }

      const updatedSession: BetSession = {
        ...session,
        result: { winner, profit, isWin },
      };

      const updatedSessions = [...prev.sessions];
      updatedSessions[sessionIndex] = updatedSession;

      let newRecoveryLevel = prev.currentRecoveryLevel;
      let newRecoveryAccumulated = prev.recoveryAccumulated;

      if (isWin) {
        newRecoveryLevel = 0;
        newRecoveryAccumulated = 0;
      } else {
        newRecoveryLevel = prev.currentRecoveryLevel + 1;
        newRecoveryAccumulated = prev.recoveryAccumulated + totalStake;
      }

      const newBankroll = prev.bankroll + bankrollChange;
      const newSnapshot = {
        timestamp: Date.now(),
        bankroll: newBankroll,
        label: isWin ? 'Gain' : 'Perte',
      };

      return {
        ...prev,
        sessions: updatedSessions,
        globalBalance: prev.globalBalance + profit,
        bankroll: newBankroll,
        totalRaces: prev.totalRaces + 1,
        wins: isWin ? prev.wins + 1 : prev.wins,
        losses: isWin ? prev.losses : prev.losses + 1,
        currentRecoveryLevel: newRecoveryLevel,
        recoveryAccumulated: newRecoveryAccumulated,
        bankrollHistory: [...prev.bankrollHistory, newSnapshot],
      };
    });
  }, []);

  const resetHistory = useCallback(() => {
    setHistory(getInitialHistory());
  }, []);

  const deleteSession = useCallback((sessionId: string) => {
    setHistory(prev => {
      const session = prev.sessions.find(s => s.id === sessionId);
      if (!session) return prev;

      const updatedSessions = prev.sessions.filter(s => s.id !== sessionId);
      
      if (session.result) {
        return {
          ...prev,
          sessions: updatedSessions,
          globalBalance: prev.globalBalance - session.result.profit,
          bankroll: prev.bankroll - session.result.profit,
          totalRaces: prev.totalRaces - 1,
          wins: session.result.isWin ? prev.wins - 1 : prev.wins,
          losses: session.result.isWin ? prev.losses : prev.losses - 1,
        };
      }

      return {
        ...prev,
        sessions: updatedSessions,
      };
    });
  }, []);

  const setBankroll = useCallback((amount: number) => {
    setHistory(prev => {
      const isInitial = prev.initialBankroll === 0;
      const newSnapshot = {
        timestamp: Date.now(),
        bankroll: amount,
        label: isInitial ? 'Initial' : 'Ajustement',
      };
      return {
        ...prev,
        bankroll: amount,
        initialBankroll: isInitial ? amount : prev.initialBankroll,
        bankrollHistory: isInitial ? [newSnapshot] : [...prev.bankrollHistory, newSnapshot],
      };
    });
  }, []);

  const setBetPercentage = useCallback((percentage: number) => {
    setHistory(prev => ({
      ...prev,
      betPercentage: Math.min(100, Math.max(1, percentage)),
    }));
  }, []);

  const getBetAmount = useCallback(() => {
    return Math.floor(history.bankroll * (history.betPercentage / 100));
  }, [history.bankroll, history.betPercentage]);

  return {
    history,
    isLoading: isLoading || authLoading,
    calculateStakes,
    addSession,
    updateSessionResult,
    resetHistory,
    deleteSession,
    setBankroll,
    setBetPercentage,
    getBetAmount,
  };
};

