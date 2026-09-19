
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { BarChart3, Sparkles, Info, TrendingUp, TrendingDown } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface SimulatorModuleProps {
  stats: Map<string, number>;
  selected: string[];
  suggested: string[];
  onChange: (simulator: string[]) => void;
}

const TRANCHES = [
  { id: 'S90', label: '90%', desc: 'Très jouées', color: 'bg-green-500' },
  { id: 'S75', label: '75%', desc: 'Jouées', color: 'bg-emerald-400' },
  { id: 'S55', label: '55%', desc: 'Moyennes', color: 'bg-yellow-400' },
  { id: 'S20', label: '20%', desc: 'Peu jouées', color: 'bg-orange-400' },
  { id: 'S3', label: '3%', desc: 'Négligées', color: 'bg-red-400' }
];

export function SimulatorModule({ stats, selected, suggested, onChange }: SimulatorModuleProps) {
  const toggleTranche = (tranche: string) => {
    if (selected.includes(tranche)) {
      onChange(selected.filter(t => t !== tranche));
    } else {
      onChange([...selected, tranche]);
    }
  };
  
  const selectSuggested = () => {
    onChange(suggested);
  };
  
  const clearSelection = () => {
    onChange([]);
  };
  
  return (
    <div className="space-y-4">
      {/* Info */}
      <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
        <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium mb-1">Module Simulator</p>
          <p className="text-muted-foreground text-xs">
            Le Simulator simule ce qui a été joué au niveau national et classe les combinaisons par pourcentage de paris. 
            S90 = combinaisons les plus jouées, S3 = combinaisons négligées.
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
      
      {/* Tranches grid */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Une seule tranche contient l'arrivée, laquelle ?</span>
        </div>
        
        <div className="grid grid-cols-5 gap-2">
          {TRANCHES.map(tranche => {
            const count = stats.get(tranche.id) || 0;
            const isSelected = selected.includes(tranche.id);
            const isSuggested = suggested.includes(tranche.id);
            
            return (
              <Tooltip key={tranche.id}>
                <TooltipTrigger asChild>
                  <Button
                    variant={isSelected ? 'default' : 'outline'}
                    size="sm"
                    className={`relative flex flex-col h-auto py-3 px-2 ${
                      isSuggested && !isSelected ? 'border-primary/50 bg-primary/5' : ''
                    }`}
                    onClick={() => toggleTranche(tranche.id)}
                    disabled={count === 0}
                  >
                    {isSuggested && (
                      <Sparkles className="absolute -top-1 -right-1 w-3 h-3 text-yellow-500" />
                    )}
                    <div className={`w-3 h-3 rounded-full ${tranche.color} mb-1`} />
                    <span className="font-bold text-sm">{tranche.id}</span>
                    <span className="text-[10px] opacity-80">{count}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-medium">{tranche.id}: {count} combinaisons</p>
                  <p className="text-xs text-muted-foreground">{tranche.desc} ({tranche.label})</p>
                  {isSuggested && <p className="text-yellow-400 text-xs">Suggéré par Turf-Coaching</p>}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
        
        {/* Visual explanation */}
        <div className="mt-4 grid grid-cols-2 gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <span>S90/S75: Courses de favoris (petits rapports)</span>
          </div>
          <div className="flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-red-400" />
            <span>S20/S3: Courses surprise (gros rapports)</span>
          </div>
        </div>
      </Card>
      
      {/* Selection summary */}
      {selected.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Sélection:</span>
          {selected.map(s => (
            <Badge key={s} variant="secondary" className="gap-1">
              {s}
              <button onClick={() => toggleTranche(s)} className="ml-1 hover:text-destructive">×</button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

