
import { useState, useMemo, useEffect } from 'react';
import { Shuffle, Filter, Zap, Download, RotateCcw, Trophy, Users, Save, History, Trash2, Clock, ChevronDown, ChevronUp, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Horse, AnalysisResult } from '@/types/racing';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface GeneratorTabProps {
  result: AnalysisResult | null;
}

type BetType = 'couple' | 'tierce' | 'quarte' | 'quinte';

interface Filters {
  betType: BetType;
  parityFilter: 'all' | 'odd' | 'even' | 'mixed';
  minSumNumbers: number;
  maxSumNumbers: number;
  minSumOdds: number;
  maxSumOdds: number;
  minFavorites: number;
  maxFavorites: number;
  minOutsiders: number;
  maxOutsiders: number;
  selectedHorses: number[];
  excludedHorses: number[];
  coupSurHorses: number[]; // Chevaux "coup sûr" qui apparaissent dans TOUTES les combinaisons
  maxCombinations: number;
  // Line filters (L1: 1,4,5,8,9,12,13,16... / L2: 2,3,6,7,10,11,14,15...)
  minL1: number;
  maxL1: number;
  minL2: number;
  maxL2: number;
  // Champ réduit
  champReduitEnabled: boolean;
  baseHorses: number[]; // Chevaux en base (positions fixes)
  associeHorses: number[]; // Chevaux associés (positions variables)
}

// Helper function to determine which line a number belongs to
const getLine = (n: number): 'L1' | 'L2' => {
  const posInGroup = (n - 1) % 4;
  // L1: positions 0 and 3 (numbers 1,4,5,8,9,12,13,16...)
  // L2: positions 1 and 2 (numbers 2,3,6,7,10,11,14,15...)
  return posInGroup === 0 || posInGroup === 3 ? 'L1' : 'L2';
};

interface Combination {
  horses: number[];
  sumNumbers: number;
  sumOdds: number;
  favoriteCount: number;
  outsiderCount: number;
  parity: 'odd' | 'even' | 'mixed';
  isChampReduit?: boolean;
  champReduitFormat?: string; // Format like "1×2-3-4"
}

interface HistoryEntry {
  id: string;
  bet_type: BetType;
  combinations: Combination[];
  filters: Filters;
  horse_count: number;
  combination_count: number;
  created_at: string;
}

const DEFAULT_FILTERS: Filters = {
  betType: 'tierce',
  parityFilter: 'all',
  minSumNumbers: 0,
  maxSumNumbers: 100,
  minSumOdds: 0,
  maxSumOdds: 200,
  minFavorites: 0,
  maxFavorites: 5,
  minOutsiders: 0,
  maxOutsiders: 5,
  selectedHorses: [],
  excludedHorses: [],
  coupSurHorses: [],
  maxCombinations: 100,
  minL1: 0,
  maxL1: 5,
  minL2: 0,
  maxL2: 5,
  champReduitEnabled: false,
  baseHorses: [],
  associeHorses: [],
};

const BET_TYPE_CONFIG = {
  couple: { label: 'Couplé', count: 2, icon: '🎯' },
  tierce: { label: 'Tiercé', count: 3, icon: '🥉' },
  quarte: { label: 'Quarté', count: 4, icon: '🏅' },
  quinte: { label: 'Quinté', count: 5, icon: '🏆' },
};

const HISTORY_STORAGE_KEY = 'combination_history';
const MAX_HISTORY_ENTRIES = 50;

