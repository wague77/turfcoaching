
import { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  TrendingDown,
  TrendingUp,
  Shuffle,
  Filter,
  Download,
  RefreshCw,
  Target,
  Zap,
  Star,
} from 'lucide-react';
import { useOddsHistory, OddsSnapshot, RaceOddsHistory } from '@/hooks/useOddsHistory';
import { toast } from 'sonner';

interface HorseVariation {
  numero: number;
  name: string;
  firstOdds: number;
  lastOdds: number;
  totalChange: number;
  sign: '+' | '-' | '0';
}

interface Combination {
  horses: number[];
  sumNumbers: number;
  sumOdds: number;
  pattern: string; // e.g., "2× - , 1× +" ou "2× + , 1× -"
  variations: { numero: number; change: number }[];
}

type BetType = 'couple' | 'tierce' | 'quarte' | 'quinte';

interface Filters {
  betType: BetType;
  patternType: string; // Dynamic based on bet type
  parityFilter: 'all' | 'odd' | 'even' | 'mixed';
  minSumNumbers: number;
  maxSumNumbers: number;
  minSumOdds: number;
  maxSumOdds: number;
  maxCombinations: number;
  excludedHorses: number[];
  mandatoryHorses: number[]; // Chevaux obligatoires (coup sûr)
  // Line filters
  minL1: number;
  maxL1: number;
  minL2: number;
  maxL2: number;
  // Custom pattern filters
  customMinMinus: number;
  customMaxMinus: number;
  customMinPlus: number;
  customMaxPlus: number;
}

const getLine = (n: number): 'L1' | 'L2' => {
  const posInGroup = (n - 1) % 4;
  return posInGroup === 0 || posInGroup === 3 ? 'L1' : 'L2';
};

const BET_TYPE_CONFIG = {
  couple: { label: 'Couplé', count: 2, icon: '🎯' },
  tierce: { label: 'Tiercé', count: 3, icon: '🥉' },
  quarte: { label: 'Quarté', count: 4, icon: '🏅' },
  quinte: { label: 'Quinté', count: 5, icon: '🏆' },
};

