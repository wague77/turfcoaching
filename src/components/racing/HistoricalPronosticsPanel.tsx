
import { useMemo, useEffect, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Target,
  TrendingDown,
  TrendingUp,
  Sparkles,
  Trophy,
  Medal,
  Zap,
  Brain,
  BarChart3,
} from 'lucide-react';
import { RaceOddsHistory, OddsSnapshot } from '@/hooks/useOddsHistory';
import { usePronosticsPerformance } from '@/hooks/usePronosticsPerformance';
import PronosticsPerformanceHistory from './PronosticsPerformanceHistory';

interface HistoricalPronosticsPanelProps {
  oddsHistory: RaceOddsHistory[];
  currentSnapshots?: OddsSnapshot[];
  currentArrivee?: { positions: number[]; recordedAt: string };
  date?: string;
  reunion?: number;
  course?: number;
}

interface HorseStats {
  numero: number;
  wins: number;
  places: number;
  top5: number;
  avgOdds: number;
  totalBaisse: number;
  totalHausse: number;
  occurrencesInBaisse: number;
  occurrencesInHausse: number;
  successRateInBaisse: number;
  currentTrend?: 'baisse' | 'hausse' | 'stable';
  currentOdds?: number;
  currentRank?: number; // Classement horaire (1 = plus joué, etc.)
  horseName?: string;
}