export function GeneratorTab({ result }: GeneratorTabProps) {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [combinations, setCombinations] = useState<Combination[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);

  const horses = result?.horses || [];
  
  // Sort horses by odds (smallest to largest)
  const sortedHorses = useMemo(() => 
    [...horses].sort((a, b) => (a.cote || 999) - (b.cote || 999)),
    [horses]
  );
  
  const favoriteNumbers = useMemo(() => 
    result?.favorites.map(h => h.numero) || [], 
    [result?.favorites]
  );
  const outsiderNumbers = useMemo(() => 
    horses.filter(h => h.label === 'OUTSIDER').map(h => h.numero),
    [horses]
  );

  // Load history from localStorage on mount
  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = () => {
    try {
      const stored = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as HistoryEntry[];
        setHistory(parsed);
      }
    } catch (error) {
      console.error('Error loading history from localStorage:', error);
      setHistory([]);
    }
  };

  const saveHistoryToStorage = (entries: HistoryEntry[]) => {
    try {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(entries));
    } catch (error) {
      console.error('Error saving history to localStorage:', error);
    }
  };

  const updateFilter = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const toggleHorseSelection = (numero: number, type: 'selected' | 'excluded' | 'coupSur' | 'base' | 'associe') => {
    if (type === 'base') {
      setFilters(prev => {
        const newBase = prev.baseHorses.includes(numero)
          ? prev.baseHorses.filter(n => n !== numero)
          : [...prev.baseHorses, numero];
        
        // Retirer des associés et exclus
        const newAssocie = prev.associeHorses.filter(n => n !== numero);
        const newExcluded = prev.excludedHorses.filter(n => n !== numero);
        
        return {
          ...prev,
          baseHorses: newBase,
          associeHorses: newAssocie,
          excludedHorses: newExcluded,
        };
      });
      return;
    }
    
    if (type === 'associe') {
      setFilters(prev => {
        const newAssocie = prev.associeHorses.includes(numero)
          ? prev.associeHorses.filter(n => n !== numero)
          : [...prev.associeHorses, numero];
        
        // Retirer des bases et exclus
        const newBase = prev.baseHorses.filter(n => n !== numero);
        const newExcluded = prev.excludedHorses.filter(n => n !== numero);
        
        return {
          ...prev,
          associeHorses: newAssocie,
          baseHorses: newBase,
          excludedHorses: newExcluded,
        };
      });
      return;
    }
    
    if (type === 'coupSur') {
      setFilters(prev => {
        const newCoupSur = prev.coupSurHorses.includes(numero)
          ? prev.coupSurHorses.filter(n => n !== numero)
          : [...prev.coupSurHorses, numero];
        
        // Si on ajoute au coup sûr, on retire des exclus
        const newExcluded = prev.excludedHorses.filter(n => n !== numero);
        
        return {
          ...prev,
          coupSurHorses: newCoupSur,
          excludedHorses: newExcluded,
        };
      });
      return;
    }
    
    const key = type === 'selected' ? 'selectedHorses' : 'excludedHorses';
    const otherKey = type === 'selected' ? 'excludedHorses' : 'selectedHorses';
    
    setFilters(prev => {
      const newList = prev[key].includes(numero)
        ? prev[key].filter(n => n !== numero)
        : [...prev[key], numero];
      
      const newOtherList = prev[otherKey].filter(n => n !== numero);
      // Si on exclut, on retire du coup sûr, base et associé
      const newCoupSur = type === 'excluded' 
        ? prev.coupSurHorses.filter(n => n !== numero)
        : prev.coupSurHorses;
      const newBase = type === 'excluded'
        ? prev.baseHorses.filter(n => n !== numero)
        : prev.baseHorses;
      const newAssocie = type === 'excluded'
        ? prev.associeHorses.filter(n => n !== numero)
        : prev.associeHorses;
      
      return {
        ...prev,
        [key]: newList,
        [otherKey]: newOtherList,
        coupSurHorses: newCoupSur,
        baseHorses: newBase,
        associeHorses: newAssocie,
      };
    });
  };

  // Génération des combinaisons en champ réduit avec rotation des bases
  // Format: Pour un couplé avec 1-2-3-4: 1×2-3-4, 2×3-4, 3-4
  const generateChampReduit = () => {
    if (horses.length === 0) {
      toast({
        title: "Aucune donnée",
        description: "Analysez d'abord une course dans l'onglet Données",
        variant: "destructive",
      });
      return;
    }

    const count = BET_TYPE_CONFIG[filters.betType].count;
    
    // Combiner bases et associés pour le champ réduit
    const allChampHorses = [...new Set([...filters.baseHorses, ...filters.associeHorses])].sort((a, b) => a - b);
    
    if (allChampHorses.length < count) {
      toast({
        title: "Pas assez de chevaux",
        description: `Le ${BET_TYPE_CONFIG[filters.betType].label} nécessite ${count} chevaux. Vous avez sélectionné ${allChampHorses.length} chevaux (bases + associés).`,
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    const horseMap = new Map(horses.map(h => [h.numero, h]));
    const allCombinations: Combination[] = [];
    const seenCombos = new Set<string>();

    // Générer toutes les permutations ordonnées
    const generatePermutations = (arr: number[], size: number): number[][] => {
      if (size === 1) return arr.map(n => [n]);
      const results: number[][] = [];
      for (let i = 0; i < arr.length; i++) {
        const rest = arr.filter((_, idx) => idx !== i);
        const perms = generatePermutations(rest, size - 1);
        for (const perm of perms) {
          results.push([arr[i], ...perm]);
        }
      }
      return results;
    };

    // Générer toutes les combinaisons possibles avec les chevaux sélectionnés
    const permutations = generatePermutations(allChampHorses, count);

    for (const perm of permutations) {
      const comboKey = perm.join('-');
      if (seenCombos.has(comboKey)) continue;
      seenCombos.add(comboKey);

      const sumNumbers = perm.reduce((a, b) => a + b, 0);
      const sumOdds = perm.reduce((a, n) => a + (horseMap.get(n)?.cote || 0), 0);
      const favoriteCount = perm.filter(n => favoriteNumbers.includes(n)).length;
      const outsiderCount = perm.filter(n => outsiderNumbers.includes(n)).length;
      const parity = calculateParity(perm);
      const l1Count = perm.filter(n => getLine(n) === 'L1').length;
      const l2Count = perm.filter(n => getLine(n) === 'L2').length;

      // Appliquer les mêmes filtres que la génération normale
      if (filters.parityFilter !== 'all' && parity !== filters.parityFilter) continue;
      if (sumNumbers < filters.minSumNumbers || sumNumbers > filters.maxSumNumbers) continue;
      if (sumOdds < filters.minSumOdds || sumOdds > filters.maxSumOdds) continue;
      if (favoriteCount < filters.minFavorites || favoriteCount > filters.maxFavorites) continue;
      if (outsiderCount < filters.minOutsiders || outsiderCount > filters.maxOutsiders) continue;
      if (l1Count < filters.minL1 || l1Count > filters.maxL1) continue;
      if (l2Count < filters.minL2 || l2Count > filters.maxL2) continue;

      // Créer le format champ réduit (ex: 1×2-3-4)
      const champReduitFormat = `${perm[0]}×${perm.slice(1).join('-')}`;

      allCombinations.push({
        horses: perm,
        sumNumbers,
        sumOdds: Math.round(sumOdds * 10) / 10,
        favoriteCount,
        outsiderCount,
        parity,
        isChampReduit: true,
        champReduitFormat,
      });

      if (allCombinations.length >= filters.maxCombinations) break;
    }

    setCombinations(allCombinations);
    setIsGenerating(false);

    // Afficher le format champ réduit dans le toast
    const champStr = allChampHorses.join('-');
    toast({
      title: "Champ réduit généré",
      description: `${allCombinations.length} combinaisons avec les chevaux: ${champStr}`,
    });
  };

  const calculateParity = (nums: number[]): 'odd' | 'even' | 'mixed' => {
    const oddCount = nums.filter(n => n % 2 === 1).length;
    if (oddCount === nums.length) return 'odd';
    if (oddCount === 0) return 'even';
    return 'mixed';
  };

  const generateCombinations = () => {
    if (horses.length === 0) {
      toast({
        title: "Aucune donnée",
        description: "Analysez d'abord une course dans l'onglet Données",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    const count = BET_TYPE_CONFIG[filters.betType].count;
    const availableHorses = horses.filter(h => !filters.excludedHorses.includes(h.numero));
    
    // Vérifier que les coups sûrs existent dans les chevaux disponibles
    const validCoupSur = filters.coupSurHorses.filter(n => 
      availableHorses.some(h => h.numero === n)
    );
    
    if (validCoupSur.length > count) {
      toast({
        title: "Erreur de coup sûr",
        description: `Vous avez sélectionné ${validCoupSur.length} coups sûrs mais le ${BET_TYPE_CONFIG[filters.betType].label} n'en prend que ${count}`,
        variant: "destructive",
      });
      setIsGenerating(false);
      return;
    }
    
    const mustInclude = filters.selectedHorses.filter(n => 
      availableHorses.some(h => h.numero === n)
    );
    
    // Combiner coup sûr et chevaux obligatoires (sans doublon)
    const allMustInclude = [...new Set([...validCoupSur, ...mustInclude])];
    
    if (allMustInclude.length > count) {
      toast({
        title: "Erreur de sélection",
        description: `Vous avez sélectionné ${allMustInclude.length} chevaux obligatoires (coups sûrs + sélection) mais le ${BET_TYPE_CONFIG[filters.betType].label} n'en prend que ${count}`,
        variant: "destructive",
      });
      setIsGenerating(false);
      return;
    }

    const horseNumbers = availableHorses.map(h => h.numero);
    const horseMap = new Map(horses.map(h => [h.numero, h]));
    
    const allCombinations: Combination[] = [];
    
    const generatePermutations = (
      arr: number[],
      size: number,
      current: number[] = []
    ): number[][] => {
      if (current.length === size) {
        // Vérifier que TOUS les coups sûrs sont présents
        if (validCoupSur.every(n => current.includes(n)) && mustInclude.every(n => current.includes(n))) {
          return [current];
        }
        return [];
      }
      
      const results: number[][] = [];
      for (let i = 0; i < arr.length; i++) {
        if (!current.includes(arr[i])) {
          results.push(...generatePermutations(arr, size, [...current, arr[i]]));
        }
      }
      return results;
    };

    const permutations = generatePermutations(horseNumbers, count);
    
    for (const perm of permutations) {
      const sumNumbers = perm.reduce((a, b) => a + b, 0);
      const sumOdds = perm.reduce((a, n) => a + (horseMap.get(n)?.cote || 0), 0);
      const favoriteCount = perm.filter(n => favoriteNumbers.includes(n)).length;
      const outsiderCount = perm.filter(n => outsiderNumbers.includes(n)).length;
      const parity = calculateParity(perm);
      const l1Count = perm.filter(n => getLine(n) === 'L1').length;
      const l2Count = perm.filter(n => getLine(n) === 'L2').length;

      if (filters.parityFilter !== 'all' && parity !== filters.parityFilter) continue;
      if (sumNumbers < filters.minSumNumbers || sumNumbers > filters.maxSumNumbers) continue;
      if (sumOdds < filters.minSumOdds || sumOdds > filters.maxSumOdds) continue;
      if (favoriteCount < filters.minFavorites || favoriteCount > filters.maxFavorites) continue;
      if (outsiderCount < filters.minOutsiders || outsiderCount > filters.maxOutsiders) continue;
      if (l1Count < filters.minL1 || l1Count > filters.maxL1) continue;
      if (l2Count < filters.minL2 || l2Count > filters.maxL2) continue;

      allCombinations.push({
        horses: perm,
        sumNumbers,
        sumOdds: Math.round(sumOdds * 10) / 10,
        favoriteCount,
        outsiderCount,
        parity,
      });

      if (allCombinations.length >= filters.maxCombinations) break;
    }

    setCombinations(allCombinations);
    setIsGenerating(false);

    toast({
      title: "Combinaisons générées",
      description: `${allCombinations.length} combinaisons trouvées`,
    });
  };

  const saveCombinations = () => {
    if (combinations.length === 0) {
      toast({
        title: "Rien à sauvegarder",
        description: "Générez d'abord des combinaisons",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    const newEntry: HistoryEntry = {
      id: crypto.randomUUID(),
      bet_type: filters.betType,
      combinations: combinations,
      filters: filters,
      horse_count: horses.length,
      combination_count: combinations.length,
      created_at: new Date().toISOString(),
    };

    const updatedHistory = [newEntry, ...history].slice(0, MAX_HISTORY_ENTRIES);
    saveHistoryToStorage(updatedHistory);
    setHistory(updatedHistory);

    setIsSaving(false);

    toast({
      title: "Sauvegardé",
      description: `${combinations.length} combinaisons enregistrées`,
    });
  };

  const deleteHistoryEntry = (id: string) => {
    const updatedHistory = history.filter(entry => entry.id !== id);
    saveHistoryToStorage(updatedHistory);
    setHistory(updatedHistory);

    toast({
      title: "Supprimé",
      description: "Entrée supprimée de l'historique",
    });
  };

  const loadFromHistory = (entry: HistoryEntry) => {
    setFilters(entry.filters);
    setCombinations(entry.combinations);
    setShowHistory(false);
    
    toast({
      title: "Chargé",
      description: `${entry.combination_count} combinaisons restaurées`,
    });
  };

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setCombinations([]);
    toast({
      title: "Filtres réinitialisés",
      description: "Tous les paramètres sont revenus par défaut",
    });
  };

  const exportCombinations = () => {
    if (combinations.length === 0) return;
    
    const content = combinations
      .map((c, i) => {
        // Utiliser le format champ réduit si disponible, sinon format standard
        const formatCombo = c.isChampReduit && c.champReduitFormat 
          ? c.champReduitFormat 
          : c.horses.join('-');
        return `${i + 1}. ${formatCombo} (Σnum: ${c.sumNumbers}, Σcote: ${c.sumOdds})`;
      })
      .join('\n');
    
    const filePrefix = filters.champReduitEnabled ? 'champ_reduit_' : '';
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filePrefix}${filters.betType}_combinations.txt`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: "Export réussi",
      description: `Fichier téléchargé${filters.champReduitEnabled ? ' (format champ réduit)' : ''}`,
    });
  };

  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Shuffle className="w-16 h-16 text-muted-foreground/30 mb-4" />
        <h3 className="text-xl font-semibold text-muted-foreground mb-2">
          Générateur de combinaisons
        </h3>
        <p className="text-sm text-muted-foreground mb-6">
          Analysez d'abord une course pour générer des combinaisons
        </p>
        
        {/* Show history even without analysis */}
        {history.length > 0 && (
          <div className="w-full max-w-2xl">
            <Button
              onClick={() => setShowHistory(!showHistory)}
              variant="outline"
              className="mb-4"
            >
              <History className="w-4 h-4 mr-2" />
              Voir l'historique ({history.length})
            </Button>
            
            {showHistory && (
              <div className="cyber-card text-left">
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {history.map((entry) => (
                      <HistoryCard
                        key={entry.id}
                        entry={entry}
                        isExpanded={expandedHistoryId === entry.id}
                        onToggle={() => setExpandedHistoryId(expandedHistoryId === entry.id ? null : entry.id)}
                        onDelete={() => deleteHistoryEntry(entry.id)}
                        onLoad={() => loadFromHistory(entry)}
                      />
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* History Toggle */}
      {history.length > 0 && (
        <div className="cyber-card">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center justify-between w-full"
          >
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-secondary" />
              <h3 className="text-lg font-semibold text-foreground">
                Historique des combinaisons
              </h3>
              <Badge variant="outline" className="ml-2">{history.length}</Badge>
            </div>
            {showHistory ? (
              <ChevronUp className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            )}
          </button>
          
          {showHistory && (
            <div className="mt-4">
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {history.map((entry) => (
                    <HistoryCard
                      key={entry.id}
                      entry={entry}
                      isExpanded={expandedHistoryId === entry.id}
                      onToggle={() => setExpandedHistoryId(expandedHistoryId === entry.id ? null : entry.id)}
                      onDelete={() => deleteHistoryEntry(entry.id)}
                      onLoad={() => loadFromHistory(entry)}
                    />
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      )}

      {/* Bet Type Selector */}
      <div className="cyber-card">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Type de pari</h3>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(Object.entries(BET_TYPE_CONFIG) as [BetType, typeof BET_TYPE_CONFIG.tierce][]).map(([key, config]) => (
            <button
              key={key}
              onClick={() => updateFilter('betType', key)}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                filters.betType === key
                  ? 'border-primary bg-primary/10 shadow-glow-green'
                  : 'border-border hover:border-primary/50 hover:bg-muted/30'
              }`}
            >
              <span className="text-2xl">{config.icon}</span>
              <span className="font-semibold text-foreground">{config.label}</span>
              <span className="text-xs text-muted-foreground">{config.count} chevaux</span>
            </button>
          ))}
        </div>
      </div>

      {/* Coup Sûr Selection */}
      <div className="cyber-card border-2 border-cyan-500/50">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-5 h-5 text-cyan-400" />
          <h3 className="text-lg font-semibold text-foreground">Coup Sûr</h3>
          <Badge variant="outline" className="ml-2 border-cyan-500/50 text-cyan-400">
            Présent dans TOUTES les combinaisons
          </Badge>
        </div>
        
        <Label className="text-sm text-muted-foreground mb-2 block">
          Sélectionnez les chevaux qui doivent apparaître dans chaque combinaison
        </Label>
        <div className="flex flex-wrap gap-2">
          {sortedHorses.map(horse => {
            const isFavorite = favoriteNumbers.includes(horse.numero);
            const isOutsider = outsiderNumbers.includes(horse.numero);
            const isCoupSur = filters.coupSurHorses.includes(horse.numero);
            const isExcluded = filters.excludedHorses.includes(horse.numero);
            const label = isFavorite ? 'FAVORI' : isOutsider ? 'OUTSIDER' : '';
            
            return (
              <button
                key={horse.numero}
                onClick={() => toggleHorseSelection(horse.numero, 'coupSur')}
                disabled={isExcluded}
                title={`${horse.name || `Cheval ${horse.numero}`} - Cote: ${horse.cote?.toFixed(1) || 'N/A'}${label ? ` (${label})` : ''}${isCoupSur ? ' (COUP SÛR)' : ''}`}
                className={`relative w-10 h-10 rounded-lg border text-sm font-bold transition-all ${
                  isCoupSur
                    ? 'border-cyan-500 bg-cyan-500/30 text-cyan-300 ring-2 ring-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.5)]'
                    : isExcluded
                    ? 'border-destructive/30 bg-destructive/10 text-destructive/50 line-through cursor-not-allowed'
                    : isFavorite
                    ? 'border-yellow-500/70 bg-yellow-500/10 text-yellow-400 hover:border-cyan-500'
                    : isOutsider
                    ? 'border-orange-500/70 bg-orange-500/10 text-orange-400 hover:border-cyan-500'
                    : 'border-border hover:border-cyan-500/50'
                }`}
              >
                {horse.numero}
                {isCoupSur && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-cyan-500 rounded-full flex items-center justify-center">
                    <Zap className="w-2 h-2 text-white" />
                  </span>
                )}
                {!isCoupSur && isFavorite && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-500 rounded-full" />
                )}
                {!isCoupSur && isOutsider && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-orange-500 rounded-full" />
                )}
              </button>
            );
          })}
        </div>
        {filters.coupSurHorses.length > 0 && (
          <div className="mt-3 p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
            <span className="text-sm text-cyan-400">
              <Zap className="w-4 h-4 inline mr-1" />
              Coups sûrs sélectionnés: {filters.coupSurHorses.sort((a, b) => a - b).join(', ')}
            </span>
          </div>
        )}
      </div>

      {/* Champ Réduit Selection */}
      <div className="cyber-card border-2 border-purple-500/50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-purple-400" />
            <h3 className="text-lg font-semibold text-foreground">Champ Réduit</h3>
            <Badge variant="outline" className="ml-2 border-purple-500/50 text-purple-400">
              Toutes combinaisons
            </Badge>
          </div>
          <Button
            variant={filters.champReduitEnabled ? "default" : "outline"}
            size="sm"
            onClick={() => updateFilter('champReduitEnabled', !filters.champReduitEnabled)}
            className={filters.champReduitEnabled 
              ? "bg-purple-500 hover:bg-purple-600 text-white" 
              : "border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
            }
          >
            {filters.champReduitEnabled ? 'Activé' : 'Désactivé'}
          </Button>
        </div>
        
        {filters.champReduitEnabled && (
          <>
            <Label className="text-sm text-purple-300 mb-3 block font-semibold">
              Sélectionnez les chevaux pour le champ réduit
              <span className="text-xs text-muted-foreground block mt-1">
                Ex: Couplé 1-2-3-4 → 1×2-3-4, 2×3-4, 3-4 | Tiercé 1-2-3-4-5 → 1×2-3-4-5, 2×3-4-5...
              </span>
            </Label>
            
            <div className="flex flex-wrap gap-2 mb-4">
              {sortedHorses.map(horse => {
                const isFavorite = favoriteNumbers.includes(horse.numero);
                const isOutsider = outsiderNumbers.includes(horse.numero);
                const isChampReduit = filters.baseHorses.includes(horse.numero) || filters.associeHorses.includes(horse.numero);
                const isExcluded = filters.excludedHorses.includes(horse.numero);
                
                const toggleChampReduit = () => {
                  if (isChampReduit) {
                    setFilters(prev => ({
                      ...prev,
                      baseHorses: prev.baseHorses.filter(n => n !== horse.numero),
                      associeHorses: prev.associeHorses.filter(n => n !== horse.numero),
                    }));
                  } else {
                    setFilters(prev => ({
                      ...prev,
                      baseHorses: [...prev.baseHorses, horse.numero],
                      excludedHorses: prev.excludedHorses.filter(n => n !== horse.numero),
                    }));
                  }
                };
                
                return (
                  <button
                    key={horse.numero}
                    onClick={toggleChampReduit}
                    disabled={isExcluded}
                    title={`${horse.name || `Cheval ${horse.numero}`} - Cote: ${horse.cote?.toFixed(1) || 'N/A'}${isChampReduit ? ' (SÉLECTIONNÉ)' : ''}`}
                    className={`relative w-10 h-10 rounded-lg border text-sm font-bold transition-all ${
                      isChampReduit
                        ? 'border-purple-500 bg-purple-500/30 text-purple-300 ring-2 ring-purple-500/50 shadow-[0_0_10px_rgba(168,85,247,0.5)]'
                        : isExcluded
                        ? 'border-destructive/30 bg-destructive/10 text-destructive/50 line-through cursor-not-allowed'
                        : isFavorite
                        ? 'border-yellow-500/70 bg-yellow-500/10 text-yellow-400 hover:border-purple-500'
                        : isOutsider
                        ? 'border-orange-500/70 bg-orange-500/10 text-orange-400 hover:border-purple-500'
                        : 'border-border hover:border-purple-500/50'
                    }`}
                  >
                    {horse.numero}
                    {isChampReduit && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-purple-500 rounded-full flex items-center justify-center text-[8px] text-white font-bold">
                        ✓
                      </span>
                    )}
                    {!isChampReduit && isFavorite && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-500 rounded-full" />
                    )}
                    {!isChampReduit && isOutsider && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 bg-orange-500 rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Preview */}
            {(filters.baseHorses.length > 0 || filters.associeHorses.length > 0) && (
              <div className="p-3 rounded-lg bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30">
                <div className="text-sm mb-2">
                  <span className="text-purple-300 font-semibold">Chevaux sélectionnés: </span>
                  <span className="text-purple-200 font-mono">
                    {[...new Set([...filters.baseHorses, ...filters.associeHorses])].sort((a, b) => a - b).join(' - ')}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  📊 {BET_TYPE_CONFIG[filters.betType].label}: 
                  {(() => {
                    const allNums = [...new Set([...filters.baseHorses, ...filters.associeHorses])].sort((a, b) => a - b);
                    const count = BET_TYPE_CONFIG[filters.betType].count;
                    if (allNums.length < count) return ` (sélectionnez au moins ${count} chevaux)`;
                    
                    const examples: string[] = [];
                    for (let i = 0; i <= Math.min(2, allNums.length - count); i++) {
                      if (i === 0) {
                        examples.push(`${allNums[0]}×${allNums.slice(1, count).join('-')}`);
                      } else {
                        const base = allNums.slice(0, i + 1).join('-');
                        const remaining = allNums.slice(i + 1, i + count);
                        if (remaining.length > 0) {
                          examples.push(`${base}×${remaining.join('-')}`);
                        }
                      }
                    }
                    if (allNums.length === count) {
                      examples.push(allNums.join('-'));
                    }
                    const n = allNums.length;
                    const k = count;
                    const factorial = (num: number): number => num <= 1 ? 1 : num * factorial(num - 1);
                    const permCount = factorial(n) / factorial(n - k);
                    return ` ${examples.join(', ')}... (${permCount} combinaisons max)`;
                  })()}
                </div>
                
                <Button
                  onClick={generateChampReduit}
                  disabled={isGenerating}
                  className="mt-3 w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg"
                >
                  <Target className="w-4 h-4 mr-2" />
                  {isGenerating ? 'Génération...' : 'Générer Champ Réduit'}
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Horse Selection */}
      <div className="cyber-card">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-secondary" />
          <h3 className="text-lg font-semibold text-foreground">Sélection des chevaux</h3>
        </div>
        
        <div className="grid grid-cols-2 gap-6">
          <div>
            <Label className="text-sm text-muted-foreground mb-2 block">
              Chevaux obligatoires (cliquez pour sélectionner)
            </Label>
            <div className="flex flex-wrap gap-2">
              {sortedHorses.map(horse => {
                const isFavorite = favoriteNumbers.includes(horse.numero);
                const isOutsider = outsiderNumbers.includes(horse.numero);
                const isCoupSur = filters.coupSurHorses.includes(horse.numero);
                const label = isFavorite ? 'FAVORI' : isOutsider ? 'OUTSIDER' : '';
                
                return (
                  <button
                    key={horse.numero}
                    onClick={() => toggleHorseSelection(horse.numero, 'selected')}
                    title={`${horse.name || `Cheval ${horse.numero}`} - Cote: ${horse.cote?.toFixed(1) || 'N/A'}${label ? ` (${label})` : ''}${isCoupSur ? ' (COUP SÛR)' : ''}`}
                    className={`relative w-10 h-10 rounded-lg border text-sm font-bold transition-all ${
                      isCoupSur
                        ? 'border-cyan-500/50 bg-cyan-500/20 text-cyan-400'
                        : filters.selectedHorses.includes(horse.numero)
                        ? 'border-primary bg-primary/20 text-primary ring-2 ring-primary/50'
                        : filters.excludedHorses.includes(horse.numero)
                        ? 'border-destructive/30 bg-destructive/10 text-destructive/50 line-through'
                        : isFavorite
                        ? 'border-yellow-500/70 bg-yellow-500/10 text-yellow-400 hover:border-yellow-500'
                        : isOutsider
                        ? 'border-orange-500/70 bg-orange-500/10 text-orange-400 hover:border-orange-500'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    {horse.numero}
                    {isCoupSur && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 bg-cyan-500 rounded-full" />
                    )}
                    {!isCoupSur && isFavorite && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-500 rounded-full" />
                    )}
                    {!isCoupSur && isOutsider && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 bg-orange-500 rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          
          <div>
            <Label className="text-sm text-muted-foreground mb-2 block">
              Chevaux à exclure
            </Label>
            <div className="flex flex-wrap gap-2">
              {sortedHorses.map(horse => {
                const isFavorite = favoriteNumbers.includes(horse.numero);
                const isOutsider = outsiderNumbers.includes(horse.numero);
                const isCoupSur = filters.coupSurHorses.includes(horse.numero);
                const label = isFavorite ? 'FAVORI' : isOutsider ? 'OUTSIDER' : '';
                
                return (
                  <button
                    key={horse.numero}
                    onClick={() => toggleHorseSelection(horse.numero, 'excluded')}
                    disabled={isCoupSur}
                    title={`${horse.name || `Cheval ${horse.numero}`} - Cote: ${horse.cote?.toFixed(1) || 'N/A'}${label ? ` (${label})` : ''}${isCoupSur ? ' (COUP SÛR - ne peut pas être exclu)' : ''}`}
                    className={`relative w-10 h-10 rounded-lg border text-sm font-bold transition-all ${
                      isCoupSur
                        ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400/50 cursor-not-allowed'
                        : filters.excludedHorses.includes(horse.numero)
                        ? 'border-destructive bg-destructive/20 text-destructive ring-2 ring-destructive/50'
                        : filters.selectedHorses.includes(horse.numero)
                        ? 'border-primary/30 bg-primary/10 text-primary/50'
                        : isFavorite
                        ? 'border-yellow-500/70 bg-yellow-500/10 text-yellow-400 hover:border-yellow-500'
                        : isOutsider
                        ? 'border-orange-500/70 bg-orange-500/10 text-orange-400 hover:border-orange-500'
                        : 'border-border hover:border-destructive/50'
                    }`}
                  >
                    {horse.numero}
                    {isCoupSur && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 bg-cyan-500 rounded-full" />
                    )}
                    {!isCoupSur && isFavorite && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-500 rounded-full" />
                    )}
                    {!isCoupSur && isOutsider && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 bg-orange-500 rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Filters */}
      <div className="cyber-card">
        <div className="flex items-center gap-2 mb-6">
          <Filter className="w-5 h-5 text-accent" />
          <h3 className="text-lg font-semibold text-foreground">Filtres avancés</h3>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Parity */}
          <div className="space-y-2">
            <Label>Parité des numéros</Label>
            <Select 
              value={filters.parityFilter} 
              onValueChange={(v) => updateFilter('parityFilter', v as Filters['parityFilter'])}
            >
              <SelectTrigger className="bg-muted/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="odd">Impairs uniquement</SelectItem>
                <SelectItem value="even">Pairs uniquement</SelectItem>
                <SelectItem value="mixed">Mixte</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sum of Numbers */}
          <div className="space-y-2">
            <Label>Somme des numéros</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={filters.minSumNumbers}
                onChange={(e) => updateFilter('minSumNumbers', Number(e.target.value))}
                className="w-20 bg-muted/50"
                placeholder="Min"
              />
              <span className="text-muted-foreground">à</span>
              <Input
                type="number"
                value={filters.maxSumNumbers}
                onChange={(e) => updateFilter('maxSumNumbers', Number(e.target.value))}
                className="w-20 bg-muted/50"
                placeholder="Max"
              />
            </div>
          </div>

          {/* Sum of Odds */}
          <div className="space-y-2">
            <Label>Somme des cotes</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={filters.minSumOdds}
                onChange={(e) => updateFilter('minSumOdds', Number(e.target.value))}
                className="w-20 bg-muted/50"
                placeholder="Min"
              />
              <span className="text-muted-foreground">à</span>
              <Input
                type="number"
                value={filters.maxSumOdds}
                onChange={(e) => updateFilter('maxSumOdds', Number(e.target.value))}
                className="w-20 bg-muted/50"
                placeholder="Max"
              />
            </div>
          </div>

          {/* Number of Favorites */}
          <div className="space-y-2">
            <Label>Nombre de favoris ({favoriteNumbers.join(', ')})</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                max={BET_TYPE_CONFIG[filters.betType].count}
                value={filters.minFavorites}
                onChange={(e) => updateFilter('minFavorites', Number(e.target.value))}
                className="w-20 bg-muted/50"
                placeholder="Min"
              />
              <span className="text-muted-foreground">à</span>
              <Input
                type="number"
                min={0}
                max={BET_TYPE_CONFIG[filters.betType].count}
                value={filters.maxFavorites}
                onChange={(e) => updateFilter('maxFavorites', Number(e.target.value))}
                className="w-20 bg-muted/50"
                placeholder="Max"
              />
            </div>
          </div>

          {/* Number of Outsiders */}
          <div className="space-y-2">
            <Label>Nombre d'outsiders ({outsiderNumbers.join(', ') || 'aucun'})</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                max={BET_TYPE_CONFIG[filters.betType].count}
                value={filters.minOutsiders}
                onChange={(e) => updateFilter('minOutsiders', Number(e.target.value))}
                className="w-20 bg-muted/50"
                placeholder="Min"
              />
              <span className="text-muted-foreground">à</span>
              <Input
                type="number"
                min={0}
                max={BET_TYPE_CONFIG[filters.betType].count}
                value={filters.maxOutsiders}
                onChange={(e) => updateFilter('maxOutsiders', Number(e.target.value))}
                className="w-20 bg-muted/50"
                placeholder="Max"
              />
            </div>
          </div>

          {/* Line L1 Filter */}
          <div className="space-y-2">
            <Label>
              Ligne L1 
              <span className="text-xs text-muted-foreground ml-1">(1,4,5,8,9,12,13,16...)</span>
            </Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                max={BET_TYPE_CONFIG[filters.betType].count}
                value={filters.minL1}
                onChange={(e) => updateFilter('minL1', Number(e.target.value))}
                className="w-20 bg-muted/50"
                placeholder="Min"
              />
              <span className="text-muted-foreground">à</span>
              <Input
                type="number"
                min={0}
                max={BET_TYPE_CONFIG[filters.betType].count}
                value={filters.maxL1}
                onChange={(e) => updateFilter('maxL1', Number(e.target.value))}
                className="w-20 bg-muted/50"
                placeholder="Max"
              />
            </div>
          </div>

          {/* Line L2 Filter */}
          <div className="space-y-2">
            <Label>
              Ligne L2 
              <span className="text-xs text-muted-foreground ml-1">(2,3,6,7,10,11,14,15...)</span>
            </Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                max={BET_TYPE_CONFIG[filters.betType].count}
                value={filters.minL2}
                onChange={(e) => updateFilter('minL2', Number(e.target.value))}
                className="w-20 bg-muted/50"
                placeholder="Min"
              />
              <span className="text-muted-foreground">à</span>
              <Input
                type="number"
                min={0}
                max={BET_TYPE_CONFIG[filters.betType].count}
                value={filters.maxL2}
                onChange={(e) => updateFilter('maxL2', Number(e.target.value))}
                className="w-20 bg-muted/50"
                placeholder="Max"
              />
            </div>
          </div>

          {/* Max Combinations */}
          <div className="space-y-2">
            <Label>Limite de combinaisons</Label>
            <Select 
              value={String(filters.maxCombinations)} 
              onValueChange={(v) => updateFilter('maxCombinations', Number(v))}
            >
              <SelectTrigger className="bg-muted/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="50">50 max</SelectItem>
                <SelectItem value="100">100 max</SelectItem>
                <SelectItem value="200">200 max</SelectItem>
                <SelectItem value="500">500 max</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <Button
          onClick={generateCombinations}
          disabled={isGenerating}
          className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow-green"
        >
          <Zap className="w-4 h-4 mr-2" />
          {isGenerating ? 'Génération...' : 'Générer les combinaisons'}
        </Button>
        
        <Button
          onClick={resetFilters}
          variant="outline"
          className="border-muted-foreground/30"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Réinitialiser
        </Button>
        
        {combinations.length > 0 && (
          <>
            <Button
              onClick={saveCombinations}
              disabled={isSaving}
              variant="outline"
              className="border-success text-success hover:bg-success/10"
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
            </Button>
            
            <Button
              onClick={exportCombinations}
              variant="outline"
              className="border-secondary text-secondary hover:bg-secondary/10"
            >
              <Download className="w-4 h-4 mr-2" />
              Exporter
            </Button>
          </>
        )}
      </div>

      {/* Results */}
      {combinations.length > 0 && (
        <div className="cyber-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">
              Combinaisons ({combinations.length})
            </h3>
            <Badge variant="outline" className="border-primary/50 text-primary">
              {BET_TYPE_CONFIG[filters.betType].label}
            </Badge>
          </div>
          
          <ScrollArea className="h-[400px] scrollbar-cyber">
            <div className="space-y-2">
              {combinations.map((combo, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50 hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-8">
                      #{index + 1}
                    </span>
                    {combo.isChampReduit && combo.champReduitFormat ? (
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-purple-400 font-bold bg-purple-500/20 px-2 py-1 rounded">
                          {combo.champReduitFormat}
                        </span>
                        <div className="flex items-center gap-0.5">
                          {combo.horses.map((num, i) => (
                            <span
                              key={i}
                              className={`w-7 h-7 rounded flex items-center justify-center text-xs font-bold ${
                                i === 0
                                  ? 'bg-purple-500/30 text-purple-300 border border-purple-500/50'
                                  : favoriteNumbers.includes(num)
                                  ? 'bg-success/20 text-success border border-success/30'
                                  : outsiderNumbers.includes(num)
                                  ? 'bg-secondary/20 text-secondary border border-secondary/30'
                                  : 'bg-muted/50 text-foreground border border-border'
                              }`}
                            >
                              {num}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        {combo.horses.map((num, i) => (
                          <span
                            key={i}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                              favoriteNumbers.includes(num)
                                ? 'bg-success/20 text-success border border-success/30'
                                : outsiderNumbers.includes(num)
                                ? 'bg-secondary/20 text-secondary border border-secondary/30'
                                : 'bg-muted/50 text-foreground border border-border'
                            }`}
                          >
                            {num}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>Σnum: <span className="text-foreground font-medium">{combo.sumNumbers}</span></span>
                    <span>Σcote: <span className="text-foreground font-medium">{combo.sumOdds}</span></span>
                    <span className={`px-2 py-0.5 rounded ${
                      combo.parity === 'odd' ? 'bg-accent/20 text-accent' :
                      combo.parity === 'even' ? 'bg-secondary/20 text-secondary' :
                      'bg-muted/50 text-muted-foreground'
                    }`}>
                      {combo.parity === 'odd' ? 'Impairs' : combo.parity === 'even' ? 'Pairs' : 'Mixte'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}

// History Card Component
interface HistoryCardProps {
  entry: HistoryEntry;
  isExpanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onLoad: () => void;
}

function HistoryCard({ entry, isExpanded, onToggle, onDelete, onLoad }: HistoryCardProps) {
  const config = BET_TYPE_CONFIG[entry.bet_type];
  
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-full p-3 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">{config.icon}</span>
          <div className="text-left">
            <div className="font-medium text-foreground">
              {config.label} - {entry.combination_count} combinaisons
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              {format(new Date(entry.created_at), "d MMM yyyy 'à' HH:mm", { locale: fr })}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {entry.horse_count} chevaux
          </Badge>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </button>
      
      {isExpanded && (
        <div className="border-t border-border p-3 bg-muted/20">
          <div className="text-xs text-muted-foreground mb-3 space-y-1">
            <div>Parité: {entry.filters.parityFilter === 'all' ? 'Tous' : entry.filters.parityFilter}</div>
            <div>Somme num: {entry.filters.minSumNumbers} - {entry.filters.maxSumNumbers}</div>
            <div>Somme cotes: {entry.filters.minSumOdds} - {entry.filters.maxSumOdds}</div>
            <div>Favoris: {entry.filters.minFavorites} - {entry.filters.maxFavorites}</div>
            <div>Outsiders: {entry.filters.minOutsiders} - {entry.filters.maxOutsiders}</div>
          </div>
          
          <div className="flex gap-2">
            <Button
              onClick={onLoad}
              size="sm"
              className="flex-1 bg-primary/20 text-primary hover:bg-primary/30"
            >
              Charger
            </Button>
            <Button
              onClick={onDelete}
              size="sm"
              variant="outline"
              className="border-destructive/50 text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

