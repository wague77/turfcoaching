
import { useState, useMemo, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BarChart3, Trophy, Medal, TrendingUp, Award, ArrowUpDown, ArrowUp, ArrowDown, Target, Sparkles, Layers, CheckCircle2, XCircle, Save } from 'lucide-react';
import { PMUHorse } from '@/lib/pmu-api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useConsensusHistory } from '@/hooks/useConsensusHistory';
import ConsensusHistoryPanel from './ConsensusHistoryPanel';
import { toast } from 'sonner';

interface HorseStatsTabProps {
  fetchedHorses: PMUHorse[];
  arrivee?: number[];
  raceName?: string;
}

interface HorseStats {
  numero: number;
  name: string;
  courses: number;
  victoires: number;
  places: number;
  pctVictoires: number;
  pctVictoiresPlaces: number;
  cote: number;
}

type SortKey = 'numero' | 'name' | 'courses' | 'victoires' | 'places' | 'pctVictoires' | 'pctVictoiresPlaces';
type SortDirection = 'asc' | 'desc';

// Synthesis Combinations Component with Success Counter
interface SynthesisCombinationsProps {
  synthesisConsensus: number[];
  arrivee: number[];
  onSave?: (data: { couplesTotal: number; couplesSuccess: number; tiercesTotal: number; tiercesSuccess: number }) => void;
  canSave?: boolean;
}

// Helper to render colored number (even=green, odd=red)
const ColoredNumber = ({ num }: { num: number }) => (
  <span className={num % 2 === 0 ? 'text-green-400' : 'text-red-400'}>
    {num}
  </span>
);

