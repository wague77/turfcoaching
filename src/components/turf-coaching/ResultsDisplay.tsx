
import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Target, Euro, List, Copy, Check, 
  ChevronDown, ChevronUp, Trophy, Sparkles, ArrowUpDown,
  Star, TrendingUp, Zap, AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import { Combination, Horse } from '@/lib/turf-coaching-logic';

interface ResultsDisplayProps {
  combinations: Combination[];
  horses: Horse[];
  betType: 'tierce' | 'quarte' | 'quinte';
  betCost: number;
  difficultyIndex?: number;
}

type SortMode = 'odds' | 'panier' | 'groupe' | 'default';

export function ResultsDisplay({ combinations, horses, betType, betCost, difficultyIndex }: ResultsDisplayProps) {
  const [showAll, setShowAll] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>('odds');
  
  // Create a map of horse number to odds for quick lookup
  const horseOddsMap = useMemo(() => {
    return new Map(horses.map(h => [h.number, h.odds]));
  }, [horses]);
  
  // Get difficulty label and color
  const getDifficultyInfo = (index: number | undefined) => {
    if (index === undefined) return null;
    if (index <= 3) return { label: 'Facile', color: 'bg-green-500', textColor: 'text-green-600', zones: [1, 6] };
    if (index <= 6) return { label: 'Moyenne', color: 'bg-amber-500', textColor: 'text-amber-600', zones: [1, 10] };
    return { label: 'Difficile', color: 'bg-red-500', textColor: 'text-red-600', zones: [1, 14] };
  };
  
  const difficultyInfo = getDifficultyInfo(difficultyIndex);
  
  // Categorize horses
  const categorizedHorses = useMemo(() => {
    const favoris = horses.filter(h => h.isFavorite).sort((a, b) => a.odds - b.odds);
    const tocards = horses.filter(h => h.isTocard).sort((a, b) => a.odds - b.odds);
    const outsiders = horses.filter(h => !h.isFavorite && !h.isTocard).sort((a, b) => a.odds - b.odds);
    
    return {
      favoris: favoris.slice(0, 2),
      outsiders: outsiders.slice(0, 2),
      tocards: tocards.slice(0, 2)
    };
  }, [horses]);
  
  // Sort combinations based on mode
  const sortedCombinations = useMemo(() => {
    const sorted = [...combinations];
    
    switch (sortMode) {
      case 'odds':
        // Sort by sum of odds (lowest first = best favorites)
        sorted.sort((a, b) => {
          const sumA = a.horses.reduce((sum, n) => sum + (horseOddsMap.get(n) || 50), 0);
          const sumB = b.horses.reduce((sum, n) => sum + (horseOddsMap.get(n) || 50), 0);
          return sumA - sumB;
        });
        break;
      case 'panier':
        // Sort by panier (P30 first)
        sorted.sort((a, b) => {
          const panierOrder = ['P30', 'P29', 'P28', 'P27', 'P26', 'P25', 'P24', 'P23', 'P22', 'P21', 
                              'P20', 'P19', 'P18', 'P17', 'P16', 'P15', 'P14', 'P13', 'P12', 'PX'];
          return panierOrder.indexOf(a.panier) - panierOrder.indexOf(b.panier);
        });
        break;
      case 'groupe':
        // Sort by groupe (G7 first)
        sorted.sort((a, b) => {
          const groupeOrder = ['G7', 'G6', 'G5', 'G4', 'G3', 'G2', 'G1'];
          return groupeOrder.indexOf(a.groupe) - groupeOrder.indexOf(b.groupe);
        });
        break;
      default:
        // Keep original order
        break;
    }
    
    return sorted;
  }, [combinations, sortMode, horseOddsMap]);
  
  const displayLimit = 50;
  const displayedCombinations = showAll 
    ? sortedCombinations 
    : sortedCombinations.slice(0, displayLimit);
  
  const copyToClipboard = () => {
    const text = sortedCombinations
      .map(c => c.horses.join(' - '))
      .join('\n');
    
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      toast.success('Combinaisons copiées !');
      setTimeout(() => setCopied(false), 2000);
    });
  };
  
  const getHorseInfo = (number: number): Horse | undefined => {
    return horses.find(h => h.number === number);
  };
  
  // Calculate sum of odds for a combination
  const getCombinationOddsSum = (combo: Combination): number => {
    return combo.horses.reduce((sum, n) => sum + (horseOddsMap.get(n) || 0), 0);
  };
  
  // Check if horse is in target zone based on difficulty
  const isInTargetZone = (index: number): boolean => {
    if (!difficultyInfo) return false;
    return index < difficultyInfo.zones[1];
  };
  
  if (combinations.length === 0) {
    return (
      <Card className="border-destructive/50 bg-destructive/5">
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <Target className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-destructive mb-2">
              Aucune combinaison restante
            </h3>
            <p className="text-sm text-muted-foreground">
              Vos filtres ont éliminé toutes les combinaisons. Essayez de relâcher certains critères.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <CardTitle className="flex items-center gap-2">
            <List className="w-5 h-5 text-primary" />
            Combinaisons restantes
          </CardTitle>
          
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="gap-1 px-3 py-1.5">
              <Target className="w-3 h-3" />
              {combinations.length} combis
            </Badge>
            <Badge className="gap-1 px-3 py-1.5 bg-green-500/10 text-green-600 border-green-500/30">
              <Euro className="w-3 h-3" />
              {betCost.toFixed(2)}€
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-4 space-y-4">
        {/* Difficulty-based suggestions */}
        {difficultyInfo && horses.length > 0 && (
          <div className="p-4 rounded-lg border-2 border-dashed" style={{
            borderColor: difficultyIndex && difficultyIndex <= 3 ? 'hsl(var(--success))' : 
                        difficultyIndex && difficultyIndex <= 6 ? 'hsl(var(--warning))' : 'hsl(var(--destructive))'
          }}>
            {/* Difficulty header */}
            <div className="flex items-center gap-2 mb-4">
              <div className={`w-3 h-3 rounded-full ${difficultyInfo.color}`} />
              <span className={`font-semibold ${difficultyInfo.textColor}`}>
                Course {difficultyInfo.label}
              </span>
              <Badge variant="outline" className="ml-auto">
                Zone cible: Top {difficultyInfo.zones[1]}
              </Badge>
            </div>
            
            {/* Odds ranking with colored zones */}
            <div className="mb-4">
              <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                <TrendingUp className="w-4 h-4" />
                Classement par Cotes (zones ciblées)
              </h4>
              <div className="flex flex-wrap gap-1">
                {horses.sort((a, b) => a.odds - b.odds).slice(0, 16).map((horse, index) => (
                  <div
                    key={horse.number}
                    className={`px-2 py-1 rounded text-xs font-mono font-semibold transition-all ${
                      isInTargetZone(index)
                        ? difficultyIndex && difficultyIndex <= 3
                          ? 'bg-green-500/20 text-green-700 border border-green-500/40 ring-1 ring-green-500/30'
                          : difficultyIndex && difficultyIndex <= 6
                            ? 'bg-amber-500/20 text-amber-700 border border-amber-500/40 ring-1 ring-amber-500/30'
                            : 'bg-red-500/20 text-red-700 border border-red-500/40 ring-1 ring-red-500/30'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {horse.number}
                    <span className="text-[10px] ml-1 opacity-70">({horse.odds.toFixed(1)})</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {difficultyIndex && difficultyIndex <= 3 
                  ? "🎯 Course facile : concentrez-vous sur les 6 premiers (favoris nets)"
                  : difficultyIndex && difficultyIndex <= 6
                    ? "⚡ Course moyenne : élargissez aux 10 premiers (favoris + outsiders)"
                    : "⚠️ Course difficile : zone large Top 14 (incluez des tocards)"}
              </p>
            </div>
            
            {/* Best horses by category */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Favoris */}
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <div className="flex items-center gap-1 mb-2">
                  <Star className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-semibold text-amber-700">2 Meilleurs Favoris</span>
                </div>
                <div className="flex gap-2">
                  {categorizedHorses.favoris.length > 0 ? categorizedHorses.favoris.map(h => (
                    <Badge key={h.number} className="bg-amber-500/20 text-amber-700 border-amber-500/40">
                      N°{h.number} <span className="ml-1 opacity-70">({h.odds.toFixed(1)})</span>
                    </Badge>
                  )) : (
                    <span className="text-xs text-muted-foreground">Aucun favori</span>
                  )}
                </div>
              </div>
              
              {/* Outsiders */}
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
                <div className="flex items-center gap-1 mb-2">
                  <TrendingUp className="w-4 h-4 text-blue-500" />
                  <span className="text-xs font-semibold text-blue-700">2 Meilleurs Outsiders</span>
                </div>
                <div className="flex gap-2">
                  {categorizedHorses.outsiders.length > 0 ? categorizedHorses.outsiders.map(h => (
                    <Badge key={h.number} className="bg-blue-500/20 text-blue-700 border-blue-500/40">
                      N°{h.number} <span className="ml-1 opacity-70">({h.odds.toFixed(1)})</span>
                    </Badge>
                  )) : (
                    <span className="text-xs text-muted-foreground">Aucun outsider</span>
                  )}
                </div>
              </div>
              
              {/* Tocards */}
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                <div className="flex items-center gap-1 mb-2">
                  <Zap className="w-4 h-4 text-red-500" />
                  <span className="text-xs font-semibold text-red-700">2 Meilleurs Tocards</span>
                </div>
                <div className="flex gap-2">
                  {categorizedHorses.tocards.length > 0 ? categorizedHorses.tocards.map(h => (
                    <Badge key={h.number} className="bg-red-500/20 text-red-700 border-red-500/40">
                      N°{h.number} <span className="ml-1 opacity-70">({h.odds.toFixed(1)})</span>
                    </Badge>
                  )) : (
                    <span className="text-xs text-muted-foreground">Aucun tocard</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Sort options */}
        <div className="flex flex-wrap gap-2 mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={copyToClipboard}
            className="gap-1"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copié !' : 'Copier tout'}
          </Button>
          
          <div className="flex items-center gap-1 ml-auto">
            <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground mr-2">Trier par:</span>
            <Button
              variant={sortMode === 'odds' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSortMode('odds')}
              className="text-xs h-7 px-2"
            >
              Cotes
            </Button>
            <Button
              variant={sortMode === 'panier' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSortMode('panier')}
              className="text-xs h-7 px-2"
            >
              Panier
            </Button>
            <Button
              variant={sortMode === 'groupe' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSortMode('groupe')}
              className="text-xs h-7 px-2"
            >
              Groupe
            </Button>
          </div>
        </div>
        
        {/* Combinations grid */}
        <ScrollArea className="h-[400px]">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {displayedCombinations.map((combo, index) => {
              const oddsSum = getCombinationOddsSum(combo);
              return (
                <div
                  key={index}
                  className="p-2 bg-muted/50 rounded-lg border border-border hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-center justify-center gap-1 font-mono text-sm font-semibold">
                    {combo.horses.map((num, i) => {
                      const horse = getHorseInfo(num);
                      const isFavorite = horse?.isFavorite;
                      const isTocard = horse?.isTocard;
                    
                    return (
                      <span key={i} className="flex items-center">
                        {i > 0 && <span className="text-muted-foreground mx-0.5">-</span>}
                        <span className={`
                          px-1.5 py-0.5 rounded
                          ${isFavorite ? 'bg-yellow-500/20 text-yellow-600' : ''}
                          ${isTocard ? 'bg-red-500/20 text-red-400' : ''}
                        `}>
                          {num}
                        </span>
                      </span>
                    );
                  })}
                  </div>
                  <div className="flex justify-between items-center mt-1 text-[10px] text-muted-foreground">
                    <div className="flex gap-1">
                      <span>{combo.panier}</span>
                      <span>•</span>
                      <span>{combo.groupe}</span>
                    </div>
                    <span className="font-medium text-primary">{oddsSum.toFixed(1)}</span>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Show more/less button */}
          {combinations.length > displayLimit && (
            <div className="text-center mt-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAll(!showAll)}
                className="gap-1"
              >
                {showAll ? (
                  <>
                    <ChevronUp className="w-4 h-4" />
                    Afficher moins
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4" />
                    Afficher tout ({combinations.length - displayLimit} de plus)
                  </>
                )}
              </Button>
            </div>
          )}
        </ScrollArea>
        
        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-yellow-500/20 rounded flex items-center justify-center">
              <Trophy className="w-3 h-3 text-yellow-600" />
            </div>
            <span>Favori</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-red-500/20 rounded flex items-center justify-center text-red-400 text-[10px] font-bold">
              T
            </div>
            <span>Tocard</span>
          </div>
        </div>
        
        {/* Tips */}
        <div className="mt-4 p-3 bg-primary/5 rounded-lg border border-primary/20">
          <div className="flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-primary mt-0.5" />
            <div className="text-xs">
              <p className="font-medium text-primary mb-1">Conseil Turf-Coaching</p>
              <p className="text-muted-foreground">
                {combinations.length <= 10 
                  ? "Excellent ! Avec moins de 10 combinaisons, vous avez de bonnes chances de succès pour une mise raisonnable."
                  : combinations.length <= 30
                    ? "Bonne réduction ! Vous pouvez encore affiner avec d'autres modules pour réduire la mise."
                    : "Continuez à utiliser les modules pour réduire davantage vos combinaisons et optimiser votre mise."}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

