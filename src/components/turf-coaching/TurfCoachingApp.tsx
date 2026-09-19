
import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { 
  Target, TrendingUp, Calculator, Zap, Trophy, 
  BarChart3, Package, Users, Settings2, Hash, 
  Lightbulb, CircleDot, X, RefreshCw, Filter,
  Flag, CheckCircle2, ArrowUpDown, History, Save, Heart
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Horse,
  Combination,
  ModuleFilters,
  generateAllCombinations,
  processAllCombinations,
  applyFilters,
  getPanierStats,
  getGroupeStats,
  getSimulatorStats,
  getSuggestedPaniers,
  getSuggestedGroupes,
  getSuggestedSimulator,
  getRaceDifficulty,
  calculateBetCost
} from '@/lib/turf-coaching-logic';
import { PanierModule } from './modules/PanierModule';
import { GroupeModule } from './modules/GroupeModule';
import { SimulatorModule } from './modules/SimulatorModule';
import { ChevauxHSModule } from './modules/ChevauxHSModule';
import { FavorisTocardsModule } from './modules/FavorisTocardsModule';
import { PronosticModule } from './modules/PronosticModule';
import { ConsecutifsModule } from './modules/ConsecutifsModule';
import { CouplesModule } from './modules/CouplesModule';
import { GeneratorFiltersModule, GeneratorFilters, DEFAULT_GENERATOR_FILTERS } from './modules/GeneratorFiltersModule';
import { ResultsDisplay } from './ResultsDisplay';
import { RaceSetup } from './RaceSetup';
import { TurfCoachingHistoryPanel } from './TurfCoachingHistoryPanel';
import { useTurfCoachingHistory } from '@/hooks/useTurfCoachingHistory';

// Helper function to determine which line a number belongs to
const getLine = (n: number): 'L1' | 'L2' => {
  const posInGroup = (n - 1) % 4;
  return posInGroup === 0 || posInGroup === 3 ? 'L1' : 'L2';
};

// Calculate parity of a combination
const calculateParity = (nums: number[]): 'odd' | 'even' | 'mixed' => {
  const oddCount = nums.filter(n => n % 2 === 1).length;
  if (oddCount === nums.length) return 'odd';
  if (oddCount === 0) return 'even';
  return 'mixed';
};

// Get position color for arrival display
const getPositionColor = (position: number): string => {
  switch (position) {
    case 1: return 'bg-yellow-500 text-yellow-950';
    case 2: return 'bg-gray-300 text-gray-800';
    case 3: return 'bg-amber-600 text-amber-50';
    case 4: return 'bg-blue-500 text-white';
    case 5: return 'bg-purple-500 text-white';
    default: return 'bg-muted text-muted-foreground';
  }
};