// Dynamic pattern configurations based on bet type
const getPatternConfigs = (betType: BetType): Record<string, { label: string; description: string; check: (minusCount: number, plusCount: number, total: number) => boolean }> => {
  const count = BET_TYPE_CONFIG[betType].count;
  
  const patterns: Record<string, { label: string; description: string; check: (minusCount: number, plusCount: number, total: number) => boolean }> = {
    'all': { 
      label: 'Toutes combinaisons', 
      description: 'Aucun filtre de variation',
      check: () => true
    },
  };

  // Generate all valid patterns based on bet type count
  if (count === 2) {
    // Couplé: 2 chevaux
    patterns['2minus'] = {
      label: '2× baisse (−)',
      description: '2 chevaux en baisse',
      check: (minusCount) => minusCount === 2
    };
    patterns['2plus'] = {
      label: '2× hausse (+)',
      description: '2 chevaux en hausse',
      check: (_, plusCount) => plusCount === 2
    };
    patterns['1minus1plus'] = {
      label: '1× baisse (−) + 1× hausse (+)',
      description: '1 cheval en baisse, 1 en hausse',
      check: (minusCount, plusCount) => minusCount >= 1 && plusCount >= 1
    };
  } else if (count === 3) {
    // Tiercé: 3 chevaux
    patterns['3minus'] = {
      label: '3× baisse (−)',
      description: '3 chevaux en baisse',
      check: (minusCount) => minusCount === 3
    };
    patterns['2minus1plus'] = {
      label: '2× baisse (−) + 1× hausse (+)',
      description: '2 chevaux en baisse, 1 en hausse',
      check: (minusCount, plusCount) => minusCount >= 2 && plusCount >= 1
    };
    patterns['1minus2plus'] = {
      label: '1× baisse (−) + 2× hausse (+)',
      description: '1 cheval en baisse, 2 en hausse',
      check: (minusCount, plusCount) => minusCount >= 1 && plusCount >= 2
    };
    patterns['3plus'] = {
      label: '3× hausse (+)',
      description: '3 chevaux en hausse',
      check: (_, plusCount) => plusCount === 3
    };
  } else if (count === 4) {
    // Quarté: 4 chevaux
    patterns['4minus'] = {
      label: '4× baisse (−)',
      description: '4 chevaux en baisse',
      check: (minusCount) => minusCount === 4
    };
    patterns['3minus1plus'] = {
      label: '3× baisse (−) + 1× hausse (+)',
      description: '3 chevaux en baisse, 1 en hausse',
      check: (minusCount, plusCount) => minusCount >= 3 && plusCount >= 1
    };
    patterns['2minus2plus'] = {
      label: '2× baisse (−) + 2× hausse (+)',
      description: '2 chevaux en baisse, 2 en hausse',
      check: (minusCount, plusCount) => minusCount >= 2 && plusCount >= 2
    };
    patterns['1minus3plus'] = {
      label: '1× baisse (−) + 3× hausse (+)',
      description: '1 cheval en baisse, 3 en hausse',
      check: (minusCount, plusCount) => minusCount >= 1 && plusCount >= 3
    };
    patterns['4plus'] = {
      label: '4× hausse (+)',
      description: '4 chevaux en hausse',
      check: (_, plusCount) => plusCount === 4
    };
  } else if (count === 5) {
    // Quinté: 5 chevaux
    patterns['5minus'] = {
      label: '5× baisse (−)',
      description: '5 chevaux en baisse',
      check: (minusCount) => minusCount === 5
    };
    patterns['4minus1plus'] = {
      label: '4× baisse (−) + 1× hausse (+)',
      description: '4 chevaux en baisse, 1 en hausse',
      check: (minusCount, plusCount) => minusCount >= 4 && plusCount >= 1
    };
    patterns['3minus2plus'] = {
      label: '3× baisse (−) + 2× hausse (+)',
      description: '3 chevaux en baisse, 2 en hausse',
      check: (minusCount, plusCount) => minusCount >= 3 && plusCount >= 2
    };
    patterns['2minus3plus'] = {
      label: '2× baisse (−) + 3× hausse (+)',
      description: '2 chevaux en baisse, 3 en hausse',
      check: (minusCount, plusCount) => minusCount >= 2 && plusCount >= 3
    };
    patterns['1minus4plus'] = {
      label: '1× baisse (−) + 4× hausse (+)',
      description: '1 cheval en baisse, 4 en hausse',
      check: (minusCount, plusCount) => minusCount >= 1 && plusCount >= 4
    };
    patterns['5plus'] = {
      label: '5× hausse (+)',
      description: '5 chevaux en hausse',
      check: (_, plusCount) => plusCount === 5
    };
  }

  // Add custom pattern option
  patterns['custom'] = {
    label: '🎨 Personnalisé',
    description: 'Définir manuellement le nombre de baisses et hausses',
    check: () => true // Will be handled separately
  };

  return patterns;
};

const DEFAULT_FILTERS: Filters = {
  betType: 'tierce',
  patternType: '2minus1plus',
  parityFilter: 'all',
  minSumNumbers: 0,
  maxSumNumbers: 100,
  minSumOdds: 0,
  maxSumOdds: 200,
  maxCombinations: 100,
  excludedHorses: [],
  mandatoryHorses: [],
  minL1: 0,
  maxL1: 5,
  minL2: 0,
  maxL2: 5,
  customMinMinus: 0,
  customMaxMinus: 5,
  customMinPlus: 0,
  customMaxPlus: 5,
};

const getDefaultDate = () => {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  return `${day}${month}${year}`;
};

