
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Users, Sparkles, Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface GroupeModuleProps {
  stats: Map<string, number>;
  selected: string[];
  suggested: string[];
  onChange: (groupes: string[]) => void;
}

const GROUPES = ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7'];

export function GroupeModule({ stats, selected, suggested, onChange }: GroupeModuleProps) {
  const toggleGroupe = (groupe: string) => {
    if (selected.includes(groupe)) {
      onChange(selected.filter(g => g !== groupe));
    } else {
      onChange([...selected, groupe]);
    }
  };
  
  const selectSuggested = () => {
    onChange(suggested);
  };
  
  const clearSelection = () => {
    onChange([]);
  };
  
  const getGroupeDescription = (groupe: string): string => {
    switch (groupe) {
      case 'G1':
      case 'G2':
        return 'Chevaux délaissés par la presse';
      case 'G3':
      case 'G4':
        return 'Mélange équilibré';
      case 'G5':
      case 'G6':
      case 'G7':
        return 'Chevaux très cités par la presse';
      default:
        return '';
    }
  };
  
  return (
    <div className="space-y-4">
      {/* Info */}
      <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
        <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium mb-1">Module Groupes</p>
          <p className="text-muted-foreground text-xs">
            Les Groupes classent les combinaisons selon les pronostics de la presse spécialisée. 
            G1-G2 = chevaux délaissés, G3-G4 = mélange, G5-G7 = chevaux très cités.
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
      
      {/* Groupe grid */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Un seul Groupe contient l'arrivée, lequel ?</span>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {GROUPES.map(groupe => {
            const count = stats.get(groupe) || 0;
            const isSelected = selected.includes(groupe);
            const isSuggested = suggested.includes(groupe);
            
            return (
              <Tooltip key={groupe}>
                <TooltipTrigger asChild>
                  <Button
                    variant={isSelected ? 'default' : 'outline'}
                    size="sm"
                    className={`relative flex flex-col h-auto py-3 px-4 min-w-[70px] ${
                      isSuggested && !isSelected ? 'border-primary/50 bg-primary/5' : ''
                    }`}
                    onClick={() => toggleGroupe(groupe)}
                    disabled={count === 0}
                  >
                    {isSuggested && (
                      <Sparkles className="absolute -top-1 -right-1 w-3 h-3 text-yellow-500" />
                    )}
                    <span className="font-bold text-lg">{groupe}</span>
                    <span className="text-xs opacity-80">{count} combis</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-medium">{groupe}: {count} combinaisons</p>
                  <p className="text-xs text-muted-foreground">{getGroupeDescription(groupe)}</p>
                  {isSuggested && <p className="text-yellow-400 text-xs">Suggéré par Turf-Coaching</p>}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
        
        {/* Visual scale */}
        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-orange-400" />
            Délaissés par la presse
          </span>
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-primary" />
            Très cités
          </span>
        </div>
        <div className="h-2 rounded-full bg-gradient-to-r from-orange-400 via-yellow-400 to-primary mt-1" />
      </Card>
      
      {/* Selection summary */}
      {selected.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Sélection:</span>
          {selected.map(g => (
            <Badge key={g} variant="secondary" className="gap-1">
              {g}
              <button onClick={() => toggleGroupe(g)} className="ml-1 hover:text-destructive">×</button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

