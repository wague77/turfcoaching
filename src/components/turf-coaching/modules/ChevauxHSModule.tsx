
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { X, Info, AlertTriangle } from 'lucide-react';
import { Horse } from '@/lib/turf-coaching-logic';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ChevauxHSModuleProps {
  horses: Horse[];
  selected: number[];
  onChange: (chevauxHS: number[]) => void;
}

export function ChevauxHSModule({ horses, selected, onChange }: ChevauxHSModuleProps) {
  const toggleHorse = (number: number) => {
    if (selected.includes(number)) {
      onChange(selected.filter(n => n !== number));
    } else {
      if (selected.length >= 8) {
        return; // Max 8 chevaux HS
      }
      onChange([...selected, number]);
    }
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
          <p className="font-medium mb-1">Module Chevaux HS (Hors Service)</p>
          <p className="text-muted-foreground text-xs">
            Éliminez les chevaux que vous ne voulez pas voir à l'arrivée. Toutes les combinaisons contenant 
            ces chevaux seront supprimées. Maximum 8 chevaux.
          </p>
        </div>
      </div>
      
      {/* Quick actions */}
      <div className="flex items-center gap-2">
        {selected.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearSelection}
          >
            Tout effacer
          </Button>
        )}
        <span className="text-xs text-muted-foreground">
          {selected.length}/8 chevaux éliminés
        </span>
      </div>
      
      {/* Horse grid */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <X className="w-4 h-4 text-destructive" />
          <span className="text-sm font-medium">Ces chevaux seront éliminés d'office</span>
        </div>
        
        <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2">
          {horses.map(horse => {
            const isSelected = selected.includes(horse.number);
            
            return (
              <Tooltip key={horse.number}>
                <TooltipTrigger asChild>
                  <Button
                    variant={isSelected ? 'destructive' : 'outline'}
                    size="sm"
                    className={`relative w-10 h-10 p-0 font-bold ${
                      isSelected ? 'line-through' : ''
                    }`}
                    onClick={() => toggleHorse(horse.number)}
                    disabled={!isSelected && selected.length >= 8}
                  >
                    {horse.number}
                    {isSelected && (
                      <X className="absolute -top-1 -right-1 w-3 h-3 bg-destructive text-destructive-foreground rounded-full" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-medium">N°{horse.number} - {horse.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Cote: {horse.odds} | Citations: {horse.citations}
                  </p>
                  {horse.isFavorite && <Badge variant="outline" className="text-xs">Favori</Badge>}
                  {horse.isTocard && <Badge variant="outline" className="text-xs">Tocard</Badge>}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
        
        {/* Warning if many horses eliminated */}
        {selected.length >= 5 && (
          <div className="flex items-center gap-2 mt-4 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded text-xs text-yellow-600 dark:text-yellow-400">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>Attention: vous éliminez beaucoup de chevaux. Risque d'éliminer l'arrivée !</span>
          </div>
        )}
      </Card>
      
      {/* Selection summary */}
      {selected.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Chevaux éliminés:</span>
          {selected.sort((a, b) => a - b).map(n => (
            <Badge key={n} variant="destructive" className="gap-1">
              N°{n}
              <button onClick={() => toggleHorse(n)} className="ml-1 hover:opacity-80">×</button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

