
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Filter, Hash, TrendingUp, Zap, Target, 
  ChevronDown, ChevronUp, RotateCcw, Sigma 
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

export interface GeneratorFilters {
  parityFilter: 'all' | 'odd' | 'even' | 'mixed';
  minSumNumbers: number;
  maxSumNumbers: number;
  minSumOdds: number;
  maxSumOdds: number;
  minFavorites: number;
  maxFavorites: number;
  minOutsiders: number;
  maxOutsiders: number;
  minL1: number;
  maxL1: number;
  minL2: number;
  maxL2: number;
  coupSurHorses: number[];
  excludedHorses: number[];
  selectedHorses: number[];
}

interface GeneratorFiltersModuleProps {
  filters: GeneratorFilters;
  onChange: (filters: GeneratorFilters) => void;
  horses: { number: number; odds: number; isFavorite: boolean; isTocard: boolean }[];
  betType: 'tierce' | 'quarte' | 'quinte';
}

const DEFAULT_GENERATOR_FILTERS: GeneratorFilters = {
  parityFilter: 'all',
  minSumNumbers: 0,
  maxSumNumbers: 100,
  minSumOdds: 0,
  maxSumOdds: 500,
  minFavorites: 0,
  maxFavorites: 5,
  minOutsiders: 0,
  maxOutsiders: 5,
  minL1: 0,
  maxL1: 5,
  minL2: 0,
  maxL2: 5,
  coupSurHorses: [],
  excludedHorses: [],
  selectedHorses: [],
};

