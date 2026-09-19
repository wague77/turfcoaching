
import { useState, useEffect, Dispatch, SetStateAction } from 'react';
import { Play, Calculator, FileText, Download, Loader2, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Discipline, RawHorseData } from '@/types/racing';
import { parseHorseData } from '@/lib/racing-logic';
import { fetchPMUData, convertPMUToInput, PMUHorse } from '@/lib/pmu-api';
import { PMUDataTable } from '@/components/racing/PMUDataTable';
import { toast } from '@/hooks/use-toast';

const PMU_DATE_STORAGE_KEY = 'pmu-import-date';
const ARRIVEE_STORAGE_KEY = 'pmu-arrivee-manuelle';

interface DataInputTabProps {
  onAnalyze: (data: RawHorseData[], discipline: Discipline) => void;
  onCalculate: (data: RawHorseData[], discipline: Discipline) => void;
  inputText: string;
  setInputText: Dispatch<SetStateAction<string>>;
  parsedData: RawHorseData[];
  setParsedData: Dispatch<SetStateAction<RawHorseData[]>>;
  fetchedHorses: PMUHorse[];
  setFetchedHorses: Dispatch<SetStateAction<PMUHorse[]>>;
  arrivee: number[];
  setArrivee: Dispatch<SetStateAction<number[]>>;
  pmuReunion: string;
  setPmuReunion: Dispatch<SetStateAction<string>>;
  pmuCourse: string;
  setPmuCourse: Dispatch<SetStateAction<string>>;
}

