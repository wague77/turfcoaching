
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Hash, Info, AlertCircle } from 'lucide-react';

interface ConsecutifsModuleProps {
  betType: 'tierce' | 'quarte' | 'quinte';
  eliminateSerie2: boolean;
  eliminateSerie3: boolean;
  eliminateNoSerie: boolean;
  onChange: (serie2: boolean, serie3: boolean, noSerie: boolean) => void;
}

export function ConsecutifsModule({ 
  betType,
  eliminateSerie2,
  eliminateSerie3,
  eliminateNoSerie,
  onChange
}: ConsecutifsModuleProps) {
  const maxSerie = betType === 'tierce' ? 3 : betType === 'quarte' ? 4 : 5;
  
  const examples = {
    serie2: ['1-2-5', '3-7-8', '10-14-15'],
    serie3: ['1-2-3', '5-6-7', '12-13-14'],
    noSerie: ['1-3-7', '2-5-9', '4-8-12']
  };
  
  const activeFiltersCount = [eliminateSerie2, eliminateSerie3, eliminateNoSerie].filter(Boolean).length;
  
  return (
    <div className="space-y-4">
      {/* Info */}
      <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
        <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium mb-1">Module Numéros Consécutifs</p>
          <p className="text-muted-foreground text-xs">
            Éliminez les combinaisons contenant des séries de numéros consécutifs (suite) ou au contraire 
            celles qui n'en contiennent pas.
          </p>
        </div>
      </div>
      
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Hash className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Éliminer les suites de numéros</span>
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="ml-auto">
              {activeFiltersCount} filtre{activeFiltersCount > 1 ? 's' : ''} actif{activeFiltersCount > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
        
        <div className="space-y-4">
          {/* Serie 2 */}
          <div className="flex items-start gap-4 p-3 rounded-lg border">
            <Switch
              checked={eliminateSerie2}
              onCheckedChange={(checked) => onChange(checked, eliminateSerie3, eliminateNoSerie)}
              id="serie2"
            />
            <div className="flex-1">
              <Label htmlFor="serie2" className="font-medium cursor-pointer">
                Éliminer les suites de 2
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                Combinaisons avec 2 numéros consécutifs
              </p>
              <div className="flex flex-wrap gap-1 mt-2">
                {examples.serie2.map((ex, i) => (
                  <Badge key={i} variant="outline" className="text-xs font-mono">
                    {ex}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          
          {/* Serie 3+ */}
          <div className="flex items-start gap-4 p-3 rounded-lg border">
            <Switch
              checked={eliminateSerie3}
              onCheckedChange={(checked) => onChange(eliminateSerie2, checked, eliminateNoSerie)}
              id="serie3"
            />
            <div className="flex-1">
              <Label htmlFor="serie3" className="font-medium cursor-pointer">
                Éliminer les suites de 3{maxSerie > 3 && '+'}
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                Combinaisons avec 3 numéros consécutifs ou plus
              </p>
              <div className="flex flex-wrap gap-1 mt-2">
                {examples.serie3.map((ex, i) => (
                  <Badge key={i} variant="outline" className="text-xs font-mono">
                    {ex}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          
          {/* No Serie */}
          <div className="flex items-start gap-4 p-3 rounded-lg border">
            <Switch
              checked={eliminateNoSerie}
              onCheckedChange={(checked) => onChange(eliminateSerie2, eliminateSerie3, checked)}
              id="noSerie"
            />
            <div className="flex-1">
              <Label htmlFor="noSerie" className="font-medium cursor-pointer">
                Éliminer les combinaisons sans suite
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                Combinaisons sans aucun numéro consécutif
              </p>
              <div className="flex flex-wrap gap-1 mt-2">
                {examples.noSerie.map((ex, i) => (
                  <Badge key={i} variant="outline" className="text-xs font-mono">
                    {ex}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        {/* Warning */}
        {eliminateSerie2 && eliminateSerie3 && eliminateNoSerie && (
          <div className="flex items-center gap-2 mt-4 p-2 bg-destructive/10 border border-destructive/30 rounded text-xs text-destructive">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>Attention: vous éliminez toutes les possibilités ! Aucune combinaison ne restera.</span>
          </div>
        )}
        
        {/* Clear button */}
        {activeFiltersCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChange(false, false, false)}
            className="mt-4"
          >
            Tout effacer
          </Button>
        )}
      </Card>
    </div>
  );
}

