
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { 
  Trophy, Zap, Calculator, ChevronRight, Sparkles, 
  Target, TrendingUp, AlertCircle, Dice3, Dice4, Dice5,
  Database, RefreshCw, Check
} from 'lucide-react';
import { toast } from 'sonner';
import { Horse } from '@/lib/turf-coaching-logic';

interface RaceSetupProps {
  onSetup: (horses: Horse[], starters: number, betType: 'tierce' | 'quarte' | 'quinte') => void;
}

const STORAGE_KEY = 'persisted-race-data';

interface PersistedRaceData {
  fetchedHorses: Array<{
    numero: number;
    name?: string;
    cote: number;
    dernierRapportDirect?: number;
  }>;
  result: {
    horses: Array<{
      numero: number;
      name?: string;
      cote: number;
      label: string;
    }>;
    favorites: Array<{ numero: number }>;
  } | null;
}

export function RaceSetup({ onSetup }: RaceSetupProps) {
  const [betType, setBetType] = useState<'tierce' | 'quarte' | 'quinte'>('tierce');
  const [starters, setStarters] = useState<number>(15);
  const [favoritesCount, setFavoritesCount] = useState<number>(3);
  const [importedHorses, setImportedHorses] = useState<Horse[] | null>(null);
  const [hasPersistedData, setHasPersistedData] = useState(false);
  
  // Check for persisted data on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data: PersistedRaceData = JSON.parse(stored);
        if (data.fetchedHorses?.length > 0 || data.result?.horses?.length > 0) {
          setHasPersistedData(true);
        }
      }
    } catch (error) {
      console.error('Error checking persisted data:', error);
    }
  }, []);
  
  // Import horses from persisted data
  const importFromAnalysis = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        toast.error('Aucune donnée trouvée dans l\'onglet Analyse');
        return;
      }
      
      const data = JSON.parse(stored);
      const sourceHorses = data.result?.horses || [];
      const fetchedHorses = data.fetchedHorses || [];
      const parsedData = data.parsedData || [];
      const favoriteNumbers = data.result?.favorites?.map((f: any) => f.numero) || [];
      
      if (sourceHorses.length === 0 && fetchedHorses.length === 0 && parsedData.length === 0) {
        toast.error('Aucune donnée de course disponible. Analysez d\'abord une course.');
        return;
      }
      
      // Prefer result.horses, then fetchedHorses, then parsedData
      let horsesToUse = sourceHorses.length > 0 ? sourceHorses : 
                        fetchedHorses.length > 0 ? fetchedHorses : parsedData;
      
      // Create a merged map to get all available data per horse
      const horseDataMap = new Map<number, any>();
      
      // Start with parsed data
      parsedData.forEach((h: any) => {
        horseDataMap.set(h.numero, { ...h });
      });
      
      // Merge fetched horses data
      fetchedHorses.forEach((h: any) => {
        const existing = horseDataMap.get(h.numero) || {};
        horseDataMap.set(h.numero, { ...existing, ...h });
      });
      
      // Merge result horses data (highest priority)
      sourceHorses.forEach((h: any) => {
        const existing = horseDataMap.get(h.numero) || {};
        horseDataMap.set(h.numero, { ...existing, ...h });
      });
      
      // Create horses array with all merged data
      const horses: Horse[] = Array.from(horseDataMap.values()).map((h: any) => {
        const odds = h.cote || h.dernierRapportDirect || h.rapportDirect || 10;
        const isFavorite = favoriteNumbers.includes(h.numero) || 
                          h.label === 'BASE' || 
                          odds <= 5;
        const isTocard = h.label === 'DOUTEUX' || 
                        h.label === 'OUTSIDER' ||
                        (h.label === 'NEUTRE' && odds > 20) ||
                        odds > 25;
        
        // Calculate citations based on multiple factors
        let citations = 5; // default
        if (isFavorite) {
          citations = 8 + Math.min(5, Math.floor(10 / odds)); // Higher citations for lower odds favorites
        } else if (isTocard) {
          citations = 1;
        } else if (h.label === 'OUTSIDER') {
          citations = 3;
        } else if (odds <= 10) {
          citations = 7;
        } else if (odds <= 15) {
          citations = 5;
        } else {
          citations = 2;
        }
        
        return {
          number: h.numero,
          name: h.name || h.nom || `Cheval ${h.numero}`,
          odds: Math.round(odds * 10) / 10,
          citations,
          isFavorite,
          isTocard
        };
      });
      
      // Sort by number
      horses.sort((a, b) => a.number - b.number);
      
      if (horses.length < 8) {
        toast.error('Pas assez de chevaux (minimum 8)');
        return;
      }
      
      setImportedHorses(horses);
      setStarters(horses.length);
      setFavoritesCount(horses.filter(h => h.isFavorite).length);
      
      toast.success(`${horses.length} chevaux importés avec toutes les données`);
    } catch (error) {
      console.error('Error importing data:', error);
      toast.error('Erreur lors de l\'import des données');
    }
  };
  
  // Generate horses based on quick config
  const generateHorses = (): Horse[] => {
    if (importedHorses) {
      return importedHorses;
    }
    
    const horses: Horse[] = [];
    
    for (let i = 1; i <= starters; i++) {
      let odds: number;
      let citations: number;
      let isFavorite = false;
      let isTocard = false;
      
      if (i <= favoritesCount) {
        odds = 2 + Math.random() * 5;
        citations = 8 + Math.floor(Math.random() * 7);
        isFavorite = true;
      } else if (i > starters - 5) {
        odds = 30 + Math.random() * 50;
        citations = Math.floor(Math.random() * 3);
        isTocard = true;
      } else {
        odds = 8 + Math.random() * 25;
        citations = 2 + Math.floor(Math.random() * 8);
      }
      
      horses.push({
        number: i,
        name: `Cheval ${i}`,
        odds: Math.round(odds * 10) / 10,
        citations,
        isFavorite,
        isTocard
      });
    }
    
    return horses;
  };
  
  const handleStart = () => {
    const finalStarters = importedHorses ? importedHorses.length : starters;
    
    if (finalStarters < 8) {
      toast.error('Il faut au moins 8 partants');
      return;
    }
    
    if (finalStarters > 24) {
      toast.error('Maximum 24 partants');
      return;
    }
    
    const horses = generateHorses();
    onSetup(horses, finalStarters, betType);
  };
  
  const clearImport = () => {
    setImportedHorses(null);
    setStarters(15);
    setFavoritesCount(3);
    toast.info('Import effacé');
  };
  
  const getCombinationsCount = (): number => {
    const n = importedHorses ? importedHorses.length : starters;
    const k = betType === 'tierce' ? 3 : betType === 'quarte' ? 4 : 5;
    let result = 1;
    for (let i = 0; i < k; i++) {
      result = result * (n - i) / (i + 1);
    }
    return Math.round(result);
  };
  
  const displayStarters = importedHorses ? importedHorses.length : starters;
  
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Hero Section */}
      <Card className="bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border-primary/30 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary/10 rounded-full translate-y-1/2 -translate-x-1/2" />
        <CardHeader className="relative">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/20 rounded-lg">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl">Turf-Coaching</CardTitle>
              <CardDescription>Réducteur de combinaisons intelligent</CardDescription>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Réduisez intelligemment vos combinaisons Tiercé, Quarté et Quinté grâce à 7 modules d'analyse. 
            Jouez moins, gagnez plus !
          </p>
        </CardHeader>
      </Card>
      
      {/* Import from Analysis */}
      {hasPersistedData && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/20 rounded-lg">
                  <Database className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Données disponibles</h3>
                  <p className="text-sm text-muted-foreground">
                    Importez les chevaux depuis l'onglet Données & Analyse
                  </p>
                </div>
              </div>
              {importedHorses && (
                <Badge variant="secondary" className="gap-1">
                  <Check className="w-3 h-3" />
                  {importedHorses.length} chevaux
                </Badge>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button 
                onClick={importFromAnalysis} 
                variant={importedHorses ? "outline" : "default"}
                className="flex-1 gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                {importedHorses ? 'Réimporter' : 'Importer les données'}
              </Button>
              {importedHorses && (
                <Button variant="ghost" onClick={clearImport}>
                  Effacer
                </Button>
              )}
            </div>
            
            {importedHorses && (
              <div className="mt-4 p-3 bg-background/50 rounded-lg">
                <p className="text-xs text-muted-foreground mb-2">Chevaux importés:</p>
                <div className="flex flex-wrap gap-1.5">
                  {importedHorses.map(h => (
                    <Badge 
                      key={h.number} 
                      variant={h.isFavorite ? "default" : h.isTocard ? "outline" : "secondary"}
                      className="text-xs"
                    >
                      {h.number} ({h.odds.toFixed(1)})
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* Configuration Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Configuration de la course
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Bet Type Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Type de pari</Label>
            <div className="grid grid-cols-3 gap-3">
              <Button
                variant={betType === 'tierce' ? 'default' : 'outline'}
                className="h-auto py-4 flex flex-col gap-1"
                onClick={() => setBetType('tierce')}
              >
                <Dice3 className="w-5 h-5" />
                <span className="font-semibold">Tiercé</span>
                <span className="text-xs opacity-80">3 chevaux</span>
              </Button>
              <Button
                variant={betType === 'quarte' ? 'default' : 'outline'}
                className="h-auto py-4 flex flex-col gap-1"
                onClick={() => setBetType('quarte')}
              >
                <Dice4 className="w-5 h-5" />
                <span className="font-semibold">Quarté</span>
                <span className="text-xs opacity-80">4 chevaux</span>
              </Button>
              <Button
                variant={betType === 'quinte' ? 'default' : 'outline'}
                className="h-auto py-4 flex flex-col gap-1"
                onClick={() => setBetType('quinte')}
              >
                <Dice5 className="w-5 h-5" />
                <span className="font-semibold">Quinté</span>
                <span className="text-xs opacity-80">5 chevaux</span>
              </Button>
            </div>
          </div>
          
          {/* Starters - only show if no imported data */}
          {!importedHorses && (
            <>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label className="text-sm font-medium">Nombre de partants</Label>
                  <Badge variant="secondary">{starters} partants</Badge>
                </div>
                <Slider
                  value={[starters]}
                  onValueChange={([value]) => setStarters(value)}
                  min={8}
                  max={24}
                  step={1}
                  className="py-2"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>8</span>
                  <span>16</span>
                  <span>24</span>
                </div>
              </div>
              
              {/* Favorites count */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-primary" />
                    Nombre de favoris
                  </Label>
                  <Badge variant="outline">{favoritesCount} favoris</Badge>
                </div>
                <Slider
                  value={[favoritesCount]}
                  onValueChange={([value]) => setFavoritesCount(value)}
                  min={1}
                  max={6}
                  step={1}
                  className="py-2"
                />
              </div>
            </>
          )}
          
          {/* Stats Preview */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Calculator className="w-4 h-4 text-primary" />
              Aperçu
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Combinaisons totales</p>
                <p className="text-xl font-bold text-primary">{getCombinationsCount()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Mise max</p>
                <p className="text-xl font-bold text-destructive">{getCombinationsCount()}€</p>
              </div>
            </div>
            {importedHorses && (
              <div className="pt-2 border-t border-border">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Favoris:</span>
                  <span className="font-medium">{importedHorses.filter(h => h.isFavorite).length}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Tocards:</span>
                  <span className="font-medium">{importedHorses.filter(h => h.isTocard).length}</span>
                </div>
              </div>
            )}
            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p>Utilisez les modules pour réduire ce nombre et optimiser votre mise !</p>
            </div>
          </div>
          
          {/* Start Button */}
          <Button 
            onClick={handleStart} 
            className="w-full gap-2 h-12 text-base"
            size="lg"
          >
            <Zap className="w-5 h-5" />
            Commencer l'analyse
            <ChevronRight className="w-5 h-5" />
          </Button>
        </CardContent>
      </Card>
      
      {/* Features */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: Target, label: 'Paniers', desc: 'Profils de combinaisons' },
          { icon: TrendingUp, label: 'Groupes', desc: 'Analyse presse' },
          { icon: Zap, label: 'Simulator', desc: 'Simulation paris' },
          { icon: Trophy, label: 'Favoris/Tocards', desc: 'Filtres chevaux' }
        ].map((feature, i) => (
          <Card key={i} className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <feature.icon className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">{feature.label}</span>
            </div>
            <p className="text-xs text-muted-foreground">{feature.desc}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}