export function DataInputTab({ 
  onAnalyze, 
  onCalculate, 
  inputText, 
  setInputText, 
  parsedData, 
  setParsedData, 
  fetchedHorses, 
  setFetchedHorses,
  arrivee,
  setArrivee,
  pmuReunion,
  setPmuReunion,
  pmuCourse,
  setPmuCourse
}: DataInputTabProps) {
  const [discipline, setDiscipline] = useState<Discipline>('plat');
  
  // PMU fetch state
  const [pmuDate, setPmuDate] = useState(() => {
    return localStorage.getItem(PMU_DATE_STORAGE_KEY) || '';
  });
  const [isFetching, setIsFetching] = useState(false);
  
  // Manual arrival input (text representation)
  const [arriveeManuelle, setArriveeManuelle] = useState(() => {
    return localStorage.getItem(ARRIVEE_STORAGE_KEY) || '';
  });

  // Persist date to localStorage
  useEffect(() => {
    if (pmuDate) {
      localStorage.setItem(PMU_DATE_STORAGE_KEY, pmuDate);
    }
  }, [pmuDate]);

  // Persist arrivée to localStorage and update parent state
  useEffect(() => {
    localStorage.setItem(ARRIVEE_STORAGE_KEY, arriveeManuelle);
    
    // Parse the arrival input (format: "9-5-8-4-2" or "9 5 8 4 2" or "9,5,8,4,2")
    const numbers = arriveeManuelle
      .split(/[-\s,]+/)
      .map(s => parseInt(s.trim(), 10))
      .filter(n => !isNaN(n) && n > 0);
    
    setArrivee(numbers);
  }, [arriveeManuelle, setArrivee]);

  const handleParse = () => {
    const data = parseHorseData(inputText);
    if (data.length === 0) {
      toast({
        title: "Erreur de format",
        description: "Aucune donnée valide détectée. Format attendu: N° Rapp.Direct Musique",
        variant: "destructive",
      });
      return;
    }
    setParsedData(data);
    onAnalyze(data, discipline);
    toast({
      title: "Données analysées",
      description: `${data.length} chevaux détectés`,
    });
  };

  const handleCalculate = () => {
    if (parsedData.length === 0) {
      const data = parseHorseData(inputText);
      if (data.length === 0) {
        toast({
          title: "Analysez d'abord",
          description: "Cliquez sur Analyser avant de calculer les couplés",
          variant: "destructive",
        });
        return;
      }
      setParsedData(data);
      onCalculate(data, discipline);
    } else {
      onCalculate(parsedData, discipline);
    }
  };

  const handleFetchPMU = async () => {
    if (!pmuDate || !pmuReunion || !pmuCourse) {
      toast({
        title: "Champs requis",
        description: "Veuillez remplir la date, réunion et course",
        variant: "destructive",
      });
      return;
    }

    // Convert date from YYYY-MM-DD to DDMMYYYY
    const dateParts = pmuDate.split('-');
    if (dateParts.length !== 3) {
      toast({
        title: "Format de date invalide",
        description: "Utilisez le format JJ/MM/AAAA",
        variant: "destructive",
      });
      return;
    }
    const formattedDate = `${dateParts[2]}${dateParts[1]}${dateParts[0]}`;

    setIsFetching(true);
    try {
      const result = await fetchPMUData(formattedDate, parseInt(pmuReunion), parseInt(pmuCourse));
      
      if (result.success && result.horses) {
        setFetchedHorses(result.horses);
        const newInputText = convertPMUToInput(result.horses);
        setInputText(newInputText);
        toast({
          title: "Données DATABASE récupérées",
          description: `${result.horses.length} chevaux importés`,
        });
      } else {
        toast({
          title: "Erreur",
          description: result.error || "Impossible de récupérer les données",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('DATABASE fetch error:', error);
      toast({
        title: "Erreur de connexion",
        description: "Impossible de contacter la DATABASE",
        variant: "destructive",
      });
    } finally {
      setIsFetching(false);
    }
  };

  const clearArrivee = () => {
    setArriveeManuelle('');
    localStorage.removeItem(ARRIVEE_STORAGE_KEY);
    toast({
      title: "Arrivée effacée",
      description: "L'arrivée a été réinitialisée.",
    });
  };

  // Get position color classes
  const getPositionColor = (position: number): string => {
    switch (position) {
      case 1: return 'bg-yellow-500/30 border-yellow-500 text-yellow-500';
      case 2: return 'bg-slate-400/30 border-slate-400 text-slate-300';
      case 3: return 'bg-amber-700/30 border-amber-700 text-amber-600';
      case 4: return 'bg-blue-500/20 border-blue-500/50 text-blue-400';
      case 5: return 'bg-purple-500/20 border-purple-500/50 text-purple-400';
      default: return 'bg-muted/30 border-border/50 text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* PMU Data Fetch */}
      <div className="cyber-card border-primary/30">
        <div className="flex items-center gap-2 mb-4">
          <Download className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">
            Import DATABASE
          </h3>
        </div>
        
        <p className="text-sm text-muted-foreground mb-4">
          Récupérez automatiquement les données d'une course depuis la DATABASE
        </p>
        
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Date</label>
            <Input
              type="date"
              value={pmuDate}
              onChange={(e) => setPmuDate(e.target.value)}
              className="bg-muted/50 border-border"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Réunion (R)</label>
            <Input
              type="number"
              min="1"
              max="9"
              placeholder="1"
              value={pmuReunion}
              onChange={(e) => setPmuReunion(e.target.value)}
              className="bg-muted/50 border-border"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Course (C)</label>
            <Input
              type="number"
              min="1"
              max="20"
              placeholder="1"
              value={pmuCourse}
              onChange={(e) => setPmuCourse(e.target.value)}
              className="bg-muted/50 border-border"
            />
          </div>
          <div className="flex items-end">
            <Button 
              onClick={handleFetchPMU}
              disabled={isFetching}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isFetching ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Partants
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Manual Arrivée Input */}
        <div className="mt-4 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-amber-500 uppercase tracking-wide flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              Arrivée manuelle
            </h4>
            {arrivee.length > 0 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={clearArrivee}
                className="text-xs text-muted-foreground hover:text-destructive"
              >
                Effacer
              </Button>
            )}
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input
                type="text"
                placeholder="Ex: 9-5-8-4-2 (numéros séparés par - ou espaces)"
                value={arriveeManuelle}
                onChange={(e) => setArriveeManuelle(e.target.value)}
                className="bg-background/50 border-amber-500/30 focus:border-amber-500"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Entrez les numéros des chevaux dans l'ordre d'arrivée (1er, 2ème, 3ème...)
              </p>
            </div>
          </div>
          
          {/* Display parsed arrival */}
          {arrivee.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {arrivee.slice(0, 7).map((numero, index) => (
                <div 
                  key={`${numero}-${index}`}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${getPositionColor(index + 1)}`}
                >
                  <span className="text-lg font-bold">{index + 1}.</span>
                  <span className="w-7 h-7 rounded-full bg-background/50 text-sm font-bold flex items-center justify-center">
                    {numero}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Fetched horses detailed table */}
        {fetchedHorses.length > 0 && (
          <PMUDataTable horses={fetchedHorses} arrivee={arrivee} />
        )}
      </div>

      {/* Discipline Selector */}
      <div className="cyber-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-1">
              Discipline
            </h3>
            <p className="text-sm text-muted-foreground">
              Sélectionnez le type de course pour adapter les scores
            </p>
          </div>
          
          <Select value={discipline} onValueChange={(v) => setDiscipline(v as Discipline)}>
            <SelectTrigger className="w-48 bg-muted/50 border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="plat">🏇 Plat</SelectItem>
              <SelectItem value="trot">🐎 Trot</SelectItem>
              <SelectItem value="obstacle">🏃 Obstacle</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Manual Input */}
      <div className="cyber-card">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">
            Saisie manuelle
          </h3>
        </div>
        
        <p className="text-sm text-muted-foreground mb-4">
          Format: <code className="px-1.5 py-0.5 rounded bg-muted text-xs">N° Rapp.Direct Musique</code> (une ligne par cheval)
        </p>
        
        <Textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Exemple:
1 5.2 1p2a3s4a
2 12.5 Da3a2m1p
3 3.8 1a1a2a1s"
          className="font-mono text-sm min-h-[200px] bg-muted/50 border-border"
        />
        
        <div className="flex flex-wrap gap-3 mt-4">
          <Button onClick={handleParse} className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Play className="w-4 h-4 mr-2" />
            Analyser
          </Button>
          <Button onClick={handleCalculate} variant="secondary">
            <Calculator className="w-4 h-4 mr-2" />
            Calculer couplés
          </Button>
        </div>
        
        {parsedData.length > 0 && (
          <div className="mt-4 p-3 rounded-lg bg-green-500/10 border border-green-500/30">
            <p className="text-sm text-green-500">
              ✓ {parsedData.length} chevaux analysés avec succès
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