const OddsVariationsTab = () => {
  const [date, setDate] = useState(getDefaultDate);
  const [reunion, setReunion] = useState(1);
  const [course, setCourse] = useState(1);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [combinations, setCombinations] = useState<Combination[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const { getRaceHistory } = useOddsHistory();

  const currentHistory = getRaceHistory(date, reunion, course);

  // Get available patterns based on current bet type
  const availablePatterns = useMemo(() => getPatternConfigs(filters.betType), [filters.betType]);

  // Reset pattern when bet type changes if current pattern is invalid
  useEffect(() => {
    const currentPatternConfig = availablePatterns[filters.patternType];
    if (!currentPatternConfig) {
      setFilters(prev => ({ ...prev, patternType: 'all' }));
    }
  }, [filters.betType, availablePatterns, filters.patternType]);

  // Calculate variations for all horses
  const horseVariations = useMemo((): HorseVariation[] => {
    if (!currentHistory || currentHistory.snapshots.length < 2) return [];

    const firstSnapshot = currentHistory.snapshots[0];
    const lastSnapshot = currentHistory.snapshots[currentHistory.snapshots.length - 1];

    const variations: HorseVariation[] = [];

    // Get all unique horses
    const allHorses = new Map<number, string>();
    currentHistory.snapshots.forEach(s => {
      s.horses.forEach(h => {
        if (!allHorses.has(h.numero)) {
          allHorses.set(h.numero, h.name);
        }
      });
    });

    allHorses.forEach((name, numero) => {
      const firstOdds = firstSnapshot.horses.find(h => h.numero === numero)?.cote;
      const lastOdds = lastSnapshot.horses.find(h => h.numero === numero)?.cote;

      if (firstOdds && lastOdds) {
        const totalChange = lastOdds - firstOdds;
        variations.push({
          numero,
          name,
          firstOdds,
          lastOdds,
          totalChange: Math.round(totalChange * 10) / 10,
          sign: totalChange < 0 ? '-' : totalChange > 0 ? '+' : '0',
        });
      }
    });

    // Sort by variation (most negative first)
    return variations.sort((a, b) => a.totalChange - b.totalChange);
  }, [currentHistory]);

  // Sort minus horses by ascending absolute value (-1, -2, -3... → closest to 0 first)
  const minusHorses = useMemo(() => 
    horseVariations.filter(h => h.sign === '-').sort((a, b) => b.totalChange - a.totalChange), 
    [horseVariations]
  );
  // Sort plus horses by ascending value (+1, +2, +3...)
  const plusHorses = useMemo(() => 
    horseVariations.filter(h => h.sign === '+').sort((a, b) => a.totalChange - b.totalChange), 
    [horseVariations]
  );
  const neutralHorses = useMemo(() => horseVariations.filter(h => h.sign === '0'), [horseVariations]);

  const updateFilter = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const toggleExcluded = (numero: number) => {
    setFilters(prev => ({
      ...prev,
      excludedHorses: prev.excludedHorses.includes(numero)
        ? prev.excludedHorses.filter(n => n !== numero)
        : [...prev.excludedHorses, numero],
      // Remove from mandatory if adding to excluded
      mandatoryHorses: prev.mandatoryHorses.filter(n => n !== numero),
    }));
  };

  const toggleMandatory = (numero: number) => {
    setFilters(prev => ({
      ...prev,
      mandatoryHorses: prev.mandatoryHorses.includes(numero)
        ? prev.mandatoryHorses.filter(n => n !== numero)
        : [...prev.mandatoryHorses, numero],
      // Remove from excluded if adding to mandatory
      excludedHorses: prev.excludedHorses.filter(n => n !== numero),
    }));
  };

  const calculateParity = (nums: number[]): 'odd' | 'even' | 'mixed' => {
    const oddCount = nums.filter(n => n % 2 === 1).length;
    if (oddCount === nums.length) return 'odd';
    if (oddCount === 0) return 'even';
    return 'mixed';
  };

  const generateCombinations = useCallback(() => {
    if (horseVariations.length === 0) {
      toast.error('Aucune donnée de variation disponible. Chargez d\'abord les cotes dans l\'onglet Évolution Cotes.');
      return;
    }

    setIsGenerating(true);

    const count = BET_TYPE_CONFIG[filters.betType].count;
    const availableHorses = horseVariations.filter(h => !filters.excludedHorses.includes(h.numero));

    if (availableHorses.length < count) {
      toast.error(`Pas assez de chevaux disponibles (${availableHorses.length}/${count})`);
      setIsGenerating(false);
      return;
    }

    // Check mandatory horses count
    const mandatoryCount = filters.mandatoryHorses.length;
    if (mandatoryCount > count) {
      toast.error(`Trop de chevaux obligatoires (${mandatoryCount}/${count})`);
      setIsGenerating(false);
      return;
    }

    // Verify all mandatory horses are available
    const mandatoryHorsesData = filters.mandatoryHorses
      .map(n => availableHorses.find(h => h.numero === n))
      .filter(Boolean) as HorseVariation[];

    if (mandatoryHorsesData.length !== mandatoryCount) {
      toast.error('Certains chevaux obligatoires ne sont pas disponibles');
      setIsGenerating(false);
      return;
    }

    const horseMap = new Map(availableHorses.map(h => [h.numero, h]));

    // Sort available horses by variation ranking (most negative first = best ranking)
    // This creates the ranking order: horses with biggest decrease first
    const rankedHorses = [...availableHorses].sort((a, b) => a.totalChange - b.totalChange);
    const horseRanking = new Map(rankedHorses.map((h, idx) => [h.numero, idx]));

    // Non-mandatory horses for completing combinations
    const nonMandatoryHorses = rankedHorses.filter(
      h => !filters.mandatoryHorses.includes(h.numero)
    );
    const remainingCount = count - mandatoryCount;

    // Generate unique combinations (no permutations = no duplicates)
    const generateCombinationsFromArray = (
      arr: HorseVariation[],
      size: number,
      start: number = 0,
      current: HorseVariation[] = []
    ): HorseVariation[][] => {
      if (current.length === size) {
        return [current];
      }
      
      const results: HorseVariation[][] = [];
      for (let i = start; i < arr.length; i++) {
        results.push(...generateCombinationsFromArray(arr, size, i + 1, [...current, arr[i]]));
      }
      return results;
    };

    // Generate combinations for non-mandatory positions
    const nonMandatoryCombinations = remainingCount > 0
      ? generateCombinationsFromArray(nonMandatoryHorses, remainingCount)
      : [[]];

    const tempCombinations: Combination[] = [];

    // For each combination, combine with mandatory horses (no permutations)
    for (const nonMandatory of nonMandatoryCombinations) {
      // All horses for this combination - sorted by ranking order
      const allHorsesInCombo = [...mandatoryHorsesData, ...nonMandatory];
      
      // Sort by ranking (variation ranking order)
      allHorsesInCombo.sort((a, b) => (horseRanking.get(a.numero) ?? 999) - (horseRanking.get(b.numero) ?? 999));

      const nums = allHorsesInCombo.map(h => h.numero);
      const minusCount = allHorsesInCombo.filter(h => h.sign === '-').length;
      const plusCount = allHorsesInCombo.filter(h => h.sign === '+').length;

      // Check pattern
      if (filters.patternType === 'custom') {
        // Custom pattern with user-defined min/max
        if (minusCount < filters.customMinMinus || minusCount > filters.customMaxMinus) continue;
        if (plusCount < filters.customMinPlus || plusCount > filters.customMaxPlus) continue;
      } else if (filters.patternType !== 'all') {
        const patternConfig = availablePatterns[filters.patternType];
        if (patternConfig && !patternConfig.check(minusCount, plusCount, count)) continue;
      }

      const sumNumbers = nums.reduce((a, b) => a + b, 0);
      const sumOdds = allHorsesInCombo.reduce((a, h) => a + h.lastOdds, 0);
      const parity = calculateParity(nums);
      const l1Count = nums.filter(n => getLine(n) === 'L1').length;
      const l2Count = nums.filter(n => getLine(n) === 'L2').length;

      // Apply filters
      if (filters.parityFilter !== 'all' && parity !== filters.parityFilter) continue;
      if (sumNumbers < filters.minSumNumbers || sumNumbers > filters.maxSumNumbers) continue;
      if (sumOdds < filters.minSumOdds || sumOdds > filters.maxSumOdds) continue;
      if (l1Count < filters.minL1 || l1Count > filters.maxL1) continue;
      if (l2Count < filters.minL2 || l2Count > filters.maxL2) continue;

      // Build pattern string
      const patternStr = `${minusCount}× −, ${plusCount}× +`;

      tempCombinations.push({
        horses: nums,
        sumNumbers,
        sumOdds: Math.round(sumOdds * 10) / 10,
        pattern: patternStr,
        variations: allHorsesInCombo.map(h => ({ numero: h.numero, change: h.totalChange })),
      });
    }

    // Sort combinations by sumOdds in ascending order
    tempCombinations.sort((a, b) => a.sumOdds - b.sumOdds);

    // Take only up to maxCombinations
    const finalCombinations = tempCombinations.slice(0, filters.maxCombinations);

    // Check which horses are missing from the final combinations
    const finalHorsesSet = new Set<number>();
    finalCombinations.forEach(c => c.horses.forEach(n => finalHorsesSet.add(n)));
    
    const missingHorses = availableHorses.filter(h => !finalHorsesSet.has(h.numero));
    
    setCombinations(finalCombinations);
    setIsGenerating(false);

    if (missingHorses.length > 0) {
      toast.success(`${finalCombinations.length} combinaisons uniques (triées par Σcote). ${missingHorses.length} cheval(aux) non inclus.`);
    } else {
      toast.success(`${finalCombinations.length} combinaisons uniques (triées par Σcote croissante)`);
    }
  }, [horseVariations, filters]);

  const exportCombinations = () => {
    if (combinations.length === 0) return;

    const content = combinations
      .map((c, i) => {
        const variationsStr = c.variations
          .map(v => `${v.numero}(${v.change > 0 ? '+' : ''}${v.change})`)
          .join(' ');
        return `${i + 1}. ${c.horses.join('-')} [${c.pattern}] Σnum:${c.sumNumbers} Σcote:${c.sumOdds} | ${variationsStr}`;
      })
      .join('\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `variations_${filters.betType}_R${reunion}C${course}.txt`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success('Fichier téléchargé');
  };

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setCombinations([]);
  };

  return (
    <div className="space-y-6">
      {/* Course Selection */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-green-500" />
            <TrendingUp className="w-5 h-5 text-red-500" />
            Générateur par Variations de Cotes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="var-date">Date (JJMMAAAA)</Label>
              <Input
                id="var-date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                placeholder="15012026"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="var-reunion">Réunion</Label>
              <Input
                id="var-reunion"
                type="number"
                min={1}
                value={reunion}
                onChange={(e) => setReunion(parseInt(e.target.value) || 1)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="var-course">Course</Label>
              <Input
                id="var-course"
                type="number"
                min={1}
                value={course}
                onChange={(e) => setCourse(parseInt(e.target.value) || 1)}
              />
            </div>
            <div className="flex items-end">
              <Badge variant={currentHistory ? 'default' : 'secondary'} className="h-10 px-4 flex items-center">
                {currentHistory 
                  ? `${currentHistory.snapshots.length} relevés` 
                  : 'Aucune donnée'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Variations Summary */}
      {horseVariations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              Résumé des Variations Totales
              <Badge variant="outline" className="ml-2">
                {horseVariations.length} chevaux
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                  <TrendingDown className="w-6 h-6 text-green-500 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-green-500">{minusHorses.length}</p>
                  <p className="text-xs text-muted-foreground">En baisse (−)</p>
                </div>
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                  <TrendingUp className="w-6 h-6 text-red-500 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-red-500">{plusHorses.length}</p>
                  <p className="text-xs text-muted-foreground">En hausse (+)</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 border border-border">
                  <span className="text-2xl mx-auto block text-center mb-1">=</span>
                  <p className="text-2xl font-bold">{neutralHorses.length}</p>
                  <p className="text-xs text-muted-foreground">Stable (0)</p>
                </div>
              </div>

              {/* Horse list by variation */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Minus (baisse) */}
                <div className="space-y-2">
                  <h4 className="font-semibold flex items-center gap-2 text-green-500">
                    <TrendingDown className="w-4 h-4" />
                    Chevaux en baisse (−)
                  </h4>
                  <ScrollArea className="h-[200px]">
                    <div className="space-y-1">
                      {minusHorses.map(horse => {
                        const isMandatory = filters.mandatoryHorses.includes(horse.numero);
                        const isExcluded = filters.excludedHorses.includes(horse.numero);
                        return (
                          <div
                            key={horse.numero}
                            className={`flex items-center justify-between p-2 rounded transition-colors ${
                              isExcluded
                                ? 'bg-muted/50 opacity-50'
                                : isMandatory
                                  ? 'bg-yellow-500/20 border border-yellow-500/50'
                                  : 'bg-green-500/10 hover:bg-green-500/20'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <Star
                                className={`w-4 h-4 cursor-pointer transition-colors ${
                                  isMandatory ? 'fill-yellow-500 text-yellow-500' : 'text-muted-foreground hover:text-yellow-500'
                                }`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleMandatory(horse.numero);
                                }}
                              />
                              <Badge 
                                variant="outline" 
                                className={`border-green-500 text-green-500 cursor-pointer ${isMandatory ? 'ring-2 ring-yellow-500' : ''}`}
                                onClick={() => toggleExcluded(horse.numero)}
                              >
                                N°{horse.numero}
                              </Badge>
                              <span className="text-sm truncate max-w-[100px]">{horse.name}</span>
                            </div>
                            <span className="font-bold text-green-500">
                              {horse.totalChange.toFixed(1)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>

                {/* Plus (hausse) */}
                <div className="space-y-2">
                  <h4 className="font-semibold flex items-center gap-2 text-red-500">
                    <TrendingUp className="w-4 h-4" />
                    Chevaux en hausse (+)
                  </h4>
                  <ScrollArea className="h-[200px]">
                    <div className="space-y-1">
                      {plusHorses.map(horse => {
                        const isMandatory = filters.mandatoryHorses.includes(horse.numero);
                        const isExcluded = filters.excludedHorses.includes(horse.numero);
                        return (
                          <div
                            key={horse.numero}
                            className={`flex items-center justify-between p-2 rounded transition-colors ${
                              isExcluded
                                ? 'bg-muted/50 opacity-50'
                                : isMandatory
                                  ? 'bg-yellow-500/20 border border-yellow-500/50'
                                  : 'bg-red-500/10 hover:bg-red-500/20'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <Star
                                className={`w-4 h-4 cursor-pointer transition-colors ${
                                  isMandatory ? 'fill-yellow-500 text-yellow-500' : 'text-muted-foreground hover:text-yellow-500'
                                }`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleMandatory(horse.numero);
                                }}
                              />
                              <Badge 
                                variant="outline" 
                                className={`border-red-500 text-red-500 cursor-pointer ${isMandatory ? 'ring-2 ring-yellow-500' : ''}`}
                                onClick={() => toggleExcluded(horse.numero)}
                              >
                                N°{horse.numero}
                              </Badge>
                              <span className="text-sm truncate max-w-[100px]">{horse.name}</span>
                            </div>
                            <span className="font-bold text-red-500">
                              +{horse.totalChange.toFixed(1)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                <Star className="w-3 h-3 inline-block mr-1 text-yellow-500" />
                = Coup sûr (obligatoire) | Cliquez sur le numéro pour exclure
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters & Generator */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shuffle className="w-5 h-5 text-primary" />
              Générateur de Combinaisons
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-4 h-4 mr-1" />
              {showFilters ? 'Masquer filtres' : 'Afficher filtres'}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Main controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Type de jeu</Label>
              <Select
                value={filters.betType}
                onValueChange={(v) => updateFilter('betType', v as BetType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(BET_TYPE_CONFIG).map(([key, { label, icon }]) => (
                    <SelectItem key={key} value={key}>
                      {icon} {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Modèle de variation</Label>
              <Select
                value={filters.patternType}
                onValueChange={(v) => updateFilter('patternType', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(availablePatterns).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Max combinaisons</Label>
              <Input
                type="number"
                min={1}
                max={1000}
                value={filters.maxCombinations}
                onChange={(e) => updateFilter('maxCombinations', parseInt(e.target.value) || 100)}
              />
            </div>
          </div>

          {/* Custom pattern controls */}
          {filters.patternType === 'custom' && (
            <div className="p-4 rounded-lg border border-primary/30 bg-primary/5 space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-primary">
                <TrendingDown className="w-4 h-4" />
                <TrendingUp className="w-4 h-4" />
                Configuration personnalisée
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs flex items-center gap-1">
                    <TrendingDown className="w-3 h-3 text-green-500" />
                    Baisse min
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    max={BET_TYPE_CONFIG[filters.betType].count}
                    value={filters.customMinMinus}
                    onChange={(e) => updateFilter('customMinMinus', Math.min(parseInt(e.target.value) || 0, BET_TYPE_CONFIG[filters.betType].count))}
                    className="h-9"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs flex items-center gap-1">
                    <TrendingDown className="w-3 h-3 text-green-500" />
                    Baisse max
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    max={BET_TYPE_CONFIG[filters.betType].count}
                    value={filters.customMaxMinus}
                    onChange={(e) => updateFilter('customMaxMinus', Math.min(parseInt(e.target.value) || 0, BET_TYPE_CONFIG[filters.betType].count))}
                    className="h-9"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-red-500" />
                    Hausse min
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    max={BET_TYPE_CONFIG[filters.betType].count}
                    value={filters.customMinPlus}
                    onChange={(e) => updateFilter('customMinPlus', Math.min(parseInt(e.target.value) || 0, BET_TYPE_CONFIG[filters.betType].count))}
                    className="h-9"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-red-500" />
                    Hausse max
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    max={BET_TYPE_CONFIG[filters.betType].count}
                    value={filters.customMaxPlus}
                    onChange={(e) => updateFilter('customMaxPlus', Math.min(parseInt(e.target.value) || 0, BET_TYPE_CONFIG[filters.betType].count))}
                    className="h-9"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                💡 Exemple: Pour un tiercé avec exactement 2 baisses et 1 hausse, définissez Baisse min/max = 2 et Hausse min/max = 1
              </p>
            </div>
          )}

          {/* Extended filters */}
          {showFilters && (
            <div className="space-y-4 pt-4 border-t">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Parité</Label>
                  <Select
                    value={filters.parityFilter}
                    onValueChange={(v) => updateFilter('parityFilter', v as 'all' | 'odd' | 'even' | 'mixed')}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes</SelectItem>
                      <SelectItem value="odd">Impairs</SelectItem>
                      <SelectItem value="even">Pairs</SelectItem>
                      <SelectItem value="mixed">Mixtes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Σ Numéros: {filters.minSumNumbers}-{filters.maxSumNumbers}</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={filters.minSumNumbers}
                      onChange={(e) => updateFilter('minSumNumbers', parseInt(e.target.value) || 0)}
                      className="w-16"
                    />
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={filters.maxSumNumbers}
                      onChange={(e) => updateFilter('maxSumNumbers', parseInt(e.target.value) || 100)}
                      className="w-16"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Σ Cotes: {filters.minSumOdds}-{filters.maxSumOdds}</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min={0}
                      max={500}
                      value={filters.minSumOdds}
                      onChange={(e) => updateFilter('minSumOdds', parseInt(e.target.value) || 0)}
                      className="w-16"
                    />
                    <Input
                      type="number"
                      min={0}
                      max={500}
                      value={filters.maxSumOdds}
                      onChange={(e) => updateFilter('maxSumOdds', parseInt(e.target.value) || 200)}
                      className="w-16"
                    />
                  </div>
                </div>
              </div>

              {/* Line filters */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">L1 min/max (1,4,5,8...)</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min={0}
                      max={5}
                      value={filters.minL1}
                      onChange={(e) => updateFilter('minL1', parseInt(e.target.value) || 0)}
                      className="w-12"
                    />
                    <Input
                      type="number"
                      min={0}
                      max={5}
                      value={filters.maxL1}
                      onChange={(e) => updateFilter('maxL1', parseInt(e.target.value) || 5)}
                      className="w-12"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">L2 min/max (2,3,6,7...)</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min={0}
                      max={5}
                      value={filters.minL2}
                      onChange={(e) => updateFilter('minL2', parseInt(e.target.value) || 0)}
                      className="w-12"
                    />
                    <Input
                      type="number"
                      min={0}
                      max={5}
                      value={filters.maxL2}
                      onChange={(e) => updateFilter('maxL2', parseInt(e.target.value) || 5)}
                      className="w-12"
                    />
                  </div>
                </div>
              </div>

              {/* Mandatory horses (coup sûr) */}
              {filters.mandatoryHorses.length > 0 && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    Chevaux obligatoires (coup sûr)
                  </Label>
                  <div className="flex flex-wrap gap-1">
                    {filters.mandatoryHorses.map(n => (
                      <Badge
                        key={n}
                        className="cursor-pointer bg-yellow-500 hover:bg-yellow-600 text-yellow-950"
                        onClick={() => toggleMandatory(n)}
                      >
                        N°{n} ×
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Excluded horses */}
              {filters.excludedHorses.length > 0 && (
                <div className="space-y-2">
                  <Label>Chevaux exclus</Label>
                  <div className="flex flex-wrap gap-1">
                    {filters.excludedHorses.map(n => (
                      <Badge
                        key={n}
                        variant="destructive"
                        className="cursor-pointer"
                        onClick={() => toggleExcluded(n)}
                      >
                        N°{n} ×
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2 pt-4 border-t">
            <Button
              onClick={generateCombinations}
              disabled={isGenerating || horseVariations.length === 0}
              className="flex-1 md:flex-none"
            >
              {isGenerating ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Zap className="w-4 h-4 mr-2" />
              )}
              Générer
            </Button>

            <Button
              onClick={exportCombinations}
              disabled={combinations.length === 0}
              variant="outline"
            >
              <Download className="w-4 h-4 mr-2" />
              Exporter
            </Button>

            <Button onClick={resetFilters} variant="ghost">
              <RefreshCw className="w-4 h-4 mr-2" />
              Réinitialiser
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {combinations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              Combinaisons Générées
              <Badge variant="secondary">{combinations.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {combinations.map((combo, index) => (
                  <Card key={index} className="p-3 bg-muted/30">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline">{index + 1}</Badge>
                      <Badge variant="secondary" className="text-xs">
                        {combo.pattern}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      {combo.horses.map((num, i) => {
                        const variation = combo.variations.find(v => v.numero === num);
                        const isNegative = variation && variation.change < 0;
                        const isPositive = variation && variation.change > 0;
                        
                        return (
                          <Badge
                            key={i}
                            variant="default"
                            className={`text-lg ${
                              isNegative 
                                ? 'bg-green-500 hover:bg-green-600' 
                                : isPositive 
                                  ? 'bg-red-500 hover:bg-red-600' 
                                  : ''
                            }`}
                          >
                            {num}
                          </Badge>
                        );
                      })}
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div className="flex justify-between">
                        <span>Σ numéros:</span>
                        <span className="font-medium">{combo.sumNumbers}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Σ cotes:</span>
                        <span className="font-medium">{combo.sumOdds}</span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {combo.variations.map((v, i) => (
                          <span
                            key={i}
                            className={`text-xs px-1 rounded ${
                              v.change < 0 
                                ? 'bg-green-500/20 text-green-500' 
                                : v.change > 0 
                                  ? 'bg-red-500/20 text-red-500' 
                                  : 'bg-muted'
                            }`}
                          >
                            {v.numero}:{v.change > 0 ? '+' : ''}{v.change}
                          </span>
                        ))}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* No data message */}
      {!currentHistory && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <TrendingDown className="w-16 h-16 text-muted-foreground/30 mb-4" />
            <h3 className="text-xl font-semibold text-muted-foreground mb-2">
              Aucune donnée de variation
            </h3>
            <p className="text-sm text-muted-foreground">
              Allez dans l'onglet "Évolution Cotes" pour charger des relevés de cotes, puis revenez ici.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default OddsVariationsTab;

