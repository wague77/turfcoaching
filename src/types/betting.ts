
export interface BetSession {
  id: string;
  timestamp: number;
  raceName?: string;
  targetProfit: number;
  horses: number[]; // Top 3 horses
  odds: number[]; // Odds for each horse
  stakes: number[]; // Calculated stakes
  totalStake: number;
  result?: {
    winner: number;
    profit: number;
    isWin: boolean;
  };
  recoveryLevel: number; // 0 = initial, 1+ = recovery attempts
}

export interface BankrollSnapshot {
  timestamp: number;
  bankroll: number;
  label?: string;
}

export interface BetHistory {
  sessions: BetSession[];
  globalBalance: number;
  totalRaces: number;
  wins: number;
  losses: number;
  currentRecoveryLevel: number;
  recoveryAccumulated: number;
  bankroll: number;
  initialBankroll: number;
  betPercentage: number;
  bankrollHistory: BankrollSnapshot[];
}

export interface StakeCalculation {
  horse: number;
  odds: number;
  stake: number;
  potentialWin: number;
}