const HistoricalPronosticsPanel = ({ 
  oddsHistory, 
  currentSnapshots,
  currentArrivee,
  date,
  reunion,
  course
}: HistoricalPronosticsPanelProps) => {
  const { history, addEntry, deleteEntry, clearHistory, getStats } = usePronosticsPerformance();
  const lastSavedRef = useRef<string | null>(null);
  // Compute historical stats and pronostics
  const { 
    horsesStats, 
    suggestedBases, 
    suggestedOutsiders,
    suggestedCouples,
    suggestedTierces,
    confidence 
  } = useMemo(() => {
    const racesWithArrivee = oddsHistory.filter(r => r.arrivee && r.snapshots.length >= 1);
    
    const horseStatsMap = new Map<number, HorseStats>();
    const coupleStats = new Map<string, { count: number; wins: number; trend: 'hausse' | 'baisse' | 'mixed' }>();
    const tierceStats = new Map<string, { count: number; wins: number; avgTrend: number }>();
    
    // Analyze historical data
    racesWithArrivee.forEach(race => {
      if (!race.arrivee || race.snapshots.length < 1) return;
      
      const firstSnapshot = race.snapshots[0];
      const lastSnapshot = race.snapshots[race.snapshots.length - 1];
      const positions = race.arrivee.positions;
      
      // Calculate horse trends for this race
      lastSnapshot.horses.forEach(horse => {
        const firstOdds = firstSnapshot.horses.find(h => h.numero === horse.numero)?.cote || horse.cote;
        const change = horse.cote - firstOdds;
        const posIdx = positions.indexOf(horse.numero);
        
        if (!horseStatsMap.has(horse.numero)) {
          horseStatsMap.set(horse.numero, {
            numero: horse.numero,
            wins: 0,
            places: 0,
            top5: 0,
            avgOdds: 0,
            totalBaisse: 0,
            totalHausse: 0,
            occurrencesInBaisse: 0,
            occurrencesInHausse: 0,
            successRateInBaisse: 0,
          });
        }
        
        const stats = horseStatsMap.get(horse.numero)!;
        if (posIdx === 0) stats.wins++;
        if (posIdx >= 0 && posIdx < 3) stats.places++;
        if (posIdx >= 0 && posIdx < 5) stats.top5++;
        
        if (change < 0) {
          stats.totalBaisse += Math.abs(change);
          stats.occurrencesInBaisse++;
          if (posIdx >= 0 && posIdx < 3) {
            stats.successRateInBaisse++;
          }
        } else if (change > 0) {
          stats.totalHausse += change;
          stats.occurrencesInHausse++;
        }
      });
      
      // Extract couples from Top 2 arrivals
      if (positions.length >= 2) {
        const couple = [positions[0], positions[1]].sort((a, b) => a - b).join('-');
        if (!coupleStats.has(couple)) {
          coupleStats.set(couple, { count: 0, wins: 0, trend: 'mixed' });
        }
        coupleStats.get(couple)!.count++;
        coupleStats.get(couple)!.wins++;
      }
      
      // Extract trifectas from Top 3 arrivals
      if (positions.length >= 3) {
        const tierce = [positions[0], positions[1], positions[2]].sort((a, b) => a - b).join('-');
        if (!tierceStats.has(tierce)) {
          tierceStats.set(tierce, { count: 0, wins: 0, avgTrend: 0 });
        }
        tierceStats.get(tierce)!.count++;
        tierceStats.get(tierce)!.wins++;
      }
    });
    
    // Enrich with current race data if available (includes hourly ranking)
    if (currentSnapshots && currentSnapshots.length >= 1) {
      const firstSnapshot = currentSnapshots[0];
      const lastSnapshot = currentSnapshots[currentSnapshots.length - 1];
      
      // Sort horses by current odds to get hourly ranking (plus joués → moins joués)
      const sortedByOdds = [...lastSnapshot.horses].sort((a, b) => a.cote - b.cote);
      const horseRankMap = new Map<number, number>();
      sortedByOdds.forEach((horse, index) => {
        horseRankMap.set(horse.numero, index + 1); // 1 = plus joué
      });
      
      lastSnapshot.horses.forEach(horse => {
        const firstOdds = firstSnapshot.horses.find(h => h.numero === horse.numero)?.cote || horse.cote;
        const change = horse.cote - firstOdds;
        const rank = horseRankMap.get(horse.numero) || 99;
        
        if (horseStatsMap.has(horse.numero)) {
          const stats = horseStatsMap.get(horse.numero)!;
          stats.currentOdds = horse.cote;
          stats.currentTrend = change < -0.5 ? 'baisse' : change > 0.5 ? 'hausse' : 'stable';
          stats.currentRank = rank;
          stats.horseName = horse.name;
        } else {
          // New horse not in history, add it
          horseStatsMap.set(horse.numero, {
            numero: horse.numero,
            wins: 0,
            places: 0,
            top5: 0,
            avgOdds: horse.cote,
            totalBaisse: 0,
            totalHausse: 0,
            occurrencesInBaisse: 0,
            occurrencesInHausse: 0,
            successRateInBaisse: 0,
            currentOdds: horse.cote,
            currentTrend: change < -0.5 ? 'baisse' : change > 0.5 ? 'hausse' : 'stable',
            currentRank: rank,
            horseName: horse.name,
          });
        }
      });
    }
    
    const allStats = Array.from(horseStatsMap.values());
    
    // Calculate success rate for horses in baisse
    allStats.forEach(stats => {
      if (stats.occurrencesInBaisse > 0) {
        stats.successRateInBaisse = (stats.successRateInBaisse / stats.occurrencesInBaisse) * 100;
      }
    });
    
    // Determine suggested bases: 
    // - Must be in Top 8 of classement horaire (most played)
    // - Priority to horses in current baisse with historical success
    // - Or historically successful horses in baisse
    const suggestedBases = allStats
      .filter(h => {
        // Must have current data and be in Top 8 of hourly ranking
        if (!h.currentRank || h.currentRank > 8) return false;
        // If we have current data, prioritize current baisse with history
        if (h.currentTrend === 'baisse' && h.wins > 0) return true;
        // Or historically successful in baisse and in top 5 ranking
        if (h.occurrencesInBaisse > 0 && h.wins > 0 && h.currentRank <= 5) return true;
        // Or strong favorites (top 3) in baisse even without history
        if (h.currentRank <= 3 && h.currentTrend === 'baisse') return true;
        return false;
      })
      .sort((a, b) => {
        // First, prioritize by hourly ranking (favorites first)
        const aRank = a.currentRank || 99;
        const bRank = b.currentRank || 99;
        
        // Weight: combine ranking with trend and history
        const aScore = (10 - Math.min(aRank, 10)) * 10 + // Ranking weight (0-90)
          (a.currentTrend === 'baisse' ? 30 : 0) + // Baisse bonus
          (a.wins * 5) + // Win bonus
          (a.successRateInBaisse / 10); // Success rate bonus
        
        const bScore = (10 - Math.min(bRank, 10)) * 10 +
          (b.currentTrend === 'baisse' ? 30 : 0) +
          (b.wins * 5) +
          (b.successRateInBaisse / 10);
        
        return bScore - aScore;
      })
      .slice(0, 3);
    
    // Suggested outsiders: horses outside Top 5 but in baisse with potential
    const suggestedOutsiders = allStats
      .filter(h => {
        // Must have current rank data
        if (!h.currentRank) return false;
        // Must be outside Top 5 favorites but not too far (rank 6-12)
        if (h.currentRank < 6 || h.currentRank > 12) return false;
        // Must be in baisse trend
        if (h.currentTrend !== 'baisse') return false;
        // Some historical success or decent current odds
        if (h.places > 0 || (h.currentOdds && h.currentOdds >= 8 && h.currentOdds <= 25)) return true;
        return false;
      })
      .sort((a, b) => {
        // Score outsiders: prioritize baisse amount and ranking position
        const aRank = a.currentRank || 99;
        const bRank = b.currentRank || 99;
        
        // Prefer horses closer to favorites (rank 6-8) with strong baisse
        const aScore = (15 - Math.min(aRank, 15)) * 5 + // Ranking proximity bonus
          (a.currentTrend === 'baisse' ? 20 : 0) +
          (a.places * 10); // Historical places bonus
        
        const bScore = (15 - Math.min(bRank, 15)) * 5 +
          (b.currentTrend === 'baisse' ? 20 : 0) +
          (b.places * 10);
        
        return bScore - aScore;
      })
      .slice(0, 2);
    
    // Generate suggested couples from bases + outsiders
    const allSuggested = [...suggestedBases, ...suggestedOutsiders].slice(0, 5);
    const suggestedCouples: string[] = [];
    for (let i = 0; i < allSuggested.length && suggestedCouples.length < 6; i++) {
      for (let j = i + 1; j < allSuggested.length && suggestedCouples.length < 6; j++) {
        const couple = [allSuggested[i].numero, allSuggested[j].numero].sort((a, b) => a - b).join('-');
        suggestedCouples.push(couple);
      }
    }
    
    // Suggested trifectas (bases combined with outsiders)
    const suggestedTierces: string[] = [];
    if (allSuggested.length >= 3) {
      for (let i = 0; i < Math.min(allSuggested.length, 4) && suggestedTierces.length < 3; i++) {
        for (let j = i + 1; j < Math.min(allSuggested.length, 5) && suggestedTierces.length < 3; j++) {
          for (let k = j + 1; k < allSuggested.length && suggestedTierces.length < 3; k++) {
            const tierce = [allSuggested[i].numero, allSuggested[j].numero, allSuggested[k].numero]
              .sort((a, b) => a - b).join('-');
            suggestedTierces.push(tierce);
          }
        }
      }
    }
    
    // Calculate confidence score
    const totalRaces = racesWithArrivee.length;
    const hasCurrentData = currentSnapshots && currentSnapshots.length > 0;
    const confidence = Math.min(
      100,
      Math.round(
        (totalRaces >= 10 ? 40 : totalRaces * 4) +
        (hasCurrentData ? 30 : 0) +
        (suggestedBases.length >= 2 ? 20 : suggestedBases.length * 10) +
        (suggestedBases.some(b => b.currentTrend === 'baisse') ? 10 : 0)
      )
    );
    
    return {
      horsesStats: allStats,
      suggestedBases,
      suggestedOutsiders,
      suggestedCouples,
      suggestedTierces,
      confidence,
    };
  }, [oddsHistory, currentSnapshots, currentArrivee]);
  
  const racesWithArrivee = oddsHistory.filter(r => r.arrivee && r.snapshots.length >= 1);
  const stats = getStats();
  
  // Auto-save performance when arrivée is registered
  useEffect(() => {
    if (
      currentArrivee && 
      date && 
      reunion !== undefined && 
      course !== undefined &&
      suggestedBases.length > 0 &&
      currentArrivee.positions.length >= 3
    ) {
      const raceKey = `${date}-${reunion}-${course}`;
      if (lastSavedRef.current !== raceKey) {
        addEntry(
          date,
          reunion,
          course,
          suggestedBases.map(b => b.numero),
          suggestedOutsiders.map(o => o.numero),
          suggestedCouples,
          suggestedTierces,
          confidence,
          currentArrivee.positions
        );
        lastSavedRef.current = raceKey;
      }
    }
  }, [currentArrivee, date, reunion, course, suggestedBases, suggestedOutsiders, suggestedCouples, suggestedTierces, confidence, addEntry]);
  
  if (racesWithArrivee.length === 0 && (!currentSnapshots || currentSnapshots.length === 0)) {
    return null;
  }
  
  return (
    <div className="space-y-4">
      <Card className="border-yellow-500/30 bg-gradient-to-br from-yellow-500/5 to-orange-500/5">
        <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-yellow-500" />
            <span>Pronostics Suggérés</span>
            <Badge variant="secondary" className="text-xs">
              Basé sur {racesWithArrivee.length} course(s)
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Confiance:</span>
            <Badge 
              variant={confidence >= 70 ? 'default' : confidence >= 40 ? 'secondary' : 'outline'}
              className={confidence >= 70 ? 'bg-green-600' : confidence >= 40 ? 'bg-yellow-600' : ''}
            >
              {confidence}%
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Bases suggérées */}
        <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
          <h5 className="text-sm font-medium flex items-center gap-2 mb-2 text-green-600">
            <Target className="w-4 h-4" />
            BASES SUGGÉRÉES
            <Badge variant="outline" className="text-xs border-green-500/30">
              Top 8 Classement Horaire
            </Badge>
          </h5>
          <div className="flex flex-wrap gap-2">
            {suggestedBases.length > 0 ? suggestedBases.map((horse, idx) => (
              <Badge 
                key={horse.numero}
                className={`text-sm py-1.5 px-3 ${
                  idx === 0 ? 'bg-green-600 text-white' :
                  'bg-green-500/20 text-green-700 border border-green-500/30'
                }`}
              >
                {horse.currentRank && (
                  <span className="mr-1 text-xs opacity-70">#{horse.currentRank}</span>
                )}
                <span className="font-bold">N°{horse.numero}</span>
                {horse.currentOdds && (
                  <span className="ml-1 opacity-80">({horse.currentOdds.toFixed(1)})</span>
                )}
                {horse.currentTrend === 'baisse' && (
                  <TrendingDown className="w-3 h-3 ml-1" />
                )}
                <span className="ml-1 text-xs opacity-70">
                  {horse.wins}🏆 {horse.places}📍
                </span>
              </Badge>
            )) : (
              <span className="text-sm text-muted-foreground">
                Chargez les cotes pour voir les suggestions basées sur le classement horaire
              </span>
            )}
          </div>
        </div>
        
        {/* Outsiders suggérés */}
        <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
          <h5 className="text-sm font-medium flex items-center gap-2 mb-2 text-orange-600">
            <Zap className="w-4 h-4" />
            OUTSIDERS SUGGÉRÉS
            <Badge variant="outline" className="text-xs border-orange-500/30">
              Rang 6-12 en baisse
            </Badge>
          </h5>
          <div className="flex flex-wrap gap-2">
            {suggestedOutsiders.length > 0 ? suggestedOutsiders.map(horse => (
              <Badge 
                key={horse.numero}
                variant="outline"
                className="text-sm py-1.5 px-3 border-orange-500/30 bg-orange-500/10 text-orange-700"
              >
                {horse.currentRank && (
                  <span className="mr-1 text-xs opacity-70">#{horse.currentRank}</span>
                )}
                <span className="font-bold">N°{horse.numero}</span>
                {horse.currentOdds && (
                  <span className="ml-1 opacity-80">({horse.currentOdds.toFixed(1)})</span>
                )}
                {horse.currentTrend === 'baisse' && (
                  <TrendingDown className="w-3 h-3 ml-1 text-green-500" />
                )}
                {horse.places > 0 && (
                  <span className="ml-1 text-xs opacity-70">{horse.places}📍</span>
                )}
              </Badge>
            )) : (
              <span className="text-sm text-muted-foreground">
                Aucun outsider en baisse (rang 6-12) identifié
              </span>
            )}
          </div>
        </div>
        
        {/* Couplés suggérés */}
        <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <h5 className="text-sm font-medium flex items-center gap-2 mb-2 text-blue-600">
            <Sparkles className="w-4 h-4" />
            COUPLÉS SUGGÉRÉS
          </h5>
          <div className="flex flex-wrap gap-2">
            {suggestedCouples.length > 0 ? suggestedCouples.map((couple, idx) => (
              <Badge 
                key={couple}
                variant={idx < 3 ? 'default' : 'outline'}
                className={`text-sm py-1.5 px-3 font-mono ${
                  idx < 3 ? 'bg-blue-600' : 'border-blue-500/30 bg-blue-500/10 text-blue-700'
                }`}
              >
                {couple}
              </Badge>
            )) : (
              <span className="text-sm text-muted-foreground">
                Pas assez de données
              </span>
            )}
          </div>
        </div>
        
        {/* Tiercés suggérés */}
        {suggestedTierces.length > 0 && (
          <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
            <h5 className="text-sm font-medium flex items-center gap-2 mb-2 text-purple-600">
              <Medal className="w-4 h-4" />
              TIERCÉS SUGGÉRÉS
            </h5>
            <div className="flex flex-wrap gap-2">
              {suggestedTierces.map((tierce, idx) => (
                <Badge 
                  key={tierce}
                  variant={idx === 0 ? 'default' : 'outline'}
                  className={`text-sm py-1.5 px-3 font-mono ${
                    idx === 0 ? 'bg-purple-600' : 'border-purple-500/30 bg-purple-500/10 text-purple-700'
                  }`}
                >
                  {tierce}
                </Badge>
              ))}
            </div>
          </div>
        )}
        
        {/* Statistics summary */}
        <div className="mt-4 pt-3 border-t border-border/50">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="p-2 rounded bg-muted/50 text-center">
              <BarChart3 className="w-3 h-3 mx-auto mb-1 text-muted-foreground" />
              <div className="font-bold">{racesWithArrivee.length}</div>
              <div className="text-muted-foreground">Courses analysées</div>
            </div>
            <div className="p-2 rounded bg-muted/50 text-center">
              <Trophy className="w-3 h-3 mx-auto mb-1 text-yellow-500" />
              <div className="font-bold">{suggestedBases.reduce((sum, h) => sum + h.wins, 0)}</div>
              <div className="text-muted-foreground">Victoires bases</div>
            </div>
            <div className="p-2 rounded bg-muted/50 text-center">
              <TrendingDown className="w-3 h-3 mx-auto mb-1 text-green-500" />
              <div className="font-bold">
                {suggestedBases.filter(b => b.currentTrend === 'baisse').length}/{suggestedBases.length}
              </div>
              <div className="text-muted-foreground">Bases en baisse</div>
            </div>
            <div className="p-2 rounded bg-muted/50 text-center">
              <Zap className="w-3 h-3 mx-auto mb-1 text-orange-500" />
              <div className="font-bold">{suggestedOutsiders.length}</div>
              <div className="text-muted-foreground">Outsiders</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
    
    {/* Performance History */}
    <PronosticsPerformanceHistory 
      history={history}
      stats={stats}
      onDelete={deleteEntry}
      onClear={clearHistory}
    />
    </div>
  );
};

export default HistoricalPronosticsPanel;

