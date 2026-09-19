
import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Calculator, 
  TrendingUp, 
  TrendingDown, 
  Trophy, 
  RotateCcw,
  Save,
  Trash2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Target,
  Wallet,
  Percent
} from 'lucide-react';
import { useBetDistributor } from '@/hooks/useBetDistributor';
import { AnalysisResult, Horse } from '@/types/racing';
import { StakeCalculation } from '@/types/betting';
import { cn } from '@/lib/utils';
import BankrollChart from './BankrollChart';

interface BetDistributorTabProps {
  result: AnalysisResult | null;
}

const BetDistributorTab = ({ result }: BetDistributorTabProps) => {
  const { 
    history, 
    calculateStakes, 
    addSession, 
    updateSessionResult, 
    resetHistory,
    deleteSession,
    setBankroll,
    setBetPercentage,
    getBetAmount
  } = useBetDistributor();

  const [targetProfit, setTargetProfit] = useState<number>(10);
  const [manualOdds, setManualOdds] = useState<[number, number, number]>([0, 0, 0]);
  const [manualHorses, setManualHorses] = useState<[number, number, number]>([0, 0, 0]);
  const [arrivee, setArrivee] = useState<string>('');
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [currentStakes, setCurrentStakes] = useState<StakeCalculation[]>([]);

  // Get top 3 horses from analysis result
  const top3Horses = useMemo((): Horse[] => {
    if (!result || !result.horses.length) return [];
    return result.topByCote.slice(0, 3);
  }, [result]);

  // Auto-fill from analysis when available
  useEffect(() => {
    if (top3Horses.length === 3) {
      setManualHorses([
        top3Horses[0].numero,
        top3Horses[1].numero,
        top3Horses[2].numero,
      ]);
      setManualOdds([
        top3Horses[0].cote,
        top3Horses[1].cote,
        top3Horses[2].cote,
      ]);
    }
  }, [top3Horses]);

  // Calculate stakes with recovery and bankroll percentage
  const betAmountFromBankroll = getBetAmount();
  
  const stakes = useMemo((): StakeCalculation[] => {
    const validOdds = manualOdds.filter(o => o > 1);
    if (validOdds.length === 0) return [];
    
    // Use target profit OR bankroll percentage-based amount
    const effectiveTarget = history.bankroll > 0 ? betAmountFromBankroll : targetProfit;
    
    return calculateStakes(effectiveTarget, validOdds, history.recoveryAccumulated);
  }, [targetProfit, manualOdds, history.recoveryAccumulated, history.bankroll, betAmountFromBankroll, calculateStakes]);

  const totalStake = useMemo(() => 
    stakes.reduce((sum, s) => sum + s.stake, 0)
  , [stakes]);

  const handleSaveSession = () => {
    if (stakes.length === 0) return;

    // Passer totalStake pour prélèvement automatique sur la bankroll
    const sessionId = addSession({
      raceName: `Course ${history.totalRaces + 1}`,
      targetProfit,
      horses: manualHorses.filter(h => h > 0),
      odds: manualOdds.filter(o => o > 1),
      stakes: stakes.map(s => s.stake),
      totalStake,
      recoveryLevel: history.currentRecoveryLevel,
    }, totalStake);

    setCurrentSessionId(sessionId);
    setCurrentStakes(stakes);
  };

  const handleRecordResult = () => {
    if (!currentSessionId || !arrivee) return;

    const winner = parseInt(arrivee.split(/[-\s,]+/)[0], 10);
    if (isNaN(winner)) return;

    // Find if winner is in our horses
    const winnerIndex = manualHorses.indexOf(winner);
    
    updateSessionResult(
      currentSessionId,
      winnerIndex >= 0 ? winnerIndex + 1 : 0,
      currentStakes
    );

    // Reset for next race
    setCurrentSessionId(null);
    setCurrentStakes([]);
    setArrivee('');
  };

  const winRate = history.totalRaces > 0 
    ? ((history.wins / history.totalRaces) * 100).toFixed(1)
    : '0';

  return (
    <div className="space-y-6">
      {/* Bankroll Card */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/30">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Wallet className="w-5 h-5 text-primary" />
            Gestion Bankroll
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Bankroll actuelle</Label>
              <Input
                type="number"
                min={0}
                value={history.bankroll || ''}
                onChange={(e) => setBankroll(parseFloat(e.target.value) || 0)}
                placeholder="Ex: 1000"
                className="bg-background font-bold text-lg"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Percent className="w-3 h-3" />
                Prélèvement (%)
              </Label>
              <Input
                type="number"
                min={1}
                max={100}
                value={history.betPercentage}
                onChange={(e) => setBetPercentage(parseFloat(e.target.value) || 5)}
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Mise calculée</Label>
              <div className="h-10 flex items-center px-3 rounded-md bg-background border border-border font-bold text-primary">
                {betAmountFromBankroll}€
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Évolution</Label>
              <div className={cn(
                "h-10 flex items-center px-3 rounded-md border font-bold",
                history.bankroll >= history.initialBankroll 
                  ? "bg-green-500/10 border-green-500/30 text-green-500" 
                  : "bg-red-500/10 border-red-500/30 text-red-500"
              )}>
                {history.initialBankroll > 0 
                  ? `${history.bankroll >= history.initialBankroll ? '+' : ''}${(((history.bankroll - history.initialBankroll) / history.initialBankroll) * 100).toFixed(1)}%`
                  : '—'
                }
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Global Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">{history.totalRaces}</div>
            <div className="text-xs text-muted-foreground">Courses</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-500">{history.wins}</div>
            <div className="text-xs text-muted-foreground">Gagnées</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-500">{history.losses}</div>
            <div className="text-xs text-muted-foreground">Perdues</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-500">{winRate}%</div>
            <div className="text-xs text-muted-foreground">Taux</div>
          </CardContent>
        </Card>
        <Card className={cn(
          "border-border",
          history.globalBalance >= 0 ? "bg-green-500/10" : "bg-red-500/10"
        )}>
          <CardContent className="p-4 text-center">
            <div className={cn(
              "text-2xl font-bold",
              history.globalBalance >= 0 ? "text-green-500" : "text-red-500"
            )}>
              {history.globalBalance >= 0 ? '+' : ''}{history.globalBalance.toFixed(2)}€
            </div>
            <div className="text-xs text-muted-foreground">Bilan</div>
          </CardContent>
        </Card>
      </div>

      {/* Bankroll Chart */}
      <BankrollChart 
        bankrollHistory={history.bankrollHistory || []} 
        initialBankroll={history.initialBankroll} 
      />

      {/* Recovery Alert */}
      {history.currentRecoveryLevel > 0 && (
        <Card className="bg-amber-500/10 border-amber-500/30">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <div>
              <div className="font-medium text-amber-500">
                Mode Récupération - Niveau {history.currentRecoveryLevel}
              </div>
              <div className="text-sm text-muted-foreground">
                Montant à récupérer: {history.recoveryAccumulated.toFixed(2)}€
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Calculator */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-primary" />
              Répartiteur de Mises
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Target Profit */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Target className="w-4 h-4" />
                Bénéfice souhaité (€)
              </Label>
              <Input
                type="number"
                min={1}
                value={targetProfit}
                onChange={(e) => setTargetProfit(Math.max(1, parseFloat(e.target.value) || 1))}
                className="bg-background"
              />
            </div>

            <Separator />

            {/* Top 3 Horses from Analysis */}
            {top3Horses.length > 0 && (
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                <div className="text-sm font-medium text-primary mb-2">
                  Top 3 importés automatiquement
                </div>
                <div className="flex gap-2">
                  {top3Horses.map((horse, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      N°{horse.numero} - {horse.cote.toFixed(1)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Manual Horse/Odds Input */}
            <div className="space-y-3">
              <Label>Chevaux et Cotes (Top 3)</Label>
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex gap-2">
                  <div className="flex-1">
                    <Input
                      type="number"
                      placeholder={`N° cheval ${i + 1}`}
                      value={manualHorses[i] || ''}
                      onChange={(e) => {
                        const newHorses = [...manualHorses] as [number, number, number];
                        newHorses[i] = parseInt(e.target.value) || 0;
                        setManualHorses(newHorses);
                      }}
                      className="bg-background"
                    />
                  </div>
                  <div className="flex-1">
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="Cote"
                      value={manualOdds[i] || ''}
                      onChange={(e) => {
                        const newOdds = [...manualOdds] as [number, number, number];
                        newOdds[i] = parseFloat(e.target.value) || 0;
                        setManualOdds(newOdds);
                      }}
                      className="bg-background"
                    />
                  </div>
                </div>
              ))}
            </div>

            <Separator />

            {/* Calculated Stakes */}
            {stakes.length > 0 && (
              <div className="space-y-3">
                <Label>Répartition des mises</Label>
                {stakes.map((stake, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-background">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-primary/20 text-primary">
                        N°{manualHorses[i]}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        @ {stake.odds.toFixed(1)}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-primary">{stake.stake}€</div>
                      <div className="text-xs text-muted-foreground">
                        Gain: {stake.potentialWin.toFixed(2)}€
                      </div>
                    </div>
                  </div>
                ))}
                
                <div className="flex justify-between items-center pt-2 border-t border-border">
                  <span className="font-medium">Mise totale:</span>
                  <span className="text-lg font-bold text-primary">{totalStake}€</span>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-4">
              <Button 
                onClick={handleSaveSession}
                disabled={stakes.length === 0 || currentSessionId !== null}
                className="flex-1"
              >
                <Save className="w-4 h-4 mr-2" />
                Enregistrer
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Result Input & History */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-primary" />
              Résultat & Historique
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Current Session Result */}
            {currentSessionId && (
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 space-y-3">
                <Label>Saisir l'arrivée</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Ex: 5-3-1"
                    value={arrivee}
                    onChange={(e) => setArrivee(e.target.value)}
                    className="bg-background"
                  />
                  <Button onClick={handleRecordResult}>
                    <CheckCircle className="w-4 h-4" />
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground">
                  Chevaux joués: {manualHorses.filter(h => h > 0).join(', ')}
                </div>
              </div>
            )}

            {/* Session History */}
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {history.sessions.slice(0, 10).map((session) => (
                <div 
                  key={session.id}
                  className={cn(
                    "p-3 rounded-lg border",
                    session.result?.isWin 
                      ? "bg-green-500/5 border-green-500/20" 
                      : session.result
                        ? "bg-red-500/5 border-red-500/20"
                        : "bg-card border-border"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {session.result ? (
                        session.result.isWin ? (
                          <TrendingUp className="w-4 h-4 text-green-500" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-red-500" />
                        )
                      ) : (
                        <div className="w-4 h-4 rounded-full bg-amber-500/20" />
                      )}
                      <span className="font-medium text-sm">{session.raceName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {session.result && (
                        <span className={cn(
                          "font-bold",
                          session.result.profit >= 0 ? "text-green-500" : "text-red-500"
                        )}>
                          {session.result.profit >= 0 ? '+' : ''}
                          {session.result.profit.toFixed(2)}€
                        </span>
                      )}
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => deleteSession(session.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Chevaux: {session.horses.join(', ')} | Mise: {session.totalStake}€
                    {session.recoveryLevel > 0 && (
                      <span className="text-amber-500 ml-2">
                        (Récup. niv.{session.recoveryLevel})
                      </span>
                    )}
                  </div>
                </div>
              ))}

              {history.sessions.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <XCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Aucune session enregistrée</p>
                </div>
              )}
            </div>

            {/* Reset Button */}
            {history.sessions.length > 0 && (
              <Button 
                variant="destructive" 
                onClick={resetHistory}
                className="w-full"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Réinitialiser l'historique
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BetDistributorTab;