export function GeneratorFiltersModule({ 
  filters, 
  onChange, 
  horses, 
  betType 
}: GeneratorFiltersModuleProps) {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  
  const updateFilter = <K extends keyof GeneratorFilters>(key: K, value: GeneratorFilters[K]) => {
    onChange({ ...filters, [key]: value });
  };
  
  const resetFilters = () => {
    onChange(DEFAULT_GENERATOR_FILTERS);
  };
  
  const toggleHorse = (num: number, type: 'coupSur' | 'excluded' | 'selected') => {
    const key = type === 'coupSur' ? 'coupSurHorses' : type === 'excluded' ? 'excludedHorses' : 'selectedHorses';
    
    const current = filters[key];
    const newValue = current.includes(num) 
      ? current.filter(n => n !== num) 
      : [...current, num];
    
    // Remove from other lists
    const newCoupSur = key === 'coupSurHorses' ? newValue : filters.coupSurHorses.filter(n => n !== num);
    const newExcluded = key === 'excludedHorses' ? newValue : filters.excludedHorses.filter(n => n !== num);
    const newSelected = key === 'selectedHorses' ? newValue : filters.selectedHorses.filter(n => n !== num);
    
    onChange({ 
      ...filters, 
      coupSurHorses: newCoupSur,
      excludedHorses: newExcluded,
      selectedHorses: newSelected
    });
  };
  
  const favorites = horses.filter(h => h.isFavorite);
  const outsiders = horses.filter(h => h.isTocard);
  const betSize = betType === 'tierce' ? 3 : betType === 'quarte' ? 4 : 5;
  
  const hasActiveFilters = 
    filters.parityFilter !== 'all' ||
    filters.minSumNumbers > 0 ||
    filters.maxSumNumbers < 100 ||
    filters.minSumOdds > 0 ||
    filters.maxSumOdds < 500 ||
    filters.minFavorites > 0 ||
    filters.maxFavorites < 5 ||
    filters.minOutsiders > 0 ||
    filters.maxOutsiders < 5 ||
    filters.minL1 > 0 ||
    filters.maxL1 < 5 ||
    filters.minL2 > 0 ||
    filters.maxL2 < 5 ||
    filters.coupSurHorses.length > 0 ||
    filters.excludedHorses.length > 0 ||
    filters.selectedHorses.length > 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Filtres Générateur</h3>
          {hasActiveFilters && (
            <Badge variant="secondary" className="text-xs">Actif</Badge>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={resetFilters} className="gap-1 text-xs">
          <RotateCcw className="w-3 h-3" />
          Réinitialiser
        </Button>
      </div>
      
      {/* Coup Sûr Selection */}
      <Card className="p-4 border-primary/30 bg-primary/5">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Coup Sûr</span>
          <span className="text-xs text-muted-foreground">(présent dans toutes les combinaisons)</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {horses.map(horse => {
            const isCoupSur = filters.coupSurHorses.includes(horse.number);
            const isExcluded = filters.excludedHorses.includes(horse.number);
            
            return (
              <button
                key={horse.number}
                onClick={() => toggleHorse(horse.number, 'coupSur')}
                disabled={isExcluded}
                className={`w-8 h-8 rounded text-sm font-bold transition-all ${
                  isCoupSur
                    ? 'bg-primary text-primary-foreground ring-2 ring-primary/50'
                    : isExcluded
                    ? 'bg-destructive/20 text-destructive/50 line-through cursor-not-allowed'
                    : horse.isFavorite
                    ? 'bg-accent text-accent-foreground border border-primary/50 hover:bg-primary/20'
                    : horse.isTocard
                    ? 'bg-muted text-muted-foreground border border-border hover:bg-primary/20'
                    : 'bg-muted hover:bg-primary/20 border border-border'
                }`}
              >
                {horse.number}
              </button>
            );
          })}
        </div>
        {filters.coupSurHorses.length > 0 && (
          <p className="text-xs text-primary mt-2">
            Sélectionnés: {filters.coupSurHorses.sort((a, b) => a - b).join(', ')}
          </p>
        )}
      </Card>
      
      {/* Excluded Horses */}
      <Card className="p-4 border-destructive/30 bg-destructive/5">
        <div className="flex items-center gap-2 mb-3">
          <Target className="w-4 h-4 text-destructive" />
          <span className="text-sm font-medium">Chevaux Exclus</span>
          <span className="text-xs text-muted-foreground">(ne jamais inclure)</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {horses.map(horse => {
            const isExcluded = filters.excludedHorses.includes(horse.number);
            const isCoupSur = filters.coupSurHorses.includes(horse.number);
            
            return (
              <button
                key={horse.number}
                onClick={() => toggleHorse(horse.number, 'excluded')}
                disabled={isCoupSur}
                className={`w-8 h-8 rounded text-sm font-bold transition-all ${
                  isExcluded
                    ? 'bg-destructive text-destructive-foreground ring-2 ring-destructive/50'
                    : isCoupSur
                    ? 'bg-primary/20 text-primary/50 cursor-not-allowed'
                    : 'bg-muted hover:bg-destructive/20 border border-border'
                }`}
              >
                {horse.number}
              </button>
            );
          })}
        </div>
        {filters.excludedHorses.length > 0 && (
          <p className="text-xs text-destructive mt-2">
            Exclus: {filters.excludedHorses.sort((a, b) => a - b).join(', ')}
          </p>
        )}
      </Card>
      
      {/* Parity Filter */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-xs mb-2 flex items-center gap-1">
            <Hash className="w-3 h-3" />
            Parité
          </Label>
          <Select 
            value={filters.parityFilter} 
            onValueChange={(v) => updateFilter('parityFilter', v as GeneratorFilters['parityFilter'])}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes</SelectItem>
              <SelectItem value="odd">Impair majoritaire</SelectItem>
              <SelectItem value="even">Pair majoritaire</SelectItem>
              <SelectItem value="mixed">Mixte</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label className="text-xs mb-2">Favoris ({favorites.length} dispo)</Label>
          <div className="flex gap-2">
            <Input
              type="number"
              min={0}
              max={betSize}
              value={filters.minFavorites}
              onChange={(e) => updateFilter('minFavorites', parseInt(e.target.value) || 0)}
              className="h-9 w-16"
              placeholder="Min"
            />
            <span className="self-center text-muted-foreground">-</span>
            <Input
              type="number"
              min={0}
              max={betSize}
              value={filters.maxFavorites}
              onChange={(e) => updateFilter('maxFavorites', parseInt(e.target.value) || 5)}
              className="h-9 w-16"
              placeholder="Max"
            />
          </div>
        </div>
      </div>
      
      {/* Advanced Filters */}
      <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between h-9 text-sm">
            <span className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filtres avancés
            </span>
            {isAdvancedOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 mt-4">
          {/* Outsiders */}
          <div>
            <Label className="text-xs mb-2">Tocards ({outsiders.length} dispo)</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                min={0}
                max={betSize}
                value={filters.minOutsiders}
                onChange={(e) => updateFilter('minOutsiders', parseInt(e.target.value) || 0)}
                className="h-9 w-16"
                placeholder="Min"
              />
              <span className="self-center text-muted-foreground">-</span>
              <Input
                type="number"
                min={0}
                max={betSize}
                value={filters.maxOutsiders}
                onChange={(e) => updateFilter('maxOutsiders', parseInt(e.target.value) || 5)}
                className="h-9 w-16"
                placeholder="Max"
              />
            </div>
          </div>
          
          {/* Sum of Numbers */}
          <div>
            <Label className="text-xs mb-2 flex items-center gap-1">
              <Sigma className="w-3 h-3" />
              Somme des numéros
            </Label>
            <div className="flex gap-2">
              <Input
                type="number"
                min={0}
                value={filters.minSumNumbers}
                onChange={(e) => updateFilter('minSumNumbers', parseInt(e.target.value) || 0)}
                className="h-9"
                placeholder="Min"
              />
              <span className="self-center text-muted-foreground">-</span>
              <Input
                type="number"
                min={0}
                value={filters.maxSumNumbers}
                onChange={(e) => updateFilter('maxSumNumbers', parseInt(e.target.value) || 100)}
                className="h-9"
                placeholder="Max"
              />
            </div>
          </div>
          
          {/* Sum of Odds */}
          <div>
            <Label className="text-xs mb-2 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              Somme des cotes
            </Label>
            <div className="flex gap-2">
              <Input
                type="number"
                min={0}
                value={filters.minSumOdds}
                onChange={(e) => updateFilter('minSumOdds', parseInt(e.target.value) || 0)}
                className="h-9"
                placeholder="Min"
              />
              <span className="self-center text-muted-foreground">-</span>
              <Input
                type="number"
                min={0}
                value={filters.maxSumOdds}
                onChange={(e) => updateFilter('maxSumOdds', parseInt(e.target.value) || 500)}
                className="h-9"
                placeholder="Max"
              />
            </div>
          </div>
          
          {/* L1/L2 Filters */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs mb-2">
                Ligne L1 <span className="text-muted-foreground">(1,4,5,8...)</span>
              </Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min={0}
                  max={betSize}
                  value={filters.minL1}
                  onChange={(e) => updateFilter('minL1', parseInt(e.target.value) || 0)}
                  className="h-9 w-14"
                  placeholder="Min"
                />
                <span className="self-center text-muted-foreground">-</span>
                <Input
                  type="number"
                  min={0}
                  max={betSize}
                  value={filters.maxL1}
                  onChange={(e) => updateFilter('maxL1', parseInt(e.target.value) || 5)}
                  className="h-9 w-14"
                  placeholder="Max"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs mb-2">
                Ligne L2 <span className="text-muted-foreground">(2,3,6,7...)</span>
              </Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min={0}
                  max={betSize}
                  value={filters.minL2}
                  onChange={(e) => updateFilter('minL2', parseInt(e.target.value) || 0)}
                  className="h-9 w-14"
                  placeholder="Min"
                />
                <span className="self-center text-muted-foreground">-</span>
                <Input
                  type="number"
                  min={0}
                  max={betSize}
                  value={filters.maxL2}
                  onChange={(e) => updateFilter('maxL2', parseInt(e.target.value) || 5)}
                  className="h-9 w-14"
                  placeholder="Max"
                />
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

export { DEFAULT_GENERATOR_FILTERS };

