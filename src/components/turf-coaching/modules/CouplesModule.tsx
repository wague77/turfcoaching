
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Heart, Copy, Check, Trophy, Sparkles, 
  ArrowUpDown, ChevronDown, ChevronUp, Filter
} from 'lucide-react';
import { toast } from 'sonner';
import { Horse } from '@/lib/turf-coaching-logic';

interface CouplesModuleProps {
  horses: Horse[];
  arrivee?: number[];
}

interface Couple {
  horses: [number, number];
  totalOdds: number;
  hasFavorite: boolean;
  hasTocard: boolean;
  parity: 'odd' | 'even' | 'mixed';
}

type SortMode = 'odds' | 'favorites' | 'mixed';
type FilterMode = 'all' | 'favorites' | 'mixed' | 'outsiders';

export function CouplesModule({ horses, arrivee = [] }: CouplesModuleProps) {
  const [copied, setCopied] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>('odds');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  
  // Generate all unique couples from available horses
  const allCouples = useMemo(() => {
    const couples: Couple[] = [];
    const sortedHorses = [...horses].sort((a, b) => a.odds - b.odds);
    
    for (let i = 0; i < sortedHorses.length; i++) {
      for (let j = i + 1; j < sortedHorses.length; j++) {
        const h1 = sortedHorses[i];
        const h2 = sortedHorses[j];
        const nums: [number, number] = [h1.number, h2.number];
        
        // Calculate parity
        const oddCount = nums.filter(n => n % 2 === 1).length;
        const parity = oddCount === 2 ? 'odd' : oddCount === 0 ? 'even' : 'mixed';
        
        couples.push({
          horses: nums,
          totalOdds: h1.odds + h2.odds,
          hasFavorite: h1.isFavorite || h2.isFavorite,
          hasTocard: h1.isTocard || h2.isTocard,
          parity
        });
      }
    }
    
    return couples;
  }, [horses]);
  
  // Filter couples
  const filteredCouples = useMemo(() => {
    let result = [...allCouples];
    
    switch (filterMode) {
      case 'favorites':
        result = result.filter(c => c.hasFavorite && !c.hasTocard);
        break;
      case 'mixed':
        result = result.filter(c => c.hasFavorite && c.hasTocard);
        break;
      case 'outsiders':
        result = result.filter(c => c.hasTocard && !c.hasFavorite);
        break;
    }
    
    return result;
  }, [allCouples, filterMode]);
  
  // Sort couples
  const sortedCouples = useMemo(() => {
    const sorted = [...filteredCouples];
    
    switch (sortMode) {
      case 'odds':
        sorted.sort((a, b) => a.totalOdds - b.totalOdds);
        break;
      case 'favorites':
        sorted.sort((a, b) => {
          if (a.hasFavorite && !b.hasFavorite) return -1;
          if (!a.hasFavorite && b.hasFavorite) return 1;
          return a.totalOdds - b.totalOdds;
        });
        break;
      case 'mixed':
        sorted.sort((a, b) => {
          // Prioritize mixed parity
          if (a.parity === 'mixed' && b.parity !== 'mixed') return -1;
          if (a.parity !== 'mixed' && b.parity === 'mixed') return 1;
          return a.totalOdds - b.totalOdds;
        });
        break;
    }
    
    return sorted;
  }, [filteredCouples, sortMode]);
  
  // Check if couple is in arrivée
  const checkCoupleInArrivee = (couple: Couple): { matched: number; isWinner: boolean } => {
    if (arrivee.length < 2) return { matched: 0, isWinner: false };
    
    const top2 = arrivee.slice(0, 2);
    const matched = couple.horses.filter(h => top2.includes(h)).length;
    const isWinner = matched === 2;
    
    return { matched, isWinner };
  };
  
  // Count winning couples
  const winningCouples = useMemo(() => {
    if (arrivee.length < 2) return [];
    return sortedCouples.filter(c => checkCoupleInArrivee(c).isWinner);
  }, [sortedCouples, arrivee]);
  
  // Display limit
  const displayLimit = 30;
  const displayedCouples = showAll ? sortedCouples : sortedCouples.slice(0, displayLimit);
  
  // Copy to clipboard
  const copyToClipboard = () => {
    const text = sortedCouples
      .map(c => c.horses.join(' - '))
      .join('\n');
    
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      toast.success('Couples copiés !');
      setTimeout(() => setCopied(false), 2000);
    });
  };
  
  // Get horse info
  const getHorseInfo = (number: number): Horse | undefined => {
    return horses.find(h => h.number === number);
  };
  
  // Get parity style
  const getParityStyle = (parity: 'odd' | 'even' | 'mixed'): string => {
    switch (parity) {
      case 'odd':
        return 'border-red-500/30 bg-red-500/5';
      case 'even':
        return 'border-green-500/30 bg-green-500/5';
      case 'mixed':
        return 'border-primary/30 bg-gradient-to-r from-cyan-500/10 to-pink-500/10';
      default:
        return '';
    }
  };
  
  // Get number color based on parity
  const getNumberColor = (num: number): string => {
    return num % 2 === 0 ? 'text-green-500' : 'text-red-500';
  };
  
  if (horses.length < 2) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Heart className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>Au moins 2 chevaux sont nécessaires pour générer des couples.</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="gap-1 px-3 py-1.5">
          <Heart className="w-3 h-3 text-pink-500" />
          {sortedCouples.length} couples
        </Badge>
        
        {winningCouples.length > 0 && (
          <Badge className="gap-1 px-3 py-1.5 bg-green-500/10 text-green-600 border-green-500/30">
            <Trophy className="w-3 h-3" />
            {winningCouples.length} gagnant(s)
          </Badge>
        )}
        
        <Button
          variant="outline"
          size="sm"
          onClick={copyToClipboard}
          className="gap-1 ml-auto"
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Copié !' : 'Copier'}
        </Button>
      </div>
      
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="flex items-center gap-1">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground mr-2">Filtrer:</span>
          <Button
            variant={filterMode === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterMode('all')}
            className="text-xs h-7 px-2"
          >
            Tous
          </Button>
          <Button
            variant={filterMode === 'favorites' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterMode('favorites')}
            className="text-xs h-7 px-2"
          >
            Favoris
          </Button>
          <Button
            variant={filterMode === 'mixed' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterMode('mixed')}
            className="text-xs h-7 px-2"
          >
            Mixtes
          </Button>
          <Button
            variant={filterMode === 'outsiders' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterMode('outsiders')}
            className="text-xs h-7 px-2"
          >
            Outsiders
          </Button>
        </div>
        
        <div className="flex items-center gap-1 ml-auto">
          <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground mr-2">Trier:</span>
          <Button
            variant={sortMode === 'odds' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSortMode('odds')}
            className="text-xs h-7 px-2"
          >
            Cotes
          </Button>
          <Button
            variant={sortMode === 'favorites' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSortMode('favorites')}
            className="text-xs h-7 px-2"
          >
            Favoris
          </Button>
          <Button
            variant={sortMode === 'mixed' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSortMode('mixed')}
            className="text-xs h-7 px-2"
          >
            Parité
          </Button>
        </div>
      </div>
      
      {/* Couples grid */}
      <ScrollArea className="h-[350px]">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
          {displayedCouples.map((couple, index) => {
            const { isWinner } = checkCoupleInArrivee(couple);
            
            return (
              <div
                key={index}
                className={`
                  p-2 rounded-lg border transition-colors
                  ${getParityStyle(couple.parity)}
                  ${isWinner ? 'ring-2 ring-yellow-500 bg-yellow-500/10' : ''}
                  hover:border-primary/50
                `}
              >
                <div className="flex items-center justify-center gap-1.5 font-mono text-sm font-semibold">
                  {couple.horses.map((num, i) => {
                    const horse = getHorseInfo(num);
                    const isFavorite = horse?.isFavorite;
                    const isTocard = horse?.isTocard;
                    
                    return (
                      <span key={i} className="flex items-center">
                        {i > 0 && <span className="text-muted-foreground mx-0.5">-</span>}
                        <span className={`
                          px-1.5 py-0.5 rounded font-bold
                          ${getNumberColor(num)}
                          ${isFavorite ? 'bg-yellow-500/20' : ''}
                          ${isTocard ? 'bg-red-500/20' : ''}
                        `}>
                          {num}
                        </span>
                      </span>
                    );
                  })}
                  {isWinner && <Trophy className="w-4 h-4 text-yellow-500 ml-1" />}
                </div>
                
                <div className="flex justify-between items-center mt-1 text-[10px] text-muted-foreground">
                  <div className="flex gap-1">
                    {couple.hasFavorite && <Trophy className="w-3 h-3 text-yellow-500" />}
                    {couple.hasTocard && (
                      <span className="text-red-400 font-bold">T</span>
                    )}
                  </div>
                  <span className="font-medium text-primary">{couple.totalOdds.toFixed(1)}</span>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Show more/less button */}
        {sortedCouples.length > displayLimit && (
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
                  Afficher tout ({sortedCouples.length - displayLimit} de plus)
                </>
              )}
            </Button>
          </div>
        )}
      </ScrollArea>
      
      {/* Legend */}
      <div className="flex flex-wrap gap-4 pt-4 border-t text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <span className="text-green-500 font-bold">2</span>
          <span>Pair</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-red-500 font-bold">3</span>
          <span>Impair</span>
        </div>
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
      <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
        <div className="flex items-start gap-2">
          <Sparkles className="w-4 h-4 text-primary mt-0.5" />
          <div className="text-xs">
            <p className="font-medium text-primary mb-1">Conseil Couples</p>
            <p className="text-muted-foreground">
              Les couples mixtes (favori + tocard) offrent souvent un bon rapport risque/gain.
              Priorisez les couples avec au moins un favori pour plus de sécurité.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

