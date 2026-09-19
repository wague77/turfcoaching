
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Lightbulb, Info, Check, X, Plus } from 'lucide-react';
import { Horse, ModuleFilters } from '@/lib/turf-coaching-logic';

interface PronosticModuleProps {
  horses: Horse[];
  betType: 'tierce' | 'quarte' | 'quinte';
  pronostic1: ModuleFilters['pronostic1'];
  pronostic2: ModuleFilters['pronostic2'];
  onPronostic1Change: (pronostic: ModuleFilters['pronostic1']) => void;
  onPronostic2Change: (pronostic: ModuleFilters['pronostic2']) => void;
}

type Condition = 'auMoins' | 'juste' | 'auMax' | 'entre';

export function PronosticModule({ 
  horses, 
  betType,
  pronostic1,
  pronostic2,
  onPronostic1Change,
  onPronostic2Change
}: PronosticModuleProps) {
  const maxHorses = betType === 'tierce' ? 3 : betType === 'quarte' ? 4 : 5;
  
  // Pronostic 1 state
  const [horses1, setHorses1] = useState<string>('');
  const [condition1, setCondition1] = useState<Condition>('auMoins');
  const [value1, setValue1] = useState<number>(1);
  const [value1b, setValue1b] = useState<number>(2);
  
  // Pronostic 2 state
  const [horses2, setHorses2] = useState<string>('');
  const [condition2, setCondition2] = useState<Condition>('auMoins');
  const [value2, setValue2] = useState<number>(1);
  const [value2b, setValue2b] = useState<number>(2);
  
  const parseHorseNumbers = (input: string): number[] => {
    return input
      .split(/[\s,]+/)
      .map(s => parseInt(s.trim()))
      .filter(n => !isNaN(n) && n >= 1 && n <= horses.length);
  };
  
  const applyPronostic1 = () => {
    const horseNumbers = parseHorseNumbers(horses1);
    if (horseNumbers.length === 0) {
      onPronostic1Change(null);
      return;
    }
    
    onPronostic1Change({
      horses: horseNumbers,
      condition: condition1,
      value: value1,
      value2: condition1 === 'entre' ? value1b : undefined
    });
  };
  
  const applyPronostic2 = () => {
    const horseNumbers = parseHorseNumbers(horses2);
    if (horseNumbers.length === 0) {
      onPronostic2Change(null);
      return;
    }
    
    onPronostic2Change({
      horses: horseNumbers,
      condition: condition2,
      value: value2,
      value2: condition2 === 'entre' ? value2b : undefined
    });
  };
  
  const clearPronostic1 = () => {
    setHorses1('');
    onPronostic1Change(null);
  };
  
  const clearPronostic2 = () => {
    setHorses2('');
    onPronostic2Change(null);
  };
  
  const renderPronosticForm = (
    index: 1 | 2,
    horsesValue: string,
    setHorsesValue: (v: string) => void,
    condition: Condition,
    setCondition: (c: Condition) => void,
    value: number,
    setValue: (v: number) => void,
    valueB: number,
    setValueB: (v: number) => void,
    currentPronostic: ModuleFilters['pronostic1'] | ModuleFilters['pronostic2'],
    applyFn: () => void,
    clearFn: () => void
  ) => (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <Lightbulb className="w-4 h-4 text-yellow-500" />
        <span className="text-sm font-medium">Pronostic {index}</span>
        {currentPronostic && <Badge variant="secondary" className="ml-auto">Actif</Badge>}
      </div>
      
      <div className="space-y-3">
        {/* Horse input */}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">
            Vos chevaux (numéros séparés par espaces ou virgules)
          </label>
          <Input
            value={horsesValue}
            onChange={(e) => setHorsesValue(e.target.value)}
            placeholder="Ex: 3 6 9 14"
            className="font-mono"
          />
          {horsesValue && (
            <div className="flex flex-wrap gap-1 mt-2">
              {parseHorseNumbers(horsesValue).map(n => (
                <Badge key={n} variant="outline" className="text-xs">N°{n}</Badge>
              ))}
            </div>
          )}
        </div>
        
        {/* Condition */}
        <div className="flex flex-wrap gap-2">
          <span className="text-sm self-center">J'en vois</span>
          <Select
            value={condition}
            onValueChange={(v) => setCondition(v as Condition)}
          >
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auMoins">au moins</SelectItem>
              <SelectItem value="juste">juste</SelectItem>
              <SelectItem value="auMax">au max</SelectItem>
              <SelectItem value="entre">entre</SelectItem>
            </SelectContent>
          </Select>
          
          <Select
            value={String(value)}
            onValueChange={(v) => setValue(Number(v))}
          >
            <SelectTrigger className="w-16">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: maxHorses + 1 }, (_, i) => i).map(n => (
                <SelectItem key={n} value={String(n)}>{n}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {condition === 'entre' && (
            <>
              <span className="text-sm self-center">et</span>
              <Select
                value={String(valueB)}
                onValueChange={(v) => setValueB(Number(v))}
              >
                <SelectTrigger className="w-16">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: maxHorses + 1 }, (_, i) => i).map(n => (
                    <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}
          
          <span className="text-sm self-center">à l'arrivée</span>
        </div>
        
        {/* Actions */}
        <div className="flex gap-2">
          <Button 
            size="sm" 
            onClick={applyFn} 
            className="gap-1"
            disabled={parseHorseNumbers(horsesValue).length === 0}
          >
            <Check className="w-3 h-3" />
            Valider
          </Button>
          {currentPronostic && (
            <Button size="sm" variant="ghost" onClick={clearFn} className="gap-1">
              <X className="w-3 h-3" />
              Effacer
            </Button>
          )}
        </div>
        
        {/* Active filter display */}
        {currentPronostic && (
          <div className="p-2 bg-muted rounded text-xs">
            <span className="font-medium">Filtre actif: </span>
            Parmi [{currentPronostic.horses.join(', ')}], 
            {' '}{currentPronostic.condition === 'auMoins' && `au moins ${currentPronostic.value}`}
            {currentPronostic.condition === 'juste' && `exactement ${currentPronostic.value}`}
            {currentPronostic.condition === 'auMax' && `au maximum ${currentPronostic.value}`}
            {currentPronostic.condition === 'entre' && `entre ${currentPronostic.value} et ${currentPronostic.value2}`}
            {' '}à l'arrivée
          </div>
        )}
      </div>
    </Card>
  );
  
  return (
    <div className="space-y-4">
      {/* Info */}
      <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
        <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium mb-1">Module Pronostics</p>
          <p className="text-muted-foreground text-xs">
            Donnez vos chevaux en pronostic et indiquez combien vous en voyez à l'arrivée. 
            Vous pouvez utiliser jusqu'à 2 pronostics différents.
          </p>
        </div>
      </div>
      
      <div className="grid md:grid-cols-2 gap-4">
        {renderPronosticForm(
          1, horses1, setHorses1, condition1, setCondition1, 
          value1, setValue1, value1b, setValue1b,
          pronostic1, applyPronostic1, clearPronostic1
        )}
        {renderPronosticForm(
          2, horses2, setHorses2, condition2, setCondition2, 
          value2, setValue2, value2b, setValue2b,
          pronostic2, applyPronostic2, clearPronostic2
        )}
      </div>
    </div>
  );
}