export function TurfCoachingApp() {
  // Race data
  const [betType, setBetType] = useState<'tierce' | 'quarte' | 'quinte'>('tierce');
  const [starters, setStarters] = useState<number>(15);
  const [horses, setHorses] = useState<Horse[]>([]);
  const [raceConfigured, setRaceConfigured] = useState(false);
  const [arrivee, setArrivee] = useState<number[]>([]);
  const [arriveeInput, setArriveeInput] = useState('');
  const [raceName, setRaceName] = useState('');
  const [currentEntryId, setCurrentEntryId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  
  // History hook
  const { history, stats, addEntry, updateEntry, deleteEntry, clearHistory } = useTurfCoachingHistory();
  // Module Filters state
  const [filters, setFilters] = useState<ModuleFilters>({
    paniers: [],
    groupes: [],
    simulator: [],
    chevauxHS: [],
    favorisCount: null,
    tocardsCount: null,
    pronostic1: null,
    pronostic2: null,
    pressPronosticsCount: null,
    eliminateSerie2: false,
    eliminateSerie3: false,
    eliminateNoSerie: false
  });
  
  // Generator Filters state
  const [generatorFilters, setGeneratorFilters] = useState<GeneratorFilters>(DEFAULT_GENERATOR_FILTERS);
  
  const [activeTab, setActiveTab] = useState('generator');
  
  // Sort horses by odds for display
  const sortedHorses = useMemo(() => {
    return [...horses].sort((a, b) => a.odds - b.odds);
  }, [horses]);
  
  // Generate all combinations
  const allCombinations = useMemo(() => {
    if (!raceConfigured) return [];
    const raw = generateAllCombinations(starters, betType);
    return processAllCombinations(raw, horses);
  }, [starters, betType, horses, raceConfigured]);
  
  // Apply module filters first
  const moduleFilteredCombinations = useMemo(() => {
    if (allCombinations.length === 0) return [];
    return applyFilters(allCombinations, filters, horses);
  }, [allCombinations, filters, horses]);
  
  // Apply generator filters on top
  const filteredCombinations = useMemo(() => {
    if (moduleFilteredCombinations.length === 0) return [];
    
    let result = [...moduleFilteredCombinations];
    
    // Exclude horses marked as excluded
    if (generatorFilters.excludedHorses.length > 0) {
      result = result.filter(c => 
        !c.horses.some(h => generatorFilters.excludedHorses.includes(h))
      );
    }
    
    // Must include coup sur horses
    if (generatorFilters.coupSurHorses.length > 0) {
      result = result.filter(c => 
        generatorFilters.coupSurHorses.every(h => c.horses.includes(h))
      );
    }
    
    // Must include selected horses (at least one)
    if (generatorFilters.selectedHorses.length > 0) {
      result = result.filter(c => 
        generatorFilters.selectedHorses.some(h => c.horses.includes(h))
      );
    }
    
    // Parity filter
    if (generatorFilters.parityFilter !== 'all') {
      result = result.filter(c => {
        const parity = calculateParity(c.horses);
        return parity === generatorFilters.parityFilter;
      });
    }
    
    // Sum of numbers filter
    if (generatorFilters.minSumNumbers > 0 || generatorFilters.maxSumNumbers < 100) {
      result = result.filter(c => {
        const sum = c.horses.reduce((a, b) => a + b, 0);
        return sum >= generatorFilters.minSumNumbers && sum <= generatorFilters.maxSumNumbers;
      });
    }
    
    // Sum of odds filter
    if (generatorFilters.minSumOdds > 0 || generatorFilters.maxSumOdds < 500) {
      result = result.filter(c => {
        const horseMap = new Map(horses.map(h => [h.number, h]));
        const sum = c.horses.reduce((a, n) => a + (horseMap.get(n)?.odds || 0), 0);
        return sum >= generatorFilters.minSumOdds && sum <= generatorFilters.maxSumOdds;
      });
    }
    
    // Favorites count filter
    const favoriteNums = horses.filter(h => h.isFavorite).map(h => h.number);
    if (generatorFilters.minFavorites > 0 || generatorFilters.maxFavorites < 5) {
      result = result.filter(c => {
        const count = c.horses.filter(h => favoriteNums.includes(h)).length;
        return count >= generatorFilters.minFavorites && count <= generatorFilters.maxFavorites;
      });
    }
    
    // Outsiders count filter
    const outsiderNums = horses.filter(h => h.isTocard).map(h => h.number);
    if (generatorFilters.minOutsiders > 0 || generatorFilters.maxOutsiders < 5) {
      result = result.filter(c => {
        const count = c.horses.filter(h => outsiderNums.includes(h)).length;
        return count >= generatorFilters.minOutsiders && count <= generatorFilters.maxOutsiders;
      });
    }
    
    // L1/L2 filter
    if (generatorFilters.minL1 > 0 || generatorFilters.maxL1 < 5 || 
        generatorFilters.minL2 > 0 || generatorFilters.maxL2 < 5) {
      result = result.filter(c => {
        const l1Count = c.horses.filter(n => getLine(n) === 'L1').length;
        const l2Count = c.horses.filter(n => getLine(n) === 'L2').length;
        return l1Count >= generatorFilters.minL1 && l1Count <= generatorFilters.maxL1 &&
               l2Count >= generatorFilters.minL2 && l2Count <= generatorFilters.maxL2;
      });
    }
    
    return result;
  }, [moduleFilteredCombinations, generatorFilters, horses]);
  
  // Stats
  const panierStats = useMemo(() => getPanierStats(allCombinations), [allCombinations]);
  const groupeStats = useMemo(() => getGroupeStats(allCombinations), [allCombinations]);
  const simulatorStats = useMemo(() => getSimulatorStats(allCombinations), [allCombinations]);
  
  // Suggestions
  const suggestedPaniers = useMemo(() => getSuggestedPaniers(horses), [horses]);
  const suggestedGroupes = useMemo(() => getSuggestedGroupes(horses), [horses]);
  const suggestedSimulator = useMemo(() => getSuggestedSimulator(horses), [horses]);
  const difficulty = useMemo(() => getRaceDifficulty(horses), [horses]);
  
  // Check if any module is active
  const hasActiveModuleFilters = filters.paniers.length > 0 || 
    filters.groupes.length > 0 || 
    filters.simulator.length > 0 ||
    filters.chevauxHS.length > 0 ||
    filters.favorisCount !== null ||
    filters.tocardsCount !== null ||
    filters.pronostic1 !== null ||
    filters.pronostic2 !== null ||
    filters.eliminateSerie2 ||
    filters.eliminateSerie3 ||
    filters.eliminateNoSerie;
  
  const hasActiveGeneratorFilters = 
    generatorFilters.parityFilter !== 'all' ||
    generatorFilters.minSumNumbers > 0 ||
    generatorFilters.maxSumNumbers < 100 ||
    generatorFilters.minSumOdds > 0 ||
    generatorFilters.maxSumOdds < 500 ||
    generatorFilters.minFavorites > 0 ||
    generatorFilters.maxFavorites < 5 ||
    generatorFilters.minOutsiders > 0 ||
    generatorFilters.maxOutsiders < 5 ||
    generatorFilters.minL1 > 0 ||
    generatorFilters.maxL1 < 5 ||
    generatorFilters.minL2 > 0 ||
    generatorFilters.maxL2 < 5 ||
    generatorFilters.coupSurHorses.length > 0 ||
    generatorFilters.excludedHorses.length > 0 ||
    generatorFilters.selectedHorses.length > 0;
  
  const hasActiveFilters = hasActiveModuleFilters || hasActiveGeneratorFilters;
  
  // Handle race configuration
  const handleRaceSetup = (horsesData: Horse[], starterCount: number, type: 'tierce' | 'quarte' | 'quinte') => {
    // Sort horses by odds before storing
    const sortedByOdds = [...horsesData].sort((a, b) => a.odds - b.odds);
    setHorses(sortedByOdds);
    setStarters(starterCount);
    setBetType(type);
    setRaceConfigured(true);
    toast.success(`Course configurée: ${starterCount} partants - ${type.charAt(0).toUpperCase() + type.slice(1)}`);
  };
  
  // Handle arrivée input
  const handleArriveeSubmit = () => {
    if (!arriveeInput.trim()) {
      setArrivee([]);
      return;
    }
    
    const numbers = arriveeInput
      .split(/[-,\s]+/)
      .map(s => parseInt(s.trim()))
      .filter(n => !isNaN(n) && n > 0 && n <= starters);
    
    if (numbers.length < 3) {
      toast.error('Entrez au moins 3 numéros (ex: 5-3-8-12-1)');
      return;
    }
    
    // Remove duplicates
    const uniqueNumbers = [...new Set(numbers)];
    setArrivee(uniqueNumbers.slice(0, 5));
    toast.success(`Arrivée enregistrée: ${uniqueNumbers.slice(0, 5).join('-')}`);
  };
  
  // Check if a combination matches the arrival
  const checkCombinationResult = (combination: number[]): { matched: number; isWinner: boolean } => {
    if (arrivee.length === 0) return { matched: 0, isWinner: false };
    
    const requiredCount = betType === 'tierce' ? 3 : betType === 'quarte' ? 4 : 5;
    const arrivalSlice = arrivee.slice(0, requiredCount);
    const matched = combination.filter(h => arrivalSlice.includes(h)).length;
    const isWinner = matched === requiredCount;
    
    return { matched, isWinner };
  };
  
  // Find winning combinations
  const winningCombinations = useMemo(() => {
    if (arrivee.length === 0) return [];
    return filteredCombinations.filter(c => checkCombinationResult(c.horses).isWinner);
  }, [filteredCombinations, arrivee, betType]);
  
  // Reset all filters
  const resetFilters = () => {
    setFilters({
      paniers: [],
      groupes: [],
      simulator: [],
      chevauxHS: [],
      favorisCount: null,
      tocardsCount: null,
      pronostic1: null,
      pronostic2: null,
      pressPronosticsCount: null,
      eliminateSerie2: false,
      eliminateSerie3: false,
      eliminateNoSerie: false
    });
    setGeneratorFilters(DEFAULT_GENERATOR_FILTERS);
    toast.info('Tous les filtres ont été réinitialisés');
  };
  
  // Reset everything
  const resetAll = () => {
    resetFilters();
    setRaceConfigured(false);
    setHorses([]);
    setStarters(15);
    setBetType('tierce');
    setArrivee([]);
    setArriveeInput('');
    setRaceName('');
    setCurrentEntryId(null);
    toast.info('Configuration réinitialisée');
  };
  
  // Save current analysis to history
  const saveToHistory = () => {
    if (!hasActiveFilters) {
      toast.error('Appliquez des filtres avant de sauvegarder');
      return;
    }
    
    const entryId = addEntry({
      raceName: raceName || undefined,
      betType,
      starters,
      totalCombinations: allCombinations.length,
      filteredCombinations: filteredCombinations.length,
      betCost: calculateBetCost(filteredCombinations.length, betType),
      filtersApplied: {
        paniers: filters.paniers,
        groupes: filters.groupes,
        simulator: filters.simulator,
        chevauxHS: filters.chevauxHS,
        hasFavorisFilter: filters.favorisCount !== null,
        hasTocardsFilter: filters.tocardsCount !== null,
        hasPronosticFilter: filters.pronostic1 !== null || filters.pronostic2 !== null,
        hasConsecutifsFilter: filters.eliminateSerie2 || filters.eliminateSerie3 || filters.eliminateNoSerie,
        hasGeneratorFilters: hasActiveGeneratorFilters,
      },
      arrivee,
      winningCombinationsCount: winningCombinations.length,
      isSuccess: winningCombinations.length > 0,
      successRate: filteredCombinations.length > 0 
        ? (winningCombinations.length / filteredCombinations.length) * 100 
        : 0,
      horsesData: sortedHorses.map(h => ({
        number: h.number,
        name: h.name,
        odds: h.odds,
        isFavorite: h.isFavorite,
        isTocard: h.isTocard,
      })),
    });
    
    setCurrentEntryId(entryId);
    toast.success('Analyse sauvegardée dans l\'historique');
  };
  
  // Update current entry with arrivée
  const updateCurrentEntryArrivee = () => {
    if (currentEntryId && arrivee.length > 0) {
      updateEntry(currentEntryId, {
        arrivee,
        winningCombinationsCount: winningCombinations.length,
        isSuccess: winningCombinations.length > 0,
        successRate: filteredCombinations.length > 0 
          ? (winningCombinations.length / filteredCombinations.length) * 100 
          : 0,
      });
      toast.success('Arrivée mise à jour dans l\'historique');
    }
  };
  
  if (!raceConfigured) {
    return <RaceSetup onSetup={handleRaceSetup} />;
  }
  
  const betCost = calculateBetCost(filteredCombinations.length, betType);
  const totalCombinations = allCombinations.length;
  const remainingCombinations = filteredCombinations.length;
  const eliminatedPercentage = totalCombinations > 0 
    ? Math.round((1 - remainingCombinations / totalCombinations) * 100) 
    : 0;
  
  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-primary mb-1">
              <Calculator className="w-4 h-4" />
              <span className="text-xs font-medium">Total</span>
            </div>
            <p className="text-2xl font-bold">{totalCombinations}</p>
            <p className="text-xs text-muted-foreground">combinaisons</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-green-500 mb-1">
              <Target className="w-4 h-4" />
              <span className="text-xs font-medium">Restantes</span>
            </div>
            <p className="text-2xl font-bold">{remainingCombinations}</p>
            <p className="text-xs text-muted-foreground">{betCost.toFixed(2)}€</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/20">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-orange-500 mb-1">
              <Zap className="w-4 h-4" />
              <span className="text-xs font-medium">Éliminées</span>
            </div>
            <p className="text-2xl font-bold">{eliminatedPercentage}%</p>
            <p className="text-xs text-muted-foreground">{totalCombinations - remainingCombinations} combis</p>
          </CardContent>
        </Card>
        
        <Card className={`bg-gradient-to-br border ${
          difficulty?.label === 'facile' 
            ? 'from-green-500/10 to-green-500/5 border-green-500/20' 
            : difficulty?.label === 'moyenne'
              ? 'from-yellow-500/10 to-yellow-500/5 border-yellow-500/20'
              : 'from-red-500/10 to-red-500/5 border-red-500/20'
        }`}>
          <CardContent className="pt-4">
            <div className={`flex items-center gap-2 mb-1 ${
              difficulty?.label === 'facile' ? 'text-green-500' : difficulty?.label === 'moyenne' ? 'text-yellow-500' : 'text-red-500'
            }`}>
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs font-medium">Difficulté</span>
            </div>
            <p className="text-2xl font-bold capitalize">{difficulty?.label}</p>
            <p className="text-xs text-muted-foreground">Indice: {difficulty?.index}/10 • {starters} partants</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={resetFilters} className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Réinitialiser filtres
        </Button>
        <Button variant="outline" size="sm" onClick={resetAll} className="gap-2">
          <X className="w-4 h-4" />
          Nouvelle course
        </Button>
        <Button 
          variant={showHistory ? "default" : "outline"} 
          size="sm" 
          onClick={() => setShowHistory(!showHistory)} 
          className="gap-2"
        >
          <History className="w-4 h-4" />
          Historique
          {history.length > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
              {history.length}
            </Badge>
          )}
        </Button>
        {hasActiveFilters && (
          <Button 
            variant="default" 
            size="sm" 
            onClick={saveToHistory} 
            className="gap-2 bg-green-600 hover:bg-green-700"
          >
            <Save className="w-4 h-4" />
            Sauvegarder
          </Button>
        )}
        <Badge variant="secondary" className="px-3 py-1.5 text-sm">
          {betType.charAt(0).toUpperCase() + betType.slice(1)} - {starters} partants
        </Badge>
      </div>
      
      {/* History Panel */}
      {showHistory && (
        <TurfCoachingHistoryPanel
          history={history}
          stats={stats}
          onDelete={deleteEntry}
          onClearAll={clearHistory}
        />
      )}
      
      {/* Horses sorted by odds + Arrivée input */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Horses list sorted by odds */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <ArrowUpDown className="w-4 h-4 text-primary" />
              Chevaux classés par cotes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
              {sortedHorses.map((horse, idx) => {
                const positionInArrivee = arrivee.indexOf(horse.number);
                const isInArrivee = positionInArrivee !== -1;
                
                return (
                  <Badge 
                    key={horse.number}
                    variant={horse.isFavorite ? "default" : horse.isTocard ? "outline" : "secondary"}
                    className={`text-xs gap-1 ${isInArrivee ? getPositionColor(positionInArrivee + 1) : ''}`}
                  >
                    <span className="font-bold">{horse.number}</span>
                    <span className="opacity-70">({horse.odds.toFixed(1)})</span>
                    {horse.isFavorite && <Trophy className="w-3 h-3" />}
                    {isInArrivee && <span className="ml-1 font-bold">{positionInArrivee + 1}e</span>}
                  </Badge>
                );
              })}
            </div>
            <div className="mt-2 flex gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Badge variant="default" className="h-4 px-1 text-[10px]">F</Badge> Favori
              </span>
              <span className="flex items-center gap-1">
                <Badge variant="outline" className="h-4 px-1 text-[10px]">T</Badge> Tocard
              </span>
            </div>
          </CardContent>
        </Card>
        
        {/* Arrivée input */}
        <Card className={arrivee.length > 0 ? 'border-green-500/50 bg-green-500/5' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Flag className="w-4 h-4 text-primary" />
              Saisir l'arrivée
              {arrivee.length > 0 && <CheckCircle2 className="w-4 h-4 text-green-500" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Race name input */}
            <Input
              placeholder="Nom de la course (optionnel)"
              value={raceName}
              onChange={(e) => setRaceName(e.target.value)}
              className="text-sm"
            />
            
            <div className="flex gap-2">
              <Input
                placeholder="Ex: 5-3-8-12-1"
                value={arriveeInput}
                onChange={(e) => setArriveeInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleArriveeSubmit()}
                className="flex-1"
              />
              <Button onClick={handleArriveeSubmit} size="sm">
                Valider
              </Button>
            </div>
            
            {arrivee.length > 0 && (
              <div className="space-y-2">
                <div className="flex gap-1.5">
                  {arrivee.map((num, idx) => (
                    <Badge key={num} className={`${getPositionColor(idx + 1)} text-sm px-2`}>
                      {idx + 1}e: {num}
                    </Badge>
                  ))}
                </div>
                
                {winningCombinations.length > 0 ? (
                  <div className="p-2 bg-green-500/10 border border-green-500/30 rounded-md">
                    <p className="text-sm text-green-600 dark:text-green-400 font-medium flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      {winningCombinations.length} combinaison(s) gagnante(s) dans vos sélections !
                    </p>
                  </div>
                ) : hasActiveFilters && (
                  <div className="p-2 bg-red-500/10 border border-red-500/30 rounded-md">
                    <p className="text-sm text-red-600 dark:text-red-400">
                      Aucune combinaison gagnante dans vos {filteredCombinations.length} sélections
                    </p>
                  </div>
                )}
                
                {/* Update history button */}
                {currentEntryId && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={updateCurrentEntryArrivee}
                    className="w-full gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Mettre à jour l'historique
                  </Button>
                )}
              </div>
            )}
            
            <p className="text-xs text-muted-foreground">
              Entrez les numéros séparés par des tirets ou espaces
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Target Zone Strategy - Always visible once race is configured */}
      {horses.length > 0 && difficulty && (
        <Card className="border-2 border-dashed" style={{
          borderColor: difficulty.index <= 3 ? 'hsl(142, 76%, 36%)' : 
                      difficulty.index <= 6 ? 'hsl(38, 92%, 50%)' : 'hsl(0, 84%, 60%)'
        }}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Target className="w-5 h-5" />
              Stratégie de ciblage
              <Badge className={`ml-auto ${
                difficulty.index <= 3 ? 'bg-green-500' : 
                difficulty.index <= 6 ? 'bg-amber-500' : 'bg-red-500'
              } text-white`}>
                Indice: {difficulty.index}/10
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Légende explicative */}
            <div className="p-4 rounded-lg bg-card border-2 border-border shadow-sm">
              <h4 className="text-sm font-bold mb-3 flex items-center gap-2 text-foreground">
                <Lightbulb className="w-5 h-5 text-amber-500" />
                Légende des zones cibles
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-green-600 border-2 border-green-400 shadow-sm">
                  <div className="w-4 h-4 rounded-full bg-white flex-shrink-0 ring-2 ring-green-300" />
                  <div>
                    <span className="font-bold text-white">Facile (1-3)</span>
                    <p className="text-green-100 font-medium">Ciblez le Top 6</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-600 border-2 border-amber-400 shadow-sm">
                  <div className="w-4 h-4 rounded-full bg-white flex-shrink-0 ring-2 ring-amber-300" />
                  <div>
                    <span className="font-bold text-white">Moyenne (4-6)</span>
                    <p className="text-amber-100 font-medium">Ciblez le Top 10</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-red-600 border-2 border-red-400 shadow-sm">
                  <div className="w-4 h-4 rounded-full bg-white flex-shrink-0 ring-2 ring-red-300" />
                  <div>
                    <span className="font-bold text-white">Difficile (7-10)</span>
                    <p className="text-red-100 font-medium">Ciblez le Top 14</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Difficulty info */}
            <div className="p-4 rounded-lg bg-card border-2 border-border shadow-sm">
              <div className="flex items-center gap-3 mb-0">
              <div className={`w-4 h-4 rounded-full ${
                difficulty.index <= 3 ? 'bg-green-500' : 
                difficulty.index <= 6 ? 'bg-amber-500' : 'bg-red-500'
              } ring-2 ring-offset-2 ring-offset-card ${
                difficulty.index <= 3 ? 'ring-green-400' : 
                difficulty.index <= 6 ? 'ring-amber-400' : 'ring-red-400'
              }`} />
              <span className={`font-bold text-base ${
                difficulty.index <= 3 ? 'text-green-600 dark:text-green-400' : 
                difficulty.index <= 6 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'
              }`}>
                Course {difficulty.label}
              </span>
              <Badge className={`ml-auto text-sm font-bold ${
                difficulty.index <= 3 ? 'bg-green-600 text-white border-green-400' : 
                difficulty.index <= 6 ? 'bg-amber-600 text-white border-amber-400' : 'bg-red-600 text-white border-red-400'
              }`}>
                Zone cible: Top {difficulty.index <= 3 ? 6 : difficulty.index <= 6 ? 10 : 14}
              </Badge>
              </div>
            </div>
            
            {/* Odds ranking with colored zones */}
            <div className="p-4 rounded-lg bg-card border-2 border-border shadow-sm">
              <h4 className="text-sm font-bold mb-3 flex items-center gap-2 text-foreground">
                <TrendingUp className="w-5 h-5 text-primary" />
                Classement par Cotes (zones ciblées)
              </h4>
              <div className="flex flex-wrap gap-2 mb-3">
                {sortedHorses.slice(0, 16).map((horse, index) => {
                  const targetZone = difficulty.index <= 3 ? 6 : difficulty.index <= 6 ? 10 : 14;
                  const isInZone = index < targetZone;
                  return (
                    <div
                      key={horse.number}
                      className={`px-3 py-2 rounded-lg text-sm font-mono font-bold transition-all shadow-md ${
                        isInZone
                          ? difficulty.index <= 3
                            ? 'bg-green-600 text-white border-2 border-green-400 ring-2 ring-green-400/50'
                            : difficulty.index <= 6
                              ? 'bg-amber-600 text-white border-2 border-amber-400 ring-2 ring-amber-400/50'
                              : 'bg-red-600 text-white border-2 border-red-400 ring-2 ring-red-400/50'
                          : 'bg-muted/80 text-muted-foreground border border-border'
                      }`}
                    >
                      <span className="text-lg font-extrabold">{horse.number}</span>
                      <span className="text-xs ml-1.5 opacity-90">({horse.odds.toFixed(1)})</span>
                    </div>
                  );
                })}
              </div>
              <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-2 border border-border">
                {difficulty.index <= 3 
                  ? "🎯 Course facile : concentrez-vous sur les 6 premiers (favoris nets)"
                  : difficulty.index <= 6
                    ? "⚡ Course moyenne : élargissez aux 10 premiers (favoris + outsiders)"
                    : "⚠️ Course difficile : zone large Top 14 (incluez des tocards)"}
              </p>
            </div>
            
            {/* Best horses by category */}
            <div className="p-4 rounded-lg bg-card border-2 border-border shadow-sm">
              <h4 className="text-sm font-bold mb-3 flex items-center gap-2 text-foreground">
                <Heart className="w-5 h-5 text-pink-500" />
                Meilleurs chevaux par catégorie
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Favoris */}
              <div className="p-3 rounded-lg bg-amber-600 border-2 border-amber-400 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Trophy className="w-5 h-5 text-white" />
                  <span className="text-sm font-bold text-white">2 Meilleurs Favoris</span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {horses.filter(h => h.isFavorite).sort((a, b) => a.odds - b.odds).slice(0, 2).map(h => (
                    <Badge key={h.number} className="bg-white text-amber-700 border-amber-200 text-sm font-bold px-3 py-1.5 shadow-sm">
                      N°{h.number} <span className="ml-1 opacity-90">({h.odds.toFixed(1)})</span>
                    </Badge>
                  ))}
                  {horses.filter(h => h.isFavorite).length === 0 && (
                    <span className="text-sm text-amber-100">Aucun favori</span>
                  )}
                </div>
              </div>
              
              {/* Outsiders */}
              <div className="p-3 rounded-lg bg-blue-600 border-2 border-blue-400 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-white" />
                  <span className="text-sm font-bold text-white">2 Meilleurs Outsiders</span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {horses.filter(h => !h.isFavorite && !h.isTocard).sort((a, b) => a.odds - b.odds).slice(0, 2).map(h => (
                    <Badge key={h.number} className="bg-white text-blue-700 border-blue-200 text-sm font-bold px-3 py-1.5 shadow-sm">
                      N°{h.number} <span className="ml-1 opacity-90">({h.odds.toFixed(1)})</span>
                    </Badge>
                  ))}
                  {horses.filter(h => !h.isFavorite && !h.isTocard).length === 0 && (
                    <span className="text-sm text-blue-100">Aucun outsider</span>
                  )}
                </div>
              </div>
              
              {/* Tocards */}
              <div className="p-3 rounded-lg bg-red-600 border-2 border-red-400 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-5 h-5 text-white" />
                  <span className="text-sm font-bold text-white">2 Meilleurs Tocards</span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {horses.filter(h => h.isTocard).sort((a, b) => a.odds - b.odds).slice(0, 2).map(h => (
                    <Badge key={h.number} className="bg-white text-red-700 border-red-200 text-sm font-bold px-3 py-1.5 shadow-sm">
                      N°{h.number} <span className="ml-1 opacity-90">({h.odds.toFixed(1)})</span>
                    </Badge>
                  ))}
                  {horses.filter(h => h.isTocard).length === 0 && (
                    <span className="text-sm text-red-100">Aucun tocard</span>
                  )}
                </div>
              </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Modules Tabs */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-primary" />
            Modules de réduction
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-5 md:grid-cols-9 gap-1 h-auto">
              <TabsTrigger value="generator" className="gap-1 text-xs px-2 py-1.5">
                <Filter className="w-3 h-3" />
                <span className="hidden sm:inline">Filtres</span>
                {hasActiveGeneratorFilters && (
                  <CircleDot className="w-2 h-2 text-green-500" />
                )}
              </TabsTrigger>
              <TabsTrigger value="paniers" className="gap-1 text-xs px-2 py-1.5">
                <Package className="w-3 h-3" />
                <span className="hidden sm:inline">Paniers</span>
                {filters.paniers.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-4 w-4 p-0 text-[10px] flex items-center justify-center">
                    {filters.paniers.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="groupes" className="gap-1 text-xs px-2 py-1.5">
                <Users className="w-3 h-3" />
                <span className="hidden sm:inline">Groupes</span>
                {filters.groupes.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-4 w-4 p-0 text-[10px] flex items-center justify-center">
                    {filters.groupes.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="simulator" className="gap-1 text-xs px-2 py-1.5">
                <BarChart3 className="w-3 h-3" />
                <span className="hidden sm:inline">Simulator</span>
                {filters.simulator.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-4 w-4 p-0 text-[10px] flex items-center justify-center">
                    {filters.simulator.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="chevaux-hs" className="gap-1 text-xs px-2 py-1.5">
                <X className="w-3 h-3" />
                <span className="hidden sm:inline">HS</span>
                {filters.chevauxHS.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-4 w-4 p-0 text-[10px] flex items-center justify-center">
                    {filters.chevauxHS.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="favoris-tocards" className="gap-1 text-xs px-2 py-1.5">
                <Trophy className="w-3 h-3" />
                <span className="hidden sm:inline">Fav/Toc</span>
                {(filters.favorisCount || filters.tocardsCount) && (
                  <CircleDot className="w-2 h-2 text-green-500" />
                )}
              </TabsTrigger>
              <TabsTrigger value="pronostics" className="gap-1 text-xs px-2 py-1.5">
                <Lightbulb className="w-3 h-3" />
                <span className="hidden sm:inline">Pronos</span>
                {(filters.pronostic1 || filters.pronostic2) && (
                  <CircleDot className="w-2 h-2 text-green-500" />
                )}
              </TabsTrigger>
              <TabsTrigger value="consecutifs" className="gap-1 text-xs px-2 py-1.5">
                <Hash className="w-3 h-3" />
                <span className="hidden sm:inline">Suites</span>
                {(filters.eliminateSerie2 || filters.eliminateSerie3 || filters.eliminateNoSerie) && (
                  <CircleDot className="w-2 h-2 text-green-500" />
                )}
              </TabsTrigger>
              <TabsTrigger value="couples" className="gap-1 text-xs px-2 py-1.5">
                <Heart className="w-3 h-3 text-pink-500" />
                <span className="hidden sm:inline">Couples</span>
              </TabsTrigger>
            </TabsList>
            
            <div className="mt-4">
              <TabsContent value="generator">
                <GeneratorFiltersModule
                  filters={generatorFilters}
                  onChange={setGeneratorFilters}
                  horses={horses}
                  betType={betType}
                />
              </TabsContent>
              
              <TabsContent value="paniers">
                <PanierModule
                  stats={panierStats}
                  selected={filters.paniers}
                  suggested={suggestedPaniers}
                  onChange={(paniers) => setFilters({ ...filters, paniers })}
                />
              </TabsContent>
              
              <TabsContent value="groupes">
                <GroupeModule
                  stats={groupeStats}
                  selected={filters.groupes}
                  suggested={suggestedGroupes}
                  onChange={(groupes) => setFilters({ ...filters, groupes })}
                />
              </TabsContent>
              
              <TabsContent value="simulator">
                <SimulatorModule
                  stats={simulatorStats}
                  selected={filters.simulator}
                  suggested={suggestedSimulator}
                  onChange={(simulator) => setFilters({ ...filters, simulator })}
                />
              </TabsContent>
              
              <TabsContent value="chevaux-hs">
                <ChevauxHSModule
                  horses={horses}
                  selected={filters.chevauxHS}
                  onChange={(chevauxHS) => setFilters({ ...filters, chevauxHS })}
                />
              </TabsContent>
              
              <TabsContent value="favoris-tocards">
                <FavorisTocardsModule
                  horses={horses}
                  betType={betType}
                  favorisCount={filters.favorisCount}
                  tocardsCount={filters.tocardsCount}
                  onFavorisChange={(favorisCount) => setFilters({ ...filters, favorisCount })}
                  onTocardsChange={(tocardsCount) => setFilters({ ...filters, tocardsCount })}
                />
              </TabsContent>
              
              <TabsContent value="pronostics">
                <PronosticModule
                  horses={horses}
                  betType={betType}
                  pronostic1={filters.pronostic1}
                  pronostic2={filters.pronostic2}
                  onPronostic1Change={(pronostic1) => setFilters({ ...filters, pronostic1 })}
                  onPronostic2Change={(pronostic2) => setFilters({ ...filters, pronostic2 })}
                />
              </TabsContent>
              
              <TabsContent value="consecutifs">
                <ConsecutifsModule
                  betType={betType}
                  eliminateSerie2={filters.eliminateSerie2}
                  eliminateSerie3={filters.eliminateSerie3}
                  eliminateNoSerie={filters.eliminateNoSerie}
                  onChange={(serie2, serie3, noSerie) => setFilters({
                    ...filters,
                    eliminateSerie2: serie2,
                    eliminateSerie3: serie3,
                    eliminateNoSerie: noSerie
                  })}
                />
              </TabsContent>
              
              <TabsContent value="couples">
                <CouplesModule horses={sortedHorses} arrivee={arrivee} />
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>
      
      {/* Results */}
      {hasActiveFilters && (
        <ResultsDisplay
          combinations={filteredCombinations}
          horses={horses}
          betType={betType}
          betCost={betCost}
          difficultyIndex={difficulty?.index}
        />
      )}
    </div>
  );
}

