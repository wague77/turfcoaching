
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Package, Sparkles, Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface PanierModuleProps {
  stats: Map<string, number>;
  selected: string[];
  suggested: string[];
  onChange: (paniers: string[]) => void;
}

const PANIERS_ROW1 = ['PX', 'P12', 'P13', 'P14', 'P15', 'P16', 'P17', 'P18', 'P19', 'P20'];
const PANIERS_ROW2 = ['P21', 'P22', 'P23', 'P24', 'P25', 'P26', 'P27', 'P28', 'P29', 'P30'];

export function PanierModule({ stats, selected, suggested, onChange }: PanierModuleProps) {
  const togglePanier = (panier: string) => {
    if (selected.includes(panier)) {
      onChange(selected.filter(p => p !== panier));
    } else {
      onChange([...selected, panier]);
    }
  };
  
  const selectSuggested = () => {
    onChange(suggested);
  };
  
  const clearSelection = () => {
    onChange([]);
  };
  
  const renderPanierButton = (panier: string) => {
    const count = stats.get(panier) || 0;
    const isSelected = selected.includes(panier);
    const isSuggested = suggested.includes(panier);
    
    return (
      <Tooltip key={panier}>
        <TooltipTrigger asChild>
          <Button
            variant={isSelected ? 'default' : 'outline'}
            size="sm"
            className={`relative flex flex-col h-auto py-2 px-3 min-w-[60px] ${
              isSuggested && !isSelected ? 'border-primary/50 bg-primary/5' : ''
            }`}
            onClick={() => togglePanier(panier)}
            disabled={count === 0}
          >
            {isSuggested && (
              <Sparkles className="absolute -top-1 -right-1 w-3 h-3 text-yellow-500" />
            )}
            <span className="font-semibold text-xs">{panier}</span>
            <span className="text-[10px] opacity-80">{count}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{count} combinaisons dans {panier}</p>
          {isSuggested && <p className="text-yellow-400 text-xs">Suggéré par Turf-Coaching</p>}
        </TooltipContent>
      </Tooltip>
    );
  };
  
  return (
    <div className="space-y-4">
      {/* Info */}
      <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
        <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium mb-1">Module Paniers</p>
          <p className="text-muted-foreground text-xs">
            Les Paniers sont des profils de combinaisons. Chaque combinaison est stockée dans un seul Panier 
            selon son analyse (cotes, musique, jockey, entraineur...). Trouvez le bon Panier et l'arrivée sera dedans !
          </p>
        </div>
      </div>
      
      {/* Quick actions */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={selectSuggested}
          className="gap-1"
        >
          <Sparkles className="w-3 h-3 text-yellow-500" />
          Suggestions Turf-Coaching
        </Button>
        {selected.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearSelection}
          >
            Tout effacer
          </Button>
        )}
      </div>
      
      {/* Panier grid */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Package className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Un seul Panier contient l'arrivée, lequel ?</span>
        </div>
        
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1">
            {PANIERS_ROW1.map(renderPanierButton)}
          </div>
          <div className="flex flex-wrap gap-1">
            {PANIERS_ROW2.map(renderPanierButton)}
          </div>
        </div>
        
        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-primary/20 rounded" />
            <span>P12-P20: Courses surprise</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-primary/50 rounded" />
            <span>P21-P25: Courses mixtes</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-primary rounded" />
            <span>P26-P30: Courses favoris</span>
          </div>
        </div>
      </Card>
      
      {/* Selection summary */}
      {selected.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Sélection:</span>
          {selected.map(p => (
            <Badge key={p} variant="secondary" className="gap-1">
              {p}
              <button onClick={() => togglePanier(p)} className="ml-1 hover:text-destructive">×</button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