const SynthesisCombinations = ({ synthesisConsensus, arrivee, onSave, canSave }: SynthesisCombinationsProps) => {
  // Generate Couplés
  const couples = useMemo(() => {
    const result: { nums: [number, number]; isMixed: boolean; inArrivee: boolean }[] = [];
    for (let i = 0; i < synthesisConsensus.length && result.length < 15; i++) {
      for (let j = i + 1; j < synthesisConsensus.length && result.length < 15; j++) {
        const n1 = synthesisConsensus[i];
        const n2 = synthesisConsensus[j];
        const isMixed = (n1 % 2 !== n2 % 2);
        const inArrivee = [n1, n2].every(n => arrivee.slice(0, 2).includes(n));
        result.push({ nums: [n1, n2], isMixed, inArrivee });
      }
    }
    return result;
  }, [synthesisConsensus, arrivee]);

  // Generate Tiercés
  const tierces = useMemo(() => {
    const result: { nums: [number, number, number]; isMixed: boolean; inArrivee: boolean }[] = [];
    if (synthesisConsensus.length < 3) return result;
    for (let i = 0; i < synthesisConsensus.length && result.length < 20; i++) {
      for (let j = i + 1; j < synthesisConsensus.length && result.length < 20; j++) {
        for (let k = j + 1; k < synthesisConsensus.length && result.length < 20; k++) {
          const n1 = synthesisConsensus[i];
          const n2 = synthesisConsensus[j];
          const n3 = synthesisConsensus[k];
          const parities = [n1 % 2, n2 % 2, n3 % 2];
          const isMixed = !(parities.every(p => p === 0) || parities.every(p => p === 1));
          const inArrivee = [n1, n2, n3].every(n => arrivee.slice(0, 3).includes(n));
          result.push({ nums: [n1, n2, n3], isMixed, inArrivee });
        }
      }
    }
    return result;
  }, [synthesisConsensus, arrivee]);

  // Calculate success counts
  const couplesSuccess = couples.filter(c => c.inArrivee).length;
  const tiercesSuccess = tierces.filter(t => t.inArrivee).length;
  const hasArrivee = arrivee.length >= 2;

  return (
    <>
      {/* Success Counter Banner */}
      {hasArrivee && (
        <div className="flex flex-col sm:flex-row gap-4 p-4 rounded-lg bg-card/50 border border-border">
          <div className="flex items-center gap-3 flex-1">
            <div className={`p-2 rounded-lg ${couplesSuccess > 0 ? 'bg-green-500/20' : 'bg-destructive/20'}`}>
              {couplesSuccess > 0 ? (
                <CheckCircle2 className="w-5 h-5 text-green-400" />
              ) : (
                <XCircle className="w-5 h-5 text-destructive" />
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Couplés gagnants</p>
              <p className={`text-xl font-bold ${couplesSuccess > 0 ? 'text-green-400' : 'text-destructive'}`}>
                {couplesSuccess} / {couples.length}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-1">
            <div className={`p-2 rounded-lg ${tiercesSuccess > 0 ? 'bg-green-500/20' : 'bg-destructive/20'}`}>
              {tiercesSuccess > 0 ? (
                <CheckCircle2 className="w-5 h-5 text-green-400" />
              ) : (
                <XCircle className="w-5 h-5 text-destructive" />
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Tiercés gagnants</p>
              <p className={`text-xl font-bold ${tiercesSuccess > 0 ? 'text-green-400' : 'text-destructive'}`}>
                {tiercesSuccess} / {tierces.length}
              </p>
            </div>
          </div>
          {canSave && onSave && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSave({
                couplesTotal: couples.length,
                couplesSuccess,
                tiercesTotal: tierces.length,
                tiercesSuccess,
              })}
              className="self-center bg-amber-500/20 border-amber-500/50 text-amber-300 hover:bg-amber-500/30"
            >
              <Save className="w-4 h-4 mr-2" />
              Sauvegarder
            </Button>
          )}
        </div>
      )}

      {/* Couplés */}
      <div>
        <h4 className="flex items-center gap-2 text-sm font-semibold text-violet-300 mb-3">
          <Layers className="w-4 h-4" />
          Couplés ({couples.length} combinaisons)
          {hasArrivee && couplesSuccess > 0 && (
            <Badge className="ml-2 bg-green-500/20 text-green-400 border-green-500/50">
              {couplesSuccess} gagnant{couplesSuccess > 1 ? 's' : ''}
            </Badge>
          )}
        </h4>
        <div className="flex flex-wrap gap-2">
          {couples.map((couple, idx) => (
            <Badge 
              key={idx} 
              variant="outline"
              className={`px-3 py-1.5 font-mono font-semibold ${
                couple.isMixed 
                  ? 'bg-gradient-to-r from-cyan-500/30 to-pink-500/30 text-cyan-200 border-cyan-400/60' 
                  : 'bg-violet-500/20 text-violet-300 border-violet-500/50'
              } ${couple.inArrivee ? 'ring-2 ring-yellow-400' : ''}`}
            >
              <ColoredNumber num={couple.nums[0]} /> - <ColoredNumber num={couple.nums[1]} />
              {couple.isMixed && <span className="ml-1 text-[10px] opacity-70">(M)</span>}
            </Badge>
          ))}
        </div>
      </div>

      {/* Tiercés */}
      {tierces.length > 0 && (
        <div>
          <h4 className="flex items-center gap-2 text-sm font-semibold text-fuchsia-300 mb-3">
            <Trophy className="w-4 h-4" />
            Tiercés ({tierces.length} combinaisons)
            {hasArrivee && tiercesSuccess > 0 && (
              <Badge className="ml-2 bg-green-500/20 text-green-400 border-green-500/50">
                {tiercesSuccess} gagnant{tiercesSuccess > 1 ? 's' : ''}
              </Badge>
            )}
          </h4>
          <div className="flex flex-wrap gap-2">
            {tierces.map((tierce, idx) => (
              <Badge 
                key={idx} 
                variant="outline"
                className={`px-3 py-1.5 font-mono font-semibold ${
                  tierce.isMixed 
                    ? 'bg-gradient-to-r from-cyan-500/30 via-purple-500/30 to-pink-500/30 text-cyan-200 border-cyan-400/60' 
                    : 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/50'
                } ${tierce.inArrivee ? 'ring-2 ring-yellow-400' : ''}`}
              >
              <ColoredNumber num={tierce.nums[0]} /> - <ColoredNumber num={tierce.nums[1]} /> - <ColoredNumber num={tierce.nums[2]} />
              {tierce.isMixed && <span className="ml-1 text-[10px] opacity-70">(M)</span>}
            </Badge>
          ))}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-border/50 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-green-400">12</span>
          <span>Numéro pair</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-red-400">7</span>
          <span>Numéro impair</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-violet-500/30 border border-violet-500/50" />
          <span>Parité homogène</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-gradient-to-r from-cyan-500/30 to-pink-500/30 border border-cyan-400/60" />
          <span>Parité mixte (M)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-muted border-2 border-yellow-400" />
          <span>Dans l'arrivée</span>
        </div>
      </div>
    </>
  );
};

const HorseStatsTab = ({ fetchedHorses, arrivee = [], raceName }: HorseStatsTabProps) => {
  const [sortKey, setSortKey] = useState<SortKey>('numero');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const { history, stats: consensusStats, addEntry, deleteEntry, clearHistory } = useConsensusHistory();
  const [savedConsensusKey, setSavedConsensusKey] = useState<string | null>(null);

  if (fetchedHorses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <BarChart3 className="w-16 h-16 text-muted-foreground/30 mb-4" />
        <h3 className="text-xl font-semibold text-muted-foreground mb-2">
          Aucune donnée disponible
        </h3>
        <p className="text-sm text-muted-foreground">
          Importez les données PMU dans l'onglet "Données & Analyse" pour voir les statistiques
        </p>
      </div>
    );
  }

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection(key === 'numero' || key === 'name' ? 'asc' : 'desc');
    }
  };

  const getSortIcon = (key: SortKey) => {
    if (sortKey !== key) return <ArrowUpDown className="w-4 h-4 ml-1 opacity-50" />;
    return sortDirection === 'asc' 
      ? <ArrowUp className="w-4 h-4 ml-1 text-primary" /> 
      : <ArrowDown className="w-4 h-4 ml-1 text-primary" />;
  };

  // Calculate stats for each horse
  const baseStats: HorseStats[] = fetchedHorses
    .filter(h => h.numero > 0)
    .map(horse => {
      const courses = horse.numberOfRaces || 0;
      const victoires = horse.numberOfWins || 0;
      const places = (horse.numberOfPlacesSecond || 0) + (horse.numberOfPlacesThird || 0);
      const pctVictoires = courses > 0 ? (victoires / courses) * 100 : 0;
      const totalPlaces = victoires + places;
      const pctVictoiresPlaces = courses > 0 ? (totalPlaces / courses) * 100 : 0;

      return {
        numero: horse.numero,
        name: horse.name || `Cheval ${horse.numero}`,
        courses,
        victoires,
        places: totalPlaces,
        pctVictoires,
        pctVictoiresPlaces,
        cote: horse.cote || horse.lastDirectRatio || 0,
      };
    });

  // Sort stats based on current sort key and direction
  const stats = [...baseStats].sort((a, b) => {
    const aVal = a[sortKey];
    const bVal = b[sortKey];
    
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortDirection === 'asc' 
        ? aVal.localeCompare(bVal) 
        : bVal.localeCompare(aVal);
    }
    
    return sortDirection === 'asc' 
      ? (aVal as number) - (bVal as number) 
      : (bVal as number) - (aVal as number);
  });

  // Generate synthesis: top horses by combined percentage
  const synthesisByPerformance = [...baseStats]
    .sort((a, b) => b.pctVictoiresPlaces - a.pctVictoiresPlaces)
    .slice(0, 8)
    .map(h => h.numero);

  // Generate synthesis: top horses by cote (lowest odds = favorites)
  const synthesisByCote = [...baseStats]
    .filter(h => h.cote > 0)
    .sort((a, b) => a.cote - b.cote)
    .slice(0, 8)
    .map(h => h.numero);

  // Generate synthesis: horses present in BOTH performance AND cote rankings
  const synthesisConsensus = synthesisByPerformance.filter(n => synthesisByCote.includes(n));

  // Get position color for arrivals
  const getPositionBg = (numero: number): string => {
    const position = arrivee.indexOf(numero);
    if (position === 0) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
    if (position === 1) return 'bg-slate-400/20 text-slate-300 border-slate-400/50';
    if (position === 2) return 'bg-orange-500/20 text-orange-400 border-orange-500/50';
    if (position === 3) return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
    if (position === 4) return 'bg-purple-500/20 text-purple-400 border-purple-500/50';
    return '';
  };

  const isInArrivee = (numero: number): boolean => arrivee.includes(numero);

  // Calculate global stats using baseStats (unsorted)
  const avgVictoires = baseStats.reduce((acc, h) => acc + h.pctVictoires, 0) / baseStats.length;
  const avgVictoiresPlaces = baseStats.reduce((acc, h) => acc + h.pctVictoiresPlaces, 0) / baseStats.length;
  const topPerformer = [...baseStats].sort((a, b) => b.pctVictoiresPlaces - a.pctVictoiresPlaces)[0];

  return (
    <div className="space-y-6">
      {/* Global Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card/50 border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-primary/20">
                <Trophy className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Moyenne % Victoires</p>
                <p className="text-2xl font-bold text-primary">{avgVictoires.toFixed(2)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-accent/20">
                <Medal className="w-6 h-6 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Moyenne % Victoires & Places</p>
                <p className="text-2xl font-bold text-accent">{avgVictoiresPlaces.toFixed(2)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-yellow-500/20">
                <Award className="w-6 h-6 text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Meilleur Performer</p>
                <p className="text-lg font-bold text-yellow-400">
                  N°{topPerformer?.numero} - {topPerformer?.pctVictoiresPlaces.toFixed(2)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bar Chart */}
      <Card className="bg-card/50 border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Graphique des Performances
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={baseStats.sort((a, b) => a.numero - b.numero).map(h => ({
                  name: `N°${h.numero}`,
                  numero: h.numero,
                  '% Victoires': parseFloat(h.pctVictoires.toFixed(2)),
                  '% Victoires et Places': parseFloat(h.pctVictoiresPlaces.toFixed(2)),
                }))}
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis 
                  dataKey="name" 
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  domain={[0, 100]}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'hsl(var(--foreground))',
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 'bold' }}
                  formatter={(value: number) => [`${value}%`, '']}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: '20px' }}
                />
                <Bar 
                  dataKey="% Victoires" 
                  fill="hsl(var(--primary))" 
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
                <Bar 
                  dataKey="% Victoires et Places" 
                  fill="hsl(var(--accent))" 
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Stats Table */}
      <Card className="bg-card/50 border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Statistiques des Chevaux
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead 
                    className="text-muted-foreground font-semibold cursor-pointer hover:text-foreground transition-colors"
                    onClick={() => handleSort('numero')}
                  >
                    <div className="flex items-center">
                      N°{getSortIcon('numero')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="text-muted-foreground font-semibold cursor-pointer hover:text-foreground transition-colors"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center">
                      Cheval{getSortIcon('name')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="text-muted-foreground font-semibold text-center cursor-pointer hover:text-foreground transition-colors"
                    onClick={() => handleSort('courses')}
                  >
                    <div className="flex items-center justify-center">
                      Courses{getSortIcon('courses')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="text-muted-foreground font-semibold text-center cursor-pointer hover:text-foreground transition-colors"
                    onClick={() => handleSort('victoires')}
                  >
                    <div className="flex items-center justify-center">
                      Victoires{getSortIcon('victoires')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="text-muted-foreground font-semibold text-center cursor-pointer hover:text-foreground transition-colors"
                    onClick={() => handleSort('places')}
                  >
                    <div className="flex items-center justify-center">
                      Places{getSortIcon('places')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="text-muted-foreground font-semibold text-center cursor-pointer hover:text-foreground transition-colors"
                    onClick={() => handleSort('pctVictoires')}
                  >
                    <div className="flex items-center justify-center">
                      % Victoires{getSortIcon('pctVictoires')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="text-muted-foreground font-semibold text-center cursor-pointer hover:text-foreground transition-colors"
                    onClick={() => handleSort('pctVictoiresPlaces')}
                  >
                    <div className="flex items-center justify-center">
                      % Victoires et Places{getSortIcon('pctVictoiresPlaces')}
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.map((horse) => (
                  <TableRow 
                    key={horse.numero} 
                    className={`border-border hover:bg-muted/30 ${isInArrivee(horse.numero) ? getPositionBg(horse.numero) : ''}`}
                  >
                    <TableCell className="font-bold text-lg">{horse.numero}</TableCell>
                    <TableCell className="font-medium">{horse.name}</TableCell>
                    <TableCell className="text-center">{horse.courses}</TableCell>
                    <TableCell className="text-center">
                      <span className="text-primary font-semibold">{horse.victoires}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-accent font-semibold">{horse.places}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge 
                        variant="outline" 
                        className={`${horse.pctVictoires >= 20 ? 'bg-green-500/20 text-green-400 border-green-500/50' : horse.pctVictoires >= 10 ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' : 'bg-muted/50'}`}
                      >
                        {horse.pctVictoires.toFixed(2)}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge 
                        variant="outline" 
                        className={`${horse.pctVictoiresPlaces >= 70 ? 'bg-green-500/20 text-green-400 border-green-500/50' : horse.pctVictoiresPlaces >= 50 ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' : 'bg-muted/50'}`}
                      >
                        {horse.pctVictoiresPlaces.toFixed(2)}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Synthesis Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Synthesis by Performance */}
        <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="w-5 h-5 text-primary" />
              Top 8 par Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {synthesisByPerformance.map((numero, index) => (
                <Badge 
                  key={numero} 
                  variant="outline"
                  className={`text-lg px-4 py-2 font-bold ${
                    index === 0 ? 'bg-yellow-500/30 text-yellow-300 border-yellow-500' :
                    index === 1 ? 'bg-slate-400/30 text-slate-200 border-slate-400' :
                    index === 2 ? 'bg-orange-500/30 text-orange-300 border-orange-500' :
                    'bg-primary/20 text-primary border-primary/50'
                  } ${isInArrivee(numero) ? 'ring-2 ring-green-500' : ''}`}
                >
                  {numero}
                </Badge>
              ))}
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              {synthesisByPerformance.join(' - ')}
            </p>
          </CardContent>
        </Card>

        {/* Synthesis by Cote */}
        <Card className="bg-gradient-to-br from-accent/10 to-primary/10 border-accent/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="w-5 h-5 text-accent" />
              Top 8 par Cotes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {synthesisByCote.map((numero, index) => {
                const horse = baseStats.find(h => h.numero === numero);
                return (
                  <Badge 
                    key={numero} 
                    variant="outline"
                    className={`text-lg px-4 py-2 font-bold ${
                      index === 0 ? 'bg-yellow-500/30 text-yellow-300 border-yellow-500' :
                      index === 1 ? 'bg-slate-400/30 text-slate-200 border-slate-400' :
                      index === 2 ? 'bg-orange-500/30 text-orange-300 border-orange-500' :
                      'bg-accent/20 text-accent border-accent/50'
                    } ${isInArrivee(numero) ? 'ring-2 ring-green-500' : ''}`}
                  >
                    {numero}
                    <span className="ml-1 text-xs opacity-70">({horse?.cote.toFixed(1)})</span>
                  </Badge>
                );
              })}
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              {synthesisByCote.join(' - ')}
            </p>
          </CardContent>
        </Card>

        {/* Consensus Synthesis */}
        <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="w-5 h-5 text-green-400" />
              Consensus (Performance + Cotes)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {synthesisConsensus.length > 0 ? (
              <>
                <div className="flex flex-wrap gap-2">
                  {synthesisConsensus.map((numero) => {
                    const horse = baseStats.find(h => h.numero === numero);
                    const perfRank = synthesisByPerformance.indexOf(numero) + 1;
                    const coteRank = synthesisByCote.indexOf(numero) + 1;
                    return (
                      <Badge 
                        key={numero} 
                        variant="outline"
                        className={`text-lg px-4 py-2 font-bold bg-green-500/30 text-green-300 border-green-500 ${isInArrivee(numero) ? 'ring-2 ring-yellow-400' : ''}`}
                      >
                        {numero}
                        <span className="ml-1 text-xs opacity-70">
                          (P{perfRank}/C{coteRank})
                        </span>
                      </Badge>
                    );
                  })}
                </div>
                <p className="mt-4 text-sm text-muted-foreground">
                  {synthesisConsensus.length} cheval{synthesisConsensus.length > 1 ? 'x' : ''} dans les 2 classements
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                Aucun cheval commun aux deux classements
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Consensus History Panel */}
      {history.length > 0 && (
        <ConsensusHistoryPanel
          history={history}
          stats={consensusStats}
          onDelete={deleteEntry}
          onClear={clearHistory}
        />
      )}

      {/* Synthesis Section - Couplés & Tiercés from Consensus */}
      {synthesisConsensus.length >= 2 && (
        <Card className="bg-gradient-to-br from-violet-500/10 via-fuchsia-500/10 to-pink-500/10 border-violet-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-violet-400" />
              Synthèse Consensus - Combinaisons Générées
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Combinaisons basées sur les {synthesisConsensus.length} chevaux du consensus
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <SynthesisCombinations 
              synthesisConsensus={synthesisConsensus} 
              arrivee={arrivee}
              canSave={arrivee.length >= 2 && savedConsensusKey !== `${synthesisConsensus.join('-')}_${arrivee.join('-')}`}
              onSave={(data) => {
                addEntry({
                  raceName,
                  consensusHorses: synthesisConsensus,
                  arrivee,
                  ...data,
                });
                setSavedConsensusKey(`${synthesisConsensus.join('-')}_${arrivee.join('-')}`);
                toast.success('Résultats sauvegardés dans l\'historique');
              }}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default HorseStatsTab;

