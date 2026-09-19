
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trophy, Skull, Info, Check, X } from 'lucide-react';
import { Horse } from '@/lib/turf-coaching-logic';

interface FavorisTocardsModuleProps {
  horses: Horse[];
  betType: 'tierce' | 'quarte' | 'quinte';
  favorisCount: { min: number; max: number } | null;
  tocardsCount: { min: number; max: number } | null;
  onFavorisChange: (count: { min: number; max: number } | null) => void;
  onTocardsChange: (count: { min: number; max: number } | null) => void;
}

type Condition = 'auMoins' | 'juste' | 'auMax' | 'entre' | 'aucun' | null;

export function FavorisTocardsModule({ 
  horses, 
  betType,
  favorisCount, 
  tocardsCount,
  onFavorisChange,
  onTocardsChange
}: FavorisTocardsModuleProps) {
  const favorites = horses.filter(h => h.isFavorite);
  const tocards = horses.filter(h => h.isTocard);
  
  const maxHorses = betType === 'tierce' ? 3 : betType === 'quarte' ? 4 : 5;
  
  const [favorisCondition, setFavorisCondition] = useState<Condition>(null);
  const [favorisValue, setFavorisValue] = useState<number>(1);
  const [favorisValue2, setFavorisValue2] = useState<number>(2);
  
  const [tocardsCondition, setTocardsCondition] = useState<Condition>(null);
  const [tocardsValue, setTocardsValue] = useState<number>(1);
  const [tocardsValue2, setTocardsValue2] = useState<number>(2);
  
  const applyFavorisFilter = () => {
    if (!favorisCondition) {
      onFavorisChange(null);
      return;
    }
    
    let min = 0, max = maxHorses;
    
    switch (favorisCondition) {
      case 'auMoins':
        min = favorisValue;
        max = maxHorses;
        break;
      case 'juste':
        min = favorisValue;
        max = favorisValue;
        break;
      case 'auMax':
        min = 0;
        max = favorisValue;
        break;
      case 'entre':
        min = favorisValue;
        max = favorisValue2;
        break;
      case 'aucun':
        min = 0;
        max = 0;
        break;
    }
    
    onFavorisChange({ min, max });
  };
  
  const applyTocardsFilter = () => {
    if (!tocardsCondition) {
      onTocardsChange(null);
      return;
    }
    
    let min = 0, max = maxHorses;
    
    switch (tocardsCondition) {
      case 'auMoins':
        min = tocardsValue;
        max = maxHorses;
        break;
      case 'juste':
        min = tocardsValue;
        max = tocardsValue;
        break;
      case 'auMax':
        min = 0;
        max = tocardsValue;
        break;
      case 'entre':
        min = tocardsValue;
        max = tocardsValue2;
        break;
      case 'aucun':
        min = 0;
        max = 0;
        break;
    }
    
    onTocardsChange({ min, max });
  };
  
  const clearFavoris = () => {
    setFavorisCondition(null);
    onFavorisChange(null);
  };
  
  const clearTocards = () => {
    setTocardsCondition(null);
    onTocardsChange(null);
  };
  
  return (
    <div className="space-y-4">
      {/* Info */}
      <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
        <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium mb-1">Module Favoris / Tocards</p>
          <p className="text-muted-foreground text-xs">
            Indiquez combien de favoris ou tocards vous voyez à l'arrivée. Les combinaisons ne correspondant pas 
            seront éliminées.
          </p>
        </div>
      </div>
      
      <div className="grid md:grid-cols-2 gap-4">
        {/* Favoris Section */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="w-4 h-4 text-yellow-500" />
            <span className="text-sm font-medium">Favoris ({favorites.length})</span>
          </div>
          
          {/* Display favorites */}
          <div className="flex flex-wrap gap-1 mb-3">
            {favorites.map(h => (
              <Badge key={h.number} variant="outline" className="bg-yellow-500/10 border-yellow-500/30">
                N°{h.number} ({h.odds})
              </Badge>
            ))}
          </div>
          
          {/* Condition selector */}
          <div className="space-y-2">
            <Select
              value={favorisCondition || ''}
              onValueChange={(v) => setFavorisCondition(v as Condition)}
            >
              <SelectTrigger>
                <SelectValue placeholder="J'en vois à l'arrivée..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auMoins">Au moins</SelectItem>
                <SelectItem value="juste">Juste</SelectItem>
                <SelectItem value="auMax">Au maximum</SelectItem>
                <SelectItem value="entre">Entre</SelectItem>
                <SelectItem value="aucun">Aucun</SelectItem>
              </SelectContent>
            </Select>
            
            {favorisCondition && favorisCondition !== 'aucun' && (
              <div className="flex gap-2">
                <Select
                  value={String(favorisValue)}
                  onValueChange={(v) => setFavorisValue(Number(v))}
                >
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: maxHorses }, (_, i) => i + 1).map(n => (
                      <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {favorisCondition === 'entre' && (
                  <>
                    <span className="self-center text-sm text-muted-foreground">et</span>
                    <Select
                      value={String(favorisValue2)}
                      onValueChange={(v) => setFavorisValue2(Number(v))}
                    >
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: maxHorses }, (_, i) => i + 1).map(n => (
                          <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </>
                )}
              </div>
            )}
            
            <div className="flex gap-2">
              <Button size="sm" onClick={applyFavorisFilter} className="gap-1">
                <Check className="w-3 h-3" />
                Valider
              </Button>
              {favorisCount && (
                <Button size="sm" variant="ghost" onClick={clearFavoris} className="gap-1">
                  <X className="w-3 h-3" />
                  Effacer
                </Button>
              )}
            </div>
            
            {favorisCount && (
              <Badge variant="secondary" className="mt-2">
                Filtre actif: {favorisCount.min === favorisCount.max 
                  ? `exactement ${favorisCount.min}` 
                  : `${favorisCount.min} à ${favorisCount.max}`} favori(s)
              </Badge>
            )}
          </div>
        </Card>
        
        {/* Tocards Section */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Skull className="w-4 h-4 text-red-400" />
            <span className="text-sm font-medium">Tocards ({tocards.length})</span>
          </div>
          
          {/* Display tocards */}
          <div className="flex flex-wrap gap-1 mb-3">
            {tocards.map(h => (
              <Badge key={h.number} variant="outline" className="bg-red-500/10 border-red-500/30">
                N°{h.number} ({h.odds})
              </Badge>
            ))}
          </div>
          
          {/* Condition selector */}
          <div className="space-y-2">
            <Select
              value={tocardsCondition || ''}
              onValueChange={(v) => setTocardsCondition(v as Condition)}
            >
              <SelectTrigger>
                <SelectValue placeholder="J'en vois à l'arrivée..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auMoins">Au moins</SelectItem>
                <SelectItem value="juste">Juste</SelectItem>
                <SelectItem value="auMax">Au maximum</SelectItem>
                <SelectItem value="entre">Entre</SelectItem>
                <SelectItem value="aucun">Aucun</SelectItem>
              </SelectContent>
            </Select>
            
            {tocardsCondition && tocardsCondition !== 'aucun' && (
              <div className="flex gap-2">
                <Select
                  value={String(tocardsValue)}
                  onValueChange={(v) => setTocardsValue(Number(v))}
                >
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: maxHorses }, (_, i) => i + 1).map(n => (
                      <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {tocardsCondition === 'entre' && (
                  <>
                    <span className="self-center text-sm text-muted-foreground">et</span>
                    <Select
                      value={String(tocardsValue2)}
                      onValueChange={(v) => setTocardsValue2(Number(v))}
                    >
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: maxHorses }, (_, i) => i + 1).map(n => (
                          <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </>
                )}
              </div>
            )}
            
            <div className="flex gap-2">
              <Button size="sm" onClick={applyTocardsFilter} className="gap-1">
                <Check className="w-3 h-3" />
                Valider
              </Button>
              {tocardsCount && (
                <Button size="sm" variant="ghost" onClick={clearTocards} className="gap-1">
                  <X className="w-3 h-3" />
                  Effacer
                </Button>
              )}
            </div>
            
            {tocardsCount && (
              <Badge variant="secondary" className="mt-2">
                Filtre actif: {tocardsCount.min === tocardsCount.max 
                  ? `exactement ${tocardsCount.min}` 
                  : `${tocardsCount.min} à ${tocardsCount.max}`} tocard(s)
              </Badge>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

