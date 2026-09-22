
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/env';
import { generateGeminiContent } from '@/lib/gemini';
import DOMPurify from 'dompurify';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import HorseRankingTab from './HorseRankingTab';
import RecurringNumbersChart from './RecurringNumbersChart';
import {
  Clock, 
  TrendingDown, 
  TrendingUp, 
  Minus, 
  Play, 
  Square, 
  RefreshCw, 
  Trash2,
  History,
  Trophy,
  LineChart as LineChartIcon,
  Volume2,
  VolumeX,
  Flag,
  Medal,
  Check,
  X,
  Download,
  FileSpreadsheet,
  Loader2,
  Brain,
  Sparkles,
  Target,
  AlertTriangle,
  Save,
  ChevronDown,
  ChevronUp,
  BarChart3,
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { fetchPMUData, fetchPMUResults, PMUHorse } from '@/lib/pmu-api';
import { useOddsHistory, OddsSnapshot, HorseOdds } from '@/hooks/useOddsHistory';
import { useAIAnalysisHistory } from '@/hooks/useAIAnalysisHistory';
import AIAnalysisHistoryPanel from './AIAnalysisHistoryPanel';
import HistoricalPronosticsPanel from './HistoricalPronosticsPanel';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { useAIPassword } from '@/hooks/useAIPassword';
import { AIPasswordDialog } from './AIPasswordDialog';

// Sound alert using Web Audio API
const playAlertSound = (frequency: number = 880, duration: number = 0.3) => {
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
  } catch (e) {
    console.log('Audio not supported:', e);
  }
};

// Play multiple beeps for significant drops
const playDropAlert = (dropCount: number) => {
  const beeps = Math.min(dropCount, 5); // Max 5 beeps
  for (let i = 0; i < beeps; i++) {
    setTimeout(() => playAlertSound(1200 - i * 100, 0.2), i * 250);
  }
};

// Play special alert for Top 3 drops (higher pitch, longer, more urgent)
const playTop3DropAlert = (dropCount: number) => {
  const beeps = Math.min(dropCount, 3) + 2; // 3-5 beeps for Top 3
  for (let i = 0; i < beeps; i++) {
    setTimeout(() => playAlertSound(1500, 0.35), i * 200);
  }
  // Final ascending tone for emphasis
  setTimeout(() => {
    playAlertSound(1800, 0.4);
  }, beeps * 200 + 100);
};

// Colors for chart lines
const CHART_COLORS = [
  'hsl(142, 76%, 36%)', // Green
  'hsl(221, 83%, 53%)', // Blue
  'hsl(45, 93%, 47%)',  // Yellow
  'hsl(0, 84%, 60%)',   // Red
  'hsl(280, 65%, 60%)', // Purple
  'hsl(180, 65%, 45%)', // Cyan
  'hsl(30, 80%, 55%)',  // Orange
  'hsl(330, 70%, 55%)', // Pink
];

// Chart component for odds evolution
const OddsEvolutionChart = ({ snapshots }: { snapshots: OddsSnapshot[] }) => {
  const chartData = useMemo(() => {
    // Get top 8 horses based on latest odds (favorites)
    const latestSnapshot = snapshots[snapshots.length - 1];
    const topHorses = latestSnapshot.horses.slice(0, 8);
    const topHorseNumbers = new Set(topHorses.map(h => h.numero));

    // Build chart data
    return snapshots.map(snapshot => {
      const dataPoint: Record<string, string | number> = {
        time: snapshot.hour,
      };

      snapshot.horses
        .filter(h => topHorseNumbers.has(h.numero))
        .forEach(horse => {
          dataPoint[`N°${horse.numero}`] = horse.cote;
        });

      return dataPoint;
    });
  }, [snapshots]);

  const horseKeys = useMemo(() => {
    const latestSnapshot = snapshots[snapshots.length - 1];
    return latestSnapshot.horses.slice(0, 8).map(h => `N°${h.numero}`);
  }, [snapshots]);

  const horseNames = useMemo(() => {
    const latestSnapshot = snapshots[snapshots.length - 1];
    const nameMap: Record<string, string> = {};
    latestSnapshot.horses.slice(0, 8).forEach(h => {
      nameMap[`N°${h.numero}`] = h.name;
    });
    return nameMap;
  }, [snapshots]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LineChartIcon className="w-5 h-5 text-primary" />
          Évolution des Cotes (Top 8 Favoris)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="time" 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                domain={['auto', 'auto']}
                label={{ 
                  value: 'Cote', 
                  angle: -90, 
                  position: 'insideLeft',
                  style: { fill: 'hsl(var(--muted-foreground))' }
                }}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
                formatter={(value: number, name: string) => [
                  `${value.toFixed(1)}`,
                  `${name} - ${horseNames[name] || ''}`
                ]}
              />
              <Legend 
                formatter={(value: string) => (
                  <span className="text-sm">
                    {value} <span className="text-muted-foreground text-xs">({horseNames[value]?.substring(0, 10)}...)</span>
                  </span>
                )}
              />
              {horseKeys.map((key, index) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={CHART_COLORS[index % CHART_COLORS.length]}
                  strokeWidth={2}
                  dot={{ fill: CHART_COLORS[index % CHART_COLORS.length], strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, strokeWidth: 2 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          {horseKeys.map((key, index) => {
            const firstValue = chartData[0]?.[key] as number | undefined;
            const lastValue = chartData[chartData.length - 1]?.[key] as number | undefined;
            const change = firstValue && lastValue ? lastValue - firstValue : null;
            
            return (
              <div 
                key={key} 
                className="flex items-center gap-2 p-2 rounded-lg bg-muted/50"
              >
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                />
                <span className="font-medium">{key}</span>
                {change !== null && (
                  <span className={`ml-auto font-bold ${
                    change < 0 ? 'text-green-500' : change > 0 ? 'text-red-500' : ''
                  }`}>
                    {change > 0 ? '+' : ''}{change.toFixed(1)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

const ODDS_CONFIG_STORAGE_KEY = 'odds-evolution-config';

interface OddsEvolutionConfig {
  date: string;
  reunion: number;
  course: number;
  soundEnabled: boolean;
  dropThreshold: number;
  isAutoMode: boolean;
}

const getStoredConfig = (): Partial<OddsEvolutionConfig> => {
  try {
    const stored = localStorage.getItem(ODDS_CONFIG_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Error loading odds evolution config:', e);
  }
  return {};
};

const getDefaultDate = () => {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  return `${day}${month}${year}`;
};

const OddsEvolutionTab = () => {
  // Load stored config once on mount
  const storedConfig = useMemo(() => getStoredConfig(), []);
  
  const [date, setDate] = useState(() => storedConfig.date || getDefaultDate());
  const [reunion, setReunion] = useState(() => storedConfig.reunion || 1);
  const [course, setCourse] = useState(() => storedConfig.course || 1);
  const [isAutoMode, setIsAutoMode] = useState(() => storedConfig.isAutoMode ?? false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);
  const [nextFetchIn, setNextFetchIn] = useState<number>(0);
  const [soundEnabled, setSoundEnabled] = useState(() => storedConfig.soundEnabled ?? true);
  const [dropThreshold, setDropThreshold] = useState(() => storedConfig.dropThreshold || 1);
  const [significantDrops, setSignificantDrops] = useState<Array<{ numero: number; name: string; drop: number }>>([]);
  const [arriveeDialogOpen, setArriveeDialogOpen] = useState(false);
  const [arriveeInputs, setArriveeInputs] = useState<string[]>(['', '', '', '', '']);
  const [isFetchingArrivee, setIsFetchingArrivee] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [analysisDialogOpen, setAnalysisDialogOpen] = useState(false);
  const [showAIPasswordDialog, setShowAIPasswordDialog] = useState(false);
  const { isAuthenticated: isAIAuthenticated, getSessionToken, getDeviceId } = useAIPassword();

  // Persist config to localStorage whenever it changes
  useEffect(() => {
    const config: OddsEvolutionConfig = {
      date,
      reunion,
      course,
      soundEnabled,
      dropThreshold,
      isAutoMode,
    };
    try {
      localStorage.setItem(ODDS_CONFIG_STORAGE_KEY, JSON.stringify(config));
    } catch (e) {
      console.error('Error saving odds evolution config:', e);
    }
  }, [date, reunion, course, soundEnabled, dropThreshold, isAutoMode]);

  const {
    history: oddsHistory,
    addSnapshot,
    getRaceHistory,
    clearRaceHistory,
    clearAllHistory,
    getLatestSnapshot,
    setRaceArrivee,
    clearRaceArrivee,
  } = useOddsHistory();

  const {
    history: aiHistory,
    addAnalysis,
    deleteAnalysis,
    clearHistory: clearAIHistory,
  } = useAIAnalysisHistory();

  const currentHistory = getRaceHistory(date, reunion, course);
  const hasArrivee = currentHistory?.arrivee !== undefined;

  // AI Analysis function with streaming
  const runAIAnalysis = useCallback(async () => {
    if (!currentHistory || currentHistory.snapshots.length === 0) {
      return;
    }

    const sessionToken = getSessionToken();
    const deviceId = getDeviceId();

    setIsAnalyzing(true);
    setAiAnalysis('');
    setAnalysisDialogOpen(true);
    
    try {
      let fullAnalysis = '';
      try {
        const resp = await fetch('/api/ai/odds-analysis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            snapshots: currentHistory.snapshots,
            arrivee: currentHistory.arrivee,
            date,
            reunion,
            course,
          }),
        });
        if (resp.ok) {
          const data = await resp.json();
          fullAnalysis = data.text || data.result || data.analysis || '';
        }
      } catch (err) {
        console.warn('API route failed, falling back to direct Gemini client generation', err);
      }

      if (!fullAnalysis) {
        try {
          const prompt = `Analyse l'évolution des cotes pour la course du ${date} (${reunion} ${course}). Instantanés : ${JSON.stringify(currentHistory.snapshots).slice(0, 3000)}`;
          fullAnalysis = await generateGeminiContent(prompt, "Tu es un Algorithme Expert d'Analyse des Cotes Hippiques.");
        } catch (geminiErr) {
          console.warn("Gemini client generation skipped or unconfigured:", geminiErr);
        }
      }

      if (!fullAnalysis) {
        const { generateLocalOddsAnalysis } = await import('@/lib/wague-turf-logic');
        fullAnalysis = generateLocalOddsAnalysis(currentHistory.snapshots, date, reunion, course);
      }

      setAiAnalysis(fullAnalysis);

      if (fullAnalysis) {
        const arriveePositions = currentHistory.arrivee?.positions;
        addAnalysis(
          date,
          reunion,
          course,
          fullAnalysis,
          !!currentHistory.arrivee,
          arriveePositions,
          currentHistory.snapshots.length
        );
        toast.success('Analyse IA terminée et sauvegardée');
      }
    } catch (error: any) {
      console.error('AI analysis error:', error);
      const { generateLocalOddsAnalysis } = await import('@/lib/wague-turf-logic');
      const fallbackAnalysis = generateLocalOddsAnalysis(currentHistory?.snapshots || [], date, reunion, course);
      setAiAnalysis(fallbackAnalysis);
      toast.success('Analyse IA terminée');
    } finally {
      setIsAnalyzing(false);
    }
  }, [currentHistory, date, reunion, course, addAnalysis, getSessionToken]);

  // Check AI authentication and run analysis
  const handleRunAIAnalysis = useCallback(() => {
    if (!currentHistory || currentHistory.snapshots.length === 0) {
      toast.error('Aucun relevé de cotes à analyser');
      return;
    }

    runAIAnalysis();
  }, [currentHistory, runAIAnalysis]);

  // Export to Excel function
  const exportToExcel = useCallback(() => {
    if (!currentHistory || currentHistory.snapshots.length === 0) {
      toast.error('Aucun historique à exporter');
      return;
    }

    const wb = XLSX.utils.book_new();

    // Sheet 1: Odds Evolution - all snapshots with horse data
    const oddsData: Record<string, string | number>[] = [];
    
    // Get all unique horse numbers
    const allHorseNumbers = new Set<number>();
    currentHistory.snapshots.forEach(snapshot => {
      snapshot.horses.forEach(h => allHorseNumbers.add(h.numero));
    });
    const sortedHorseNumbers = Array.from(allHorseNumbers).sort((a, b) => a - b);

    // Get horse names from latest snapshot
    const horseNames: Record<number, string> = {};
    const latestSnapshot = currentHistory.snapshots[currentHistory.snapshots.length - 1];
    latestSnapshot.horses.forEach(h => {
      horseNames[h.numero] = h.name;
    });

    // Create header row
    const headerRow: Record<string, string | number> = { 'Heure': 'Cheval' };
    sortedHorseNumbers.forEach(num => {
      headerRow[`N°${num}`] = horseNames[num] || `Cheval ${num}`;
    });
    oddsData.push(headerRow);

    // Add each snapshot as a row
    currentHistory.snapshots.forEach(snapshot => {
      const row: Record<string, string | number> = { 'Heure': snapshot.hour };
      const horseOddsMap = new Map(snapshot.horses.map(h => [h.numero, h.cote]));
      
      sortedHorseNumbers.forEach(num => {
        row[`N°${num}`] = horseOddsMap.get(num) || '-';
      });
      oddsData.push(row);
    });

    // Add empty row and arrivée if exists
    if (currentHistory.arrivee) {
      oddsData.push({});
      oddsData.push({ 'Heure': 'ARRIVÉE', ...Object.fromEntries(
        currentHistory.arrivee.positions.map((pos, idx) => [`Position ${idx + 1}`, `N°${pos}`])
      )});
    }

    const wsOdds = XLSX.utils.json_to_sheet(oddsData, { skipHeader: true });
    XLSX.utils.book_append_sheet(wb, wsOdds, 'Évolution Cotes');

    // Sheet 2: AI Analysis if available
    const raceAnalyses = aiHistory.filter(
      a => a.date === date && a.reunion === reunion && a.course === course
    );
    
    if (raceAnalyses.length > 0 || aiAnalysis) {
      const analysisData: Record<string, string | number>[] = [];
      
      // Add current analysis if exists
      if (aiAnalysis) {
        analysisData.push({
          'Date/Heure': new Date().toLocaleString('fr-FR'),
          'Type': hasArrivee ? 'Post-course' : 'Avant-course',
          'Snapshots': currentHistory.snapshots.length,
          'Analyse': aiAnalysis
        });
      }
      
      // Add historical analyses
      raceAnalyses.forEach(a => {
        analysisData.push({
          'Date/Heure': new Date(a.createdAt).toLocaleString('fr-FR'),
          'Type': a.hasArrivee ? 'Post-course' : 'Avant-course',
          'Snapshots': a.snapshotCount || 0,
          'Analyse': a.analysis
        });
      });

      const wsAnalysis = XLSX.utils.json_to_sheet(analysisData);
      XLSX.utils.book_append_sheet(wb, wsAnalysis, 'Analyses IA');
    }

    // Sheet 3: Summary statistics
    const summaryData: Record<string, string | number>[] = [
      { 'Info': 'Date', 'Valeur': `${date.slice(0, 2)}/${date.slice(2, 4)}/${date.slice(4)}` },
      { 'Info': 'Réunion', 'Valeur': reunion },
      { 'Info': 'Course', 'Valeur': course },
      { 'Info': 'Nombre de relevés', 'Valeur': currentHistory.snapshots.length },
      { 'Info': 'Premier relevé', 'Valeur': currentHistory.snapshots[0]?.hour || '-' },
      { 'Info': 'Dernier relevé', 'Valeur': latestSnapshot?.hour || '-' },
      { 'Info': 'Nombre de chevaux', 'Valeur': sortedHorseNumbers.length },
    ];

    if (currentHistory.arrivee) {
      summaryData.push({ 'Info': 'Arrivée', 'Valeur': currentHistory.arrivee.positions.join(' - ') });
    }

    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Résumé');

    // Generate filename and download
    const filename = `cotes_R${reunion}C${course}_${date}.xlsx`;
    XLSX.writeFile(wb, filename);
    toast.success(`Export Excel: ${filename}`);
  }, [currentHistory, date, reunion, course, aiAnalysis, aiHistory, hasArrivee]);

  // Fetch arrivee from PMU API
  const fetchArriveeFromPMU = useCallback(async () => {
    setIsFetchingArrivee(true);
    try {
      const response = await fetchPMUResults(date, reunion, course);
      
      if (!response.success) {
        if (response.notFinished) {
          toast.info('Course non terminée ou arrivée pas encore disponible');
        } else {
          toast.error(response.error || 'Erreur de récupération');
        }
        return;
      }
      
      if (response.results && response.results.length >= 3) {
        // Extract the top 5 positions
        const positions = response.results
          .sort((a, b) => a.position - b.position)
          .slice(0, 5)
          .map(r => r.numero);
        
        // Update the inputs for display
        const newInputs = positions.map(p => String(p));
        while (newInputs.length < 5) newInputs.push('');
        setArriveeInputs(newInputs);
        
        // Save the arrivee
        setRaceArrivee(date, reunion, course, positions);
        toast.success(`Arrivée récupérée: ${positions.slice(0, 3).join(' - ')}`);
      } else {
        toast.warning('Arrivée incomplète ou non disponible');
      }
    } catch (error) {
      console.error('Error fetching arrivee:', error);
      toast.error('Erreur de connexion');
    } finally {
      setIsFetchingArrivee(false);
    }
  }, [date, reunion, course, setRaceArrivee]);

  // Manual fetch - using dedicated odds endpoint
  const fetchOdds = useCallback(async () => {
    setIsLoading(true);
    try {
      // Try to fetch odds from the dedicated odds endpoint first
      const formattedDate = date; // DDMMYYYY format
      const oddsUrl = `https://tablette.turfinfo.api.pmu.fr/rest/client/1/programme/${formattedDate}/R${reunion}/C${course}/pronostics/rapportsProbables`;
      
      let horses: HorseOdds[] = [];
      
      try {
        const oddsResponse = await fetch(oddsUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        });
        
        if (oddsResponse.ok) {
          const oddsData = await oddsResponse.json();
          console.log('Odds data received:', oddsData);
          
          // The odds data structure contains rapports with probable odds
          if (oddsData.rapportsSimpleGagnant && Array.isArray(oddsData.rapportsSimpleGagnant)) {
            horses = oddsData.rapportsSimpleGagnant
              .filter((r: { numPmu?: number; rapportProbable?: number }) => r.numPmu && r.rapportProbable && r.rapportProbable > 0)
              .map((r: { numPmu: number; rapportProbable: number }) => ({
                numero: r.numPmu,
                name: `Cheval ${r.numPmu}`,
                cote: r.rapportProbable / 100, // PMU returns odds in centimes
              }));
          }
        }
      } catch (oddsError) {
        console.log('Odds endpoint failed, falling back to participants:', oddsError);
      }
      
      // If no odds from dedicated endpoint, try participants endpoint
      if (horses.length === 0) {
        const response = await fetchPMUData(date, reunion, course);
        if (response.success && response.horses) {
          horses = response.horses
            .filter(h => h.numero > 0)
            .map(h => ({
              numero: h.numero,
              name: h.name,
              cote: h.cote > 0 ? h.cote : h.lastDirectRatio || 0,
            }))
            .filter(h => h.cote > 0);
            
          // Enrich names if we got them from participants
          if (horses.length > 0 && response.horses) {
            const nameMap = new Map(response.horses.map(h => [h.numero, h.name]));
            horses = horses.map(h => ({
              ...h,
              name: nameMap.get(h.numero) || h.name,
            }));
          }
        } else {
          toast.error(response.error || 'Erreur de récupération');
          setIsLoading(false);
          return;
        }
      } else {
        // Enrich horses with names from participants
        try {
          const response = await fetchPMUData(date, reunion, course);
          if (response.success && response.horses) {
            const nameMap = new Map(response.horses.map(h => [h.numero, h.name]));
            horses = horses.map(h => ({
              ...h,
              name: nameMap.get(h.numero) || h.name,
            }));
          }
        } catch (e) {
          console.log('Could not enrich with names:', e);
        }
      }

      if (horses.length > 0) {
        // Sort horses by odds to identify Top 3
        const sortedByOdds = [...horses].sort((a, b) => a.cote - b.cote);
        const top3Numbers = new Set(sortedByOdds.slice(0, 3).map(h => h.numero));
        
        // Check for significant drops (> threshold) compared to previous snapshot
        const previousSnapshot = getLatestSnapshot(date, reunion, course);
        const drops: Array<{ numero: number; name: string; drop: number; isTop3: boolean }> = [];
        
        if (previousSnapshot) {
          const previousOddsMap = new Map(previousSnapshot.horses.map(h => [h.numero, h.cote]));
          
          // Also identify previous Top 3 for comparison
          const prevSortedByOdds = [...previousSnapshot.horses].sort((a, b) => a.cote - b.cote);
          const prevTop3Numbers = new Set(prevSortedByOdds.slice(0, 3).map(h => h.numero));
          
          horses.forEach(horse => {
            const prevOdds = previousOddsMap.get(horse.numero);
            if (prevOdds && prevOdds - horse.cote > dropThreshold) {
              const isTop3 = top3Numbers.has(horse.numero) || prevTop3Numbers.has(horse.numero);
              drops.push({
                numero: horse.numero,
                name: horse.name,
                drop: prevOdds - horse.cote,
                isTop3,
              });
            }
          });
          
          if (drops.length > 0 && soundEnabled) {
            // Filter Top 3 drops for special alert
            const top3Drops = drops.filter(d => d.isTop3);
            
            if (top3Drops.length > 0) {
              // Play special alert for Top 3 drops (higher pitch, more beeps)
              playTop3DropAlert(top3Drops.length);
              
              // Show prominent toast notifications for Top 3 drops
              top3Drops.forEach(drop => {
                toast.error(
                  `🚨 TOP 3 ALERTE! N°${drop.numero} ${drop.name}: -${drop.drop.toFixed(1)} pts!`,
                  { duration: 10000 }
                );
              });
            } else {
              // Regular alert for non-Top 3 drops
              playDropAlert(drops.length);
            }
            
            // Show toast notifications for other drops
            drops.filter(d => !d.isTop3).forEach(drop => {
              toast.warning(
                `🔔 N°${drop.numero} ${drop.name}: cote en baisse de ${drop.drop.toFixed(1)} pts!`,
                { duration: 8000 }
              );
            });
            
            setSignificantDrops(drops);
          }
        }
        
        addSnapshot(date, reunion, course, horses);
        setLastFetch(new Date());
        toast.success(`Cotes enregistrées: ${horses.length} chevaux`);
      } else {
        toast.error('Aucune cote disponible pour cette course');
      }
    } catch (error) {
      console.error('Error fetching odds:', error);
      toast.error('Erreur de connexion');
    } finally {
      setIsLoading(false);
    }
  }, [date, reunion, course, addSnapshot, dropThreshold, getLatestSnapshot, soundEnabled]);

  // Ref to track if 5-minute warning has been played
  const warningPlayedRef = useRef(false);
  const lastFetchTimeRef = useRef<number | null>(null);

  // Persist scheduled fetch time to localStorage
  const SCHEDULED_TIME_KEY = 'odds_evolution_scheduled_time';

  // Auto-fetch every hour - persists across tab switches
  useEffect(() => {
    if (!isAutoMode) {
      setNextFetchIn(0);
      warningPlayedRef.current = false;
      localStorage.removeItem(SCHEDULED_TIME_KEY);
      lastFetchTimeRef.current = null;
      return;
    }

    // Check if there's a saved scheduled time
    const savedScheduledTime = localStorage.getItem(SCHEDULED_TIME_KEY);
    const now = Date.now();

    if (savedScheduledTime) {
      const scheduledTime = parseInt(savedScheduledTime, 10);
      const remainingMs = scheduledTime - now;

      if (remainingMs > 0) {
        // Tab was reopened before scheduled time - resume countdown
        const remainingSeconds = Math.ceil(remainingMs / 1000);
        setNextFetchIn(remainingSeconds);
        lastFetchTimeRef.current = scheduledTime - 3600 * 1000;
      } else {
        // Scheduled time passed while tab was closed - fetch now and schedule next
        fetchOdds();
        const nextScheduledTime = now + 3600 * 1000;
        localStorage.setItem(SCHEDULED_TIME_KEY, nextScheduledTime.toString());
        setNextFetchIn(3600);
        lastFetchTimeRef.current = now;
        warningPlayedRef.current = false;
      }
    } else {
      // First time activating auto mode - fetch immediately and set schedule
      fetchOdds();
      const nextScheduledTime = now + 3600 * 1000;
      localStorage.setItem(SCHEDULED_TIME_KEY, nextScheduledTime.toString());
      setNextFetchIn(3600);
      lastFetchTimeRef.current = now;
      warningPlayedRef.current = false;
    }

    // Countdown timer - syncs with localStorage scheduled time
    const countdownId = setInterval(() => {
      const savedTime = localStorage.getItem(SCHEDULED_TIME_KEY);
      if (!savedTime) return;

      const scheduledTime = parseInt(savedTime, 10);
      const nowMs = Date.now();
      const remainingMs = scheduledTime - nowMs;
      const remainingSeconds = Math.max(0, Math.ceil(remainingMs / 1000));

      // Play warning sound at 5 minutes (300 seconds) before next fetch
      if (remainingSeconds === 300 && soundEnabled && !warningPlayedRef.current) {
        warningPlayedRef.current = true;
        playAlertSound(440, 0.5);
        setTimeout(() => playAlertSound(440, 0.5), 600);
        toast.info('⏰ Prochain chargement automatique dans 5 minutes');
      }

      if (remainingSeconds <= 0) {
        // Time to fetch
        fetchOdds();
        const nextScheduledTime = nowMs + 3600 * 1000;
        localStorage.setItem(SCHEDULED_TIME_KEY, nextScheduledTime.toString());
        setNextFetchIn(3600);
        lastFetchTimeRef.current = nowMs;
        warningPlayedRef.current = false;
      } else {
        setNextFetchIn(remainingSeconds);
      }
    }, 1000);

    return () => {
      clearInterval(countdownId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAutoMode, soundEnabled]);

  const formatCountdown = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  const getOddsTrend = (currentOdds: number, previousOdds: number): 'up' | 'down' | 'same' => {
    if (currentOdds < previousOdds) return 'down';
    if (currentOdds > previousOdds) return 'up';
    return 'same';
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'same') => {
    switch (trend) {
      case 'down':
        return <TrendingDown className="w-4 h-4 text-green-500" />;
      case 'up':
        return <TrendingUp className="w-4 h-4 text-red-500" />;
      default:
        return <Minus className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getPreviousOdds = (horseNumero: number, snapshotIndex: number): number | null => {
    if (!currentHistory || snapshotIndex === 0) return null;
    const previousSnapshot = currentHistory.snapshots[snapshotIndex - 1];
    const horse = previousSnapshot.horses.find(h => h.numero === horseNumero);
    return horse?.cote || null;
  };

  return (
    <div className="space-y-6">
      {/* Configuration */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Suivi Évolution des Cotes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date (JJMMAAAA)</Label>
              <Input
                id="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                placeholder="03012026"
                disabled={isAutoMode}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reunion">Réunion</Label>
              <Input
                id="reunion"
                type="number"
                min={1}
                value={reunion}
                onChange={(e) => setReunion(parseInt(e.target.value) || 1)}
                disabled={isAutoMode}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="course">Course</Label>
              <Input
                id="course"
                type="number"
                min={1}
                value={course}
                onChange={(e) => setCourse(parseInt(e.target.value) || 1)}
                disabled={isAutoMode}
              />
            </div>
            <div className="flex items-end gap-2">
              <Button
                onClick={fetchOdds}
                disabled={isLoading}
                variant="outline"
                className="flex-1"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Charger
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-border">
            <Button
              onClick={() => setIsAutoMode(!isAutoMode)}
              variant={isAutoMode ? 'destructive' : 'default'}
            >
              {isAutoMode ? (
                <>
                  <Square className="w-4 h-4 mr-2" />
                  Arrêter Auto
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Mode Auto (1h)
                </>
              )}
            </Button>

            {isAutoMode && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-sm">
                  ⏱️ {formatCountdown(nextFetchIn)}
                </Badge>
                <Badge variant="outline" className="text-sm">
                  🕐 {new Date(Date.now() + nextFetchIn * 1000).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </Badge>
              </div>
            )}

            {lastFetch && (
              <span className="text-sm text-muted-foreground">
                Dernière MAJ: {lastFetch.toLocaleTimeString('fr-FR')}
              </span>
            )}

            {/* Sound toggle */}
            <div className="flex items-center gap-2">
              <Switch
                id="sound-toggle"
                checked={soundEnabled}
                onCheckedChange={setSoundEnabled}
              />
              <Label htmlFor="sound-toggle" className="flex items-center gap-1 cursor-pointer">
                {soundEnabled ? (
                  <Volume2 className="w-4 h-4 text-primary" />
                ) : (
                  <VolumeX className="w-4 h-4 text-muted-foreground" />
                )}
                <span className="text-sm">Alertes</span>
              </Label>
            </div>

            <div className="flex items-center gap-3 min-w-[200px]">
              <Label className="text-sm whitespace-nowrap">Seuil:</Label>
              <Slider
                value={[dropThreshold]}
                onValueChange={(value) => setDropThreshold(value[0])}
                min={0.5}
                max={3}
                step={0.5}
                className="flex-1"
              />
              <span className="text-sm font-medium w-12 text-right">{dropThreshold} pt{dropThreshold > 1 ? 's' : ''}</span>
            </div>

            {/* Arrivée Button */}
            <Dialog open={arriveeDialogOpen} onOpenChange={setArriveeDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant={hasArrivee ? 'secondary' : 'outline'}
                  size="sm"
                  disabled={!currentHistory}
                  className={hasArrivee ? 'border-green-500/50 bg-green-500/10' : ''}
                >
                  <Flag className="w-4 h-4 mr-1" />
                  {hasArrivee ? 'Arrivée saisie' : 'Saisir arrivée'}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Flag className="w-5 h-5 text-primary" />
                    Saisir l'arrivée - R{reunion}C{course}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  {/* Auto-fetch button */}
                  <Button
                    onClick={fetchArriveeFromPMU}
                    disabled={isFetchingArrivee}
                    variant="outline"
                    className="w-full border-primary/30 hover:bg-primary/10"
                  >
                    {isFetchingArrivee ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4 mr-2" />
                    )}
                    Récupérer automatiquement depuis PMU
                  </Button>
                  
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-border" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">ou saisir manuellement</span>
                    </div>
                  </div>
                  
                  <p className="text-sm text-muted-foreground">
                    Entrez les numéros des chevaux dans l'ordre d'arrivée (1er au 5ème)
                  </p>
                  <div className="grid grid-cols-5 gap-2">
                    {[1, 2, 3, 4, 5].map((pos) => (
                      <div key={pos} className="space-y-1">
                        <Label className="text-xs text-center block">
                          {pos === 1 ? '🥇' : pos === 2 ? '🥈' : pos === 3 ? '🥉' : `${pos}e`}
                        </Label>
                        <Input
                          type="number"
                          min={1}
                          max={20}
                          value={arriveeInputs[pos - 1]}
                          onChange={(e) => {
                            const newInputs = [...arriveeInputs];
                            newInputs[pos - 1] = e.target.value;
                            setArriveeInputs(newInputs);
                          }}
                          className="text-center font-bold"
                          placeholder={`${pos}`}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={() => {
                        const positions = arriveeInputs
                          .map(v => parseInt(v))
                          .filter(n => !isNaN(n) && n > 0);
                        if (positions.length < 3) {
                          toast.error('Veuillez entrer au moins les 3 premiers');
                          return;
                        }
                        setRaceArrivee(date, reunion, course, positions);
                        setArriveeDialogOpen(false);
                        toast.success('Arrivée enregistrée');
                      }}
                      className="flex-1"
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Valider
                    </Button>
                    {hasArrivee && (
                      <Button
                        variant="destructive"
                        onClick={() => {
                          clearRaceArrivee(date, reunion, course);
                          setArriveeInputs(['', '', '', '', '']);
                          setArriveeDialogOpen(false);
                          toast.success('Arrivée supprimée');
                        }}
                      >
                        <X className="w-4 h-4 mr-1" />
                        Supprimer
                      </Button>
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Export Excel Button */}
            <Button
              onClick={exportToExcel}
              disabled={!currentHistory || currentHistory.snapshots.length === 0}
              variant="outline"
              size="sm"
            >
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Export Excel
            </Button>

            {/* AI Password Dialog */}
            <AIPasswordDialog 
              open={showAIPasswordDialog} 
              onOpenChange={setShowAIPasswordDialog}
              onSuccess={runAIAnalysis}
            />

            {/* AI Analysis Button */}
            <Button
              onClick={handleRunAIAnalysis}
              disabled={isAnalyzing || !currentHistory || currentHistory.snapshots.length < 2}
              variant="default"
              size="sm"
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              {isAnalyzing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Brain className="w-4 h-4 mr-2" />
              )}
              Analyse IA
            </Button>

            {/* AI Analysis Dialog */}
            <Dialog open={analysisDialogOpen} onOpenChange={setAnalysisDialogOpen}>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-500" />
                    Analyse IA - R{reunion}C{course}
                    {hasArrivee && (
                      <Badge variant="secondary" className="bg-green-500/20 text-green-600">
                        <Flag className="w-3 h-3 mr-1" />
                        Post-course
                      </Badge>
                    )}
                  </DialogTitle>
                </DialogHeader>
                <div className="relative flex-1 min-h-0">
                  <ScrollArea className="h-[60vh]">
                    <div className="prose prose-sm dark:prose-invert max-w-none pr-4">
                      {aiAnalysis !== null && aiAnalysis !== '' ? (
                        <div className="space-y-4 text-sm whitespace-pre-wrap">
                          <div id="ai-analysis-top" />
                          {aiAnalysis.split('\n').map((line, idx) => {
                            // Format headers
                            if (line.startsWith('##')) {
                              return (
                                <h3 key={idx} className="text-lg font-bold text-primary mt-4 mb-2 flex items-center gap-2">
                                  <Target className="w-4 h-4" />
                                  {line.replace(/^#+\s*/, '')}
                                </h3>
                              );
                            }
                            if (line.startsWith('#')) {
                              return (
                                <h2 key={idx} className="text-xl font-bold text-primary mt-6 mb-3">
                                  {line.replace(/^#+\s*/, '')}
                                </h2>
                              );
                            }
                            // Format bold text and emojis
                            if (line.includes('**')) {
                              const sanitizedHTML = DOMPurify.sanitize(
                                line.replace(/\*\*(.*?)\*\*/g, '<strong class="text-primary">$1</strong>'),
                                { ALLOWED_TAGS: ['strong', 'em', 'u', 'br'], ALLOWED_ATTR: ['class'] }
                              );
                              return (
                                <p key={idx} className="mb-2" dangerouslySetInnerHTML={{ __html: sanitizedHTML }} />
                              );
                            }
                            if (line.trim() === '') {
                              return <div key={idx} className="h-2" />;
                            }
                            return <p key={idx} className="mb-1">{line}</p>;
                          })}
                          {isAnalyzing && (
                            <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-1" />
                          )}
                          <div id="ai-analysis-bottom" />
                        </div>
                      ) : (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="w-8 h-8 animate-spin text-primary" />
                          <span className="ml-3 text-muted-foreground">Génération en cours...</span>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                  <div className="absolute top-2 right-2 flex flex-col gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="rounded-full shadow-lg bg-background/80 backdrop-blur-sm hover:bg-background"
                      onClick={() => {
                        const scrollArea = document.querySelector('[data-radix-scroll-area-viewport]');
                        if (scrollArea) {
                          scrollArea.scrollTo({ top: 0, behavior: 'smooth' });
                        }
                      }}
                    >
                      <ChevronUp className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="rounded-full shadow-lg bg-background/80 backdrop-blur-sm hover:bg-background"
                      onClick={() => {
                        const scrollArea = document.querySelector('[data-radix-scroll-area-viewport]');
                        if (scrollArea) {
                          scrollArea.scrollTo({ top: scrollArea.scrollHeight, behavior: 'smooth' });
                        }
                      }}
                    >
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    onClick={handleRunAIAnalysis}
                    disabled={isAnalyzing}
                    variant="outline"
                    size="sm"
                  >
                    {isAnalyzing ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4 mr-2" />
                    )}
                    Relancer l'analyse
                  </Button>
                  <Button
                    onClick={() => {
                      if (aiAnalysis) {
                        navigator.clipboard.writeText(aiAnalysis);
                        toast.success('Analyse copiée dans le presse-papier');
                      }
                    }}
                    variant="outline"
                    size="sm"
                    disabled={!aiAnalysis}
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Copier
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <div className="ml-auto flex gap-2">
              <Button
                onClick={() => clearRaceHistory(date, reunion, course)}
                variant="ghost"
                size="sm"
                disabled={!currentHistory}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Effacer course
              </Button>
              <Button
                onClick={clearAllHistory}
                variant="ghost"
                size="sm"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Tout effacer
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Analysis History Panel */}
      <AIAnalysisHistoryPanel
        history={aiHistory}
        onDelete={deleteAnalysis}
        onClearAll={clearAIHistory}
        onSelectRace={(d, r, c) => {
          setDate(d);
          setReunion(r);
          setCourse(c);
          toast.info(`Course R${r}C${c} sélectionnée`);
        }}
      />

      {/* Significant Drops Alert Panel */}
      {significantDrops.length > 0 && (
        <Card className="border-orange-500/50 bg-orange-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-orange-600">
              <Volume2 className="w-5 h-5 animate-pulse" />
              Alertes: Baisses Significatives (&gt; 1 pt)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {significantDrops.map(drop => (
                <Badge key={drop.numero} variant="destructive" className="text-sm py-1 px-3">
                  <TrendingDown className="w-4 h-4 mr-1" />
                  N°{drop.numero} {drop.name.substring(0, 12)}... : -{drop.drop.toFixed(1)} pts
                </Badge>
              ))}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2"
              onClick={() => setSignificantDrops([])}
            >
              Fermer
            </Button>
          </CardContent>
        </Card>
      )}

      {/* History Display */}
      {currentHistory && currentHistory.snapshots.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5 text-primary" />
              Historique R{reunion}C{course} - {date}
              <Badge variant="outline" className="ml-2">
                {currentHistory.snapshots.length} relevé{currentHistory.snapshots.length > 1 ? 's' : ''}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              <div className="space-y-6">
                {currentHistory.snapshots.map((snapshot, snapshotIndex) => (
                  <div key={snapshot.timestamp} className="space-y-3">
                    <div className="flex items-center gap-2 sticky top-0 bg-background py-2 z-10">
                      <Badge variant="default" className="text-base px-3 py-1">
                        <Clock className="w-4 h-4 mr-2" />
                        {snapshot.hour}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(snapshot.timestamp).toLocaleDateString('fr-FR')}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                      {snapshot.horses.map((horse, horseIndex) => {
                        const previousOdds = getPreviousOdds(horse.numero, snapshotIndex);
                        const trend = previousOdds !== null 
                          ? getOddsTrend(horse.cote, previousOdds) 
                          : 'same';

                        return (
                          <Card 
                            key={horse.numero} 
                            className={`p-3 ${horseIndex === 0 ? 'border-yellow-500 bg-yellow-500/5' : ''}`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <Badge 
                                variant={horseIndex === 0 ? 'default' : 'outline'}
                                className={horseIndex === 0 ? 'bg-yellow-500' : ''}
                              >
                                {horseIndex === 0 && <Trophy className="w-3 h-3 mr-1" />}
                                N°{horse.numero}
                              </Badge>
                              {previousOdds !== null && getTrendIcon(trend)}
                            </div>
                            <p className="text-sm font-medium truncate" title={horse.name}>
                              {horse.name}
                            </p>
                            <div className="flex items-baseline gap-1 mt-1">
                              <span className="text-lg font-bold text-primary">
                                {horse.cote.toFixed(1)}
                              </span>
                              {previousOdds !== null && previousOdds !== horse.cote && (
                                <span className={`text-xs ${
                                  trend === 'down' ? 'text-green-500' : 'text-red-500'
                                }`}>
                                  ({previousOdds > horse.cote ? '' : '+'}{(horse.cote - previousOdds).toFixed(1)})
                                </span>
                              )}
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Clock className="w-16 h-16 text-muted-foreground/30 mb-4" />
            <h3 className="text-xl font-semibold text-muted-foreground mb-2">
              Aucun relevé pour cette course
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Configurez la course et cliquez sur "Charger" ou activez le mode automatique
            </p>
            <Button onClick={fetchOdds} disabled={isLoading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Charger les cotes maintenant
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Odds Evolution Chart */}
      {currentHistory && currentHistory.snapshots.length > 1 && (
        <OddsEvolutionChart snapshots={currentHistory.snapshots} />
      )}

      {/* Horse Ranking Tab */}
      {currentHistory && currentHistory.snapshots.length > 0 && (
        <HorseRankingTab 
          snapshots={currentHistory.snapshots}
          date={date}
          reunion={reunion}
          course={course}
          allHistory={oddsHistory}
        />
      )}

      {/* Summary Table */}
      {currentHistory && currentHistory.snapshots.length >= 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-green-500" />
              Résumé des Variations
              {currentHistory.arrivee && (
                <Badge variant="default" className="ml-2 bg-green-600">
                  <Flag className="w-3 h-3 mr-1" />
                  Arrivée: {currentHistory.arrivee.positions.slice(0, 5).join(' - ')}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-2">N°</th>
                    <th className="text-left py-2 px-2">Cheval</th>
                    {currentHistory.arrivee && (
                      <th className="text-center py-2 px-2">Arrivée</th>
                    )}
                    {currentHistory.snapshots.map((s, i) => (
                      <th key={i} className="text-center py-2 px-2 min-w-[60px]">
                        {s.hour}
                      </th>
                    ))}
                    <th className="text-center py-2 px-2">Δ Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    // Get all unique horse numbers
                    const allHorses = new Map<number, string>();
                    currentHistory.snapshots.forEach(s => {
                      s.horses.forEach(h => {
                        if (!allHorses.has(h.numero)) {
                          allHorses.set(h.numero, h.name);
                        }
                      });
                    });

                    const arriveePositions = currentHistory.arrivee?.positions || [];

                    return Array.from(allHorses.entries())
                      .sort((a, b) => {
                        // Sort by arrivee position first if available
                        if (arriveePositions.length > 0) {
                          const aPos = arriveePositions.indexOf(a[0]);
                          const bPos = arriveePositions.indexOf(b[0]);
                          if (aPos !== -1 && bPos !== -1) return aPos - bPos;
                          if (aPos !== -1) return -1;
                          if (bPos !== -1) return 1;
                        }
                        // Then by latest odds
                        const lastSnapshot = currentHistory.snapshots[currentHistory.snapshots.length - 1];
                        const aOdds = lastSnapshot.horses.find(h => h.numero === a[0])?.cote || 999;
                        const bOdds = lastSnapshot.horses.find(h => h.numero === b[0])?.cote || 999;
                        return aOdds - bOdds;
                      })
                      .map(([numero, name]) => {
                        const firstOdds = currentHistory.snapshots[0].horses.find(h => h.numero === numero)?.cote;
                        const lastOdds = currentHistory.snapshots[currentHistory.snapshots.length - 1].horses.find(h => h.numero === numero)?.cote;
                        const totalChange = firstOdds && lastOdds ? lastOdds - firstOdds : null;
                        const arriveePosition = arriveePositions.indexOf(numero);
                        const isInArrivee = arriveePosition !== -1;

                        return (
                          <tr 
                            key={numero} 
                            className={`border-b border-border/50 hover:bg-muted/50 ${
                              isInArrivee ? 'bg-green-500/5' : ''
                            }`}
                          >
                            <td className="py-2 px-2">
                              <Badge 
                                variant={isInArrivee ? 'default' : 'outline'}
                                className={isInArrivee && arriveePosition < 3 ? 'bg-yellow-500' : ''}
                              >
                                {isInArrivee && arriveePosition === 0 && <Medal className="w-3 h-3 mr-1" />}
                                {numero}
                              </Badge>
                            </td>
                            <td className="py-2 px-2 font-medium truncate max-w-[120px]" title={name}>
                              {name}
                            </td>
                            {currentHistory.arrivee && (
                              <td className="text-center py-2 px-2">
                                {isInArrivee ? (
                                  <Badge 
                                    variant="secondary" 
                                    className={
                                      arriveePosition === 0 ? 'bg-yellow-500 text-yellow-950' :
                                      arriveePosition === 1 ? 'bg-gray-300 text-gray-800' :
                                      arriveePosition === 2 ? 'bg-amber-600 text-amber-50' :
                                      ''
                                    }
                                  >
                                    {arriveePosition === 0 ? '🥇 1er' : 
                                     arriveePosition === 1 ? '🥈 2e' : 
                                     arriveePosition === 2 ? '🥉 3e' : 
                                     `${arriveePosition + 1}e`}
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </td>
                            )}
                            {currentHistory.snapshots.map((snapshot, i) => {
                              const horse = snapshot.horses.find(h => h.numero === numero);
                              const prevSnapshot = i > 0 ? currentHistory.snapshots[i - 1] : null;
                              const prevOdds = prevSnapshot?.horses.find(h => h.numero === numero)?.cote;
                              
                              let bgClass = '';
                              if (prevOdds && horse) {
                                if (horse.cote < prevOdds) bgClass = 'bg-green-500/10';
                                else if (horse.cote > prevOdds) bgClass = 'bg-red-500/10';
                              }

                              return (
                                <td key={i} className={`text-center py-2 px-2 ${bgClass}`}>
                                  {horse ? horse.cote.toFixed(1) : '-'}
                                </td>
                              );
                            })}
                            <td className={`text-center py-2 px-2 font-bold ${
                              totalChange !== null && totalChange < 0 
                                ? 'text-green-500' 
                                : totalChange !== null && totalChange > 0 
                                  ? 'text-red-500' 
                                  : ''
                            }`}>
                              {totalChange !== null 
                                ? `${totalChange > 0 ? '+' : ''}${totalChange.toFixed(1)}`
                                : '-'
                              }
                            </td>
                          </tr>
                        );
                      });
                  })()}
                </tbody>
              </table>
            </div>
            
            {/* Arrivee Analysis Summary */}
            {currentHistory.arrivee && (
              <div className="mt-6 p-4 rounded-lg bg-muted/50 border">
                <h4 className="font-semibold flex items-center gap-2 mb-3">
                  <Trophy className="w-4 h-4 text-yellow-500" />
                  Analyse de l'Arrivée
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                  {currentHistory.arrivee.positions.slice(0, 3).map((horseNum, idx) => {
                    const horseName = (() => {
                      for (const snap of currentHistory.snapshots) {
                        const h = snap.horses.find(h => h.numero === horseNum);
                        if (h) return h.name;
                      }
                      return `Cheval ${horseNum}`;
                    })();
                    const firstOdds = currentHistory.snapshots[0].horses.find(h => h.numero === horseNum)?.cote;
                    const lastOdds = currentHistory.snapshots[currentHistory.snapshots.length - 1].horses.find(h => h.numero === horseNum)?.cote;
                    const evolution = firstOdds && lastOdds ? lastOdds - firstOdds : null;
                    
                    return (
                      <div key={idx} className="flex flex-col gap-1 p-3 rounded-lg bg-background">
                        <div className="flex items-center gap-2">
                          <Badge className={
                            idx === 0 ? 'bg-yellow-500' :
                            idx === 1 ? 'bg-gray-400' :
                            'bg-amber-600'
                          }>
                            {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'} N°{horseNum}
                          </Badge>
                        </div>
                        <span className="font-medium truncate" title={horseName}>{horseName}</span>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Cote initiale:</span>
                          <span>{firstOdds?.toFixed(1) || '-'}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Cote finale:</span>
                          <span>{lastOdds?.toFixed(1) || '-'}</span>
                        </div>
                        {evolution !== null && (
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Évolution:</span>
                            <span className={evolution < 0 ? 'text-green-500 font-bold' : evolution > 0 ? 'text-red-500' : ''}>
                              {evolution > 0 ? '+' : ''}{evolution.toFixed(1)}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Statistics Summary - Total + and - */}
            {(() => {
              // Calculate total variations
              const allHorses = new Map<number, { name: string; firstOdds: number; lastOdds: number }>();
              currentHistory.snapshots.forEach(s => {
                s.horses.forEach(h => {
                  if (!allHorses.has(h.numero)) {
                    const firstOdds = currentHistory.snapshots[0].horses.find(fh => fh.numero === h.numero)?.cote || 0;
                    const lastOdds = currentHistory.snapshots[currentHistory.snapshots.length - 1].horses.find(lh => lh.numero === h.numero)?.cote || 0;
                    allHorses.set(h.numero, { name: h.name, firstOdds, lastOdds });
                  }
                });
              });

              let totalPositive = 0;
              let totalNegative = 0;
              let countPositive = 0;
              let countNegative = 0;
              const horsesWithChanges: Array<{ numero: number; name: string; change: number; lastOdds: number }> = [];

              allHorses.forEach((data, numero) => {
                const change = data.lastOdds - data.firstOdds;
                if (change > 0) {
                  totalPositive += change;
                  countPositive++;
                } else if (change < 0) {
                  totalNegative += change;
                  countNegative++;
                }
                horsesWithChanges.push({ numero, name: data.name, change, lastOdds: data.lastOdds });
              });

              // Sort by latest odds (favorites first)
              const sortedByOdds = [...horsesWithChanges].sort((a, b) => a.lastOdds - b.lastOdds);
              const top8 = sortedByOdds.slice(0, 8);
              
              // Generate 6 couples from top 8
              const couples: string[] = [];
              for (let i = 0; i < Math.min(top8.length, 4); i++) {
                for (let j = i + 1; j < Math.min(top8.length, 5); j++) {
                  if (couples.length < 6) {
                    couples.push(`${top8[i].numero}-${top8[j].numero}`);
                  }
                }
              }

              // Top 3 simple gagnant (best odds with negative or stable variation)
              const top3Winners = sortedByOdds
                .filter(h => h.change <= 0)
                .slice(0, 3);

              return (
                <div className="mt-6 space-y-4">
                  {/* Total Variations Summary */}
                  <div className="p-4 rounded-lg border bg-gradient-to-r from-green-500/5 to-red-500/5">
                    <h4 className="font-semibold flex items-center gap-2 mb-4">
                      <BarChart3 className="w-4 h-4 text-primary" />
                      Résumé des Variations (Total + / -)
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                        <div className="flex items-center gap-2 text-green-600 mb-1">
                          <TrendingDown className="w-4 h-4" />
                          <span className="text-xs font-medium">Baisses</span>
                        </div>
                        <div className="text-2xl font-bold text-green-600">{totalNegative.toFixed(1)}</div>
                        <div className="text-xs text-muted-foreground">{countNegative} cheval(aux)</div>
                      </div>
                      <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                        <div className="flex items-center gap-2 text-red-600 mb-1">
                          <TrendingUp className="w-4 h-4" />
                          <span className="text-xs font-medium">Hausses</span>
                        </div>
                        <div className="text-2xl font-bold text-red-600">+{totalPositive.toFixed(1)}</div>
                        <div className="text-xs text-muted-foreground">{countPositive} cheval(aux)</div>
                      </div>
                      <div className="p-3 rounded-lg bg-muted border">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                          <BarChart3 className="w-4 h-4" />
                          <span className="text-xs font-medium">Bilan Net</span>
                        </div>
                        <div className={`text-2xl font-bold ${
                          (totalPositive + totalNegative) > 0 ? 'text-red-600' : 
                          (totalPositive + totalNegative) < 0 ? 'text-green-600' : ''
                        }`}>
                          {(totalPositive + totalNegative) > 0 ? '+' : ''}{(totalPositive + totalNegative).toFixed(1)}
                        </div>
                        <div className="text-xs text-muted-foreground">pts total</div>
                      </div>
                      <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                        <div className="flex items-center gap-2 text-primary mb-1">
                          <History className="w-4 h-4" />
                          <span className="text-xs font-medium">Relevés</span>
                        </div>
                        <div className="text-2xl font-bold text-primary">{currentHistory.snapshots.length}</div>
                        <div className="text-xs text-muted-foreground">enregistrés</div>
                      </div>
                    </div>
                  </div>

                  {/* Top 8 Selection */}
                  <div className="p-4 rounded-lg border bg-muted/30">
                    <h4 className="font-semibold flex items-center gap-2 mb-3">
                      <Target className="w-4 h-4 text-primary" />
                      Sélection Top 8 Chevaux (par cote)
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {top8.map((horse, idx) => (
                        <Badge 
                          key={horse.numero} 
                          variant={idx < 3 ? 'default' : 'secondary'}
                          className={`text-sm py-1.5 px-3 ${
                            idx === 0 ? 'bg-yellow-500 text-yellow-950' :
                            idx === 1 ? 'bg-gray-400 text-gray-950' :
                            idx === 2 ? 'bg-amber-600 text-amber-50' : ''
                          }`}
                        >
                          N°{horse.numero}
                          <span className="ml-1 opacity-70">({horse.lastOdds.toFixed(1)})</span>
                          {horse.change !== 0 && (
                            <span className={`ml-1 text-xs ${
                              horse.change < 0 ? 'text-green-300' : 'text-red-300'
                            }`}>
                              {horse.change > 0 ? '+' : ''}{horse.change.toFixed(1)}
                            </span>
                          )}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* 6 Couples Possibles */}
                  <div className="p-4 rounded-lg border bg-blue-500/5">
                    <h4 className="font-semibold flex items-center gap-2 mb-3">
                      <Sparkles className="w-4 h-4 text-blue-500" />
                      6 Couplés Possibles (Top Favoris)
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {couples.map((couple, idx) => (
                        <Badge 
                          key={couple} 
                          variant="outline"
                          className="text-sm py-1.5 px-3 border-blue-500/30 bg-blue-500/10"
                        >
                          <span className="text-blue-600 font-mono font-bold">{couple}</span>
                        </Badge>
                      ))}
                    </div>
                    {couples.length === 0 && (
                      <p className="text-sm text-muted-foreground">Pas assez de chevaux pour générer des couplés</p>
                    )}
                  </div>

                  {/* Top 3 Simple Gagnant */}
                  <div className="p-4 rounded-lg border bg-yellow-500/5">
                    <h4 className="font-semibold flex items-center gap-2 mb-3">
                      <Trophy className="w-4 h-4 text-yellow-500" />
                      Top 3 Simple Gagnant (Favoris en baisse/stable)
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {top3Winners.map((horse, idx) => (
                        <div 
                          key={horse.numero}
                          className={`p-3 rounded-lg border ${
                            idx === 0 ? 'bg-yellow-500/10 border-yellow-500/30' :
                            idx === 1 ? 'bg-gray-200/50 border-gray-400/30 dark:bg-gray-700/30' :
                            'bg-amber-600/10 border-amber-600/30'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={
                              idx === 0 ? 'bg-yellow-500' :
                              idx === 1 ? 'bg-gray-400' :
                              'bg-amber-600'
                            }>
                              {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'} N°{horse.numero}
                            </Badge>
                          </div>
                          <p className="text-sm font-medium truncate" title={horse.name}>{horse.name}</p>
                          <div className="flex justify-between text-xs mt-1">
                            <span className="text-muted-foreground">Cote:</span>
                            <span className="font-bold">{horse.lastOdds.toFixed(1)}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Évolution:</span>
                            <span className={horse.change < 0 ? 'text-green-600 font-bold' : ''}>
                              {horse.change === 0 ? '=' : `${horse.change > 0 ? '+' : ''}${horse.change.toFixed(1)}`}
                            </span>
                          </div>
                        </div>
                      ))}
                      {top3Winners.length === 0 && (
                        <p className="text-sm text-muted-foreground col-span-3">Aucun favori en baisse ou stable</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}

      {/* Global History Statistics from all saved races with arrivals */}
      {oddsHistory.filter(r => r.arrivee).length > 0 && (
        <Card className="border-purple-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5 text-purple-500" />
              Historique Global des Courses (avec arrivées)
              <Badge variant="secondary" className="ml-2">
                {oddsHistory.filter(r => r.arrivee).length} course(s)
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const racesWithArrivee = oddsHistory.filter(r => r.arrivee && r.snapshots.length > 1);
              
              // Calculate statistics across all races
              let globalStats = {
                totalRaces: racesWithArrivee.length,
                winnersWithNegativeTrend: 0,
                winnersWithPositiveTrend: 0,
                winnersStable: 0,
                avgWinnerOdds: 0,
                top3InFavorites: 0,
              };

              racesWithArrivee.forEach(race => {
                if (!race.arrivee) return;
                const winner = race.arrivee.positions[0];
                const firstOdds = race.snapshots[0].horses.find(h => h.numero === winner)?.cote || 0;
                const lastOdds = race.snapshots[race.snapshots.length - 1].horses.find(h => h.numero === winner)?.cote || 0;
                const change = lastOdds - firstOdds;

                if (change < 0) globalStats.winnersWithNegativeTrend++;
                else if (change > 0) globalStats.winnersWithPositiveTrend++;
                else globalStats.winnersStable++;

                globalStats.avgWinnerOdds += lastOdds;

                // Check if winner was in top 5 favorites
                const lastSnapshot = race.snapshots[race.snapshots.length - 1];
                const sortedByOdds = [...lastSnapshot.horses].sort((a, b) => a.cote - b.cote);
                const winnerPosition = sortedByOdds.findIndex(h => h.numero === winner);
                if (winnerPosition !== -1 && winnerPosition < 5) {
                  globalStats.top3InFavorites++;
                }
              });

              if (globalStats.totalRaces > 0) {
                globalStats.avgWinnerOdds /= globalStats.totalRaces;
              }

              return (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <div className="p-3 rounded-lg bg-muted border text-center">
                      <div className="text-2xl font-bold text-primary">{globalStats.totalRaces}</div>
                      <div className="text-xs text-muted-foreground">Courses analysées</div>
                    </div>
                    <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-center">
                      <div className="text-2xl font-bold text-green-600">{globalStats.winnersWithNegativeTrend}</div>
                      <div className="text-xs text-muted-foreground">Gagnants en baisse</div>
                    </div>
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-center">
                      <div className="text-2xl font-bold text-red-600">{globalStats.winnersWithPositiveTrend}</div>
                      <div className="text-xs text-muted-foreground">Gagnants en hausse</div>
                    </div>
                    <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-center">
                      <div className="text-2xl font-bold text-yellow-600">
                        {globalStats.avgWinnerOdds.toFixed(1)}
                      </div>
                      <div className="text-xs text-muted-foreground">Cote moy. gagnant</div>
                    </div>
                    <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20 text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {globalStats.totalRaces > 0 ? Math.round((globalStats.top3InFavorites / globalStats.totalRaces) * 100) : 0}%
                      </div>
                      <div className="text-xs text-muted-foreground">Favoris gagnants</div>
                    </div>
                  </div>

                  {/* Recent Races List */}
                  <div className="mt-4">
                    <h5 className="text-sm font-medium mb-2 text-muted-foreground">Dernières courses enregistrées:</h5>
                    <ScrollArea className="h-[150px]">
                      <div className="space-y-2">
                        {racesWithArrivee.slice(-10).reverse().map((race, idx) => {
                          const winner = race.arrivee?.positions[0];
                          const winnerHorse = race.snapshots[race.snapshots.length - 1].horses.find(h => h.numero === winner);
                          const firstOdds = race.snapshots[0].horses.find(h => h.numero === winner)?.cote || 0;
                          const lastOdds = winnerHorse?.cote || 0;
                          const change = lastOdds - firstOdds;

                          return (
                            <div 
                              key={idx} 
                              className="flex items-center justify-between p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                              onClick={() => {
                                setDate(race.date);
                                setReunion(race.reunion);
                                setCourse(race.course);
                                toast.info(`Course R${race.reunion}C${race.course} chargée`);
                              }}
                            >
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="font-mono">
                                  R{race.reunion}C{race.course}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {race.date.slice(0, 2)}/{race.date.slice(2, 4)}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="bg-yellow-500/20">
                                  🏆 N°{winner}
                                </Badge>
                                <span className="text-sm font-medium">{lastOdds.toFixed(1)}</span>
                                <span className={`text-xs ${change < 0 ? 'text-green-500' : change > 0 ? 'text-red-500' : ''}`}>
                                  ({change > 0 ? '+' : ''}{change.toFixed(1)})
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  </div>

                  {/* Historique Couplés et Tiercés */}
                  {/* Pronostics Suggérés - based on history + current race */}
                  <HistoricalPronosticsPanel 
                    oddsHistory={oddsHistory}
                    currentSnapshots={currentHistory?.snapshots}
                    currentArrivee={currentHistory?.arrivee}
                    date={date}
                    reunion={reunion}
                    course={course}
                  />

                  <div className="mt-6 p-4 rounded-lg border bg-gradient-to-r from-blue-500/5 to-purple-500/5">
                    <h4 className="font-semibold flex items-center gap-2 mb-4">
                      <Sparkles className="w-4 h-4 text-blue-500" />
                      Historique Couplés & Tiercés (Numéros Hausse/Baisse)
                    </h4>
                    
                    {(() => {
                      // Analyze all couples and trifectas from history
                      interface HorseStats {
                        numero: number;
                        wins: number;
                        places: number; // Top 3
                        top5: number;
                        avgOdds: number;
                        totalBaisse: number;
                        totalHausse: number;
                        occurrencesInBaisse: number;
                        occurrencesInHausse: number;
                      }
                      
                      const horseStatsMap = new Map<number, HorseStats>();
                      const coupleStats = new Map<string, { count: number; wins: number; trend: 'hausse' | 'baisse' | 'mixed' }>();
                      const tierceStats = new Map<string, { count: number; wins: number; avgTrend: number }>();

                      racesWithArrivee.forEach(race => {
                        if (!race.arrivee || race.snapshots.length < 2) return;
                        
                        const firstSnapshot = race.snapshots[0];
                        const lastSnapshot = race.snapshots[race.snapshots.length - 1];
                        const positions = race.arrivee.positions;
                        
                        // Calculate horse trends for this race
                        const horseTrends = new Map<number, { change: number; lastOdds: number }>();
                        lastSnapshot.horses.forEach(horse => {
                          const firstOdds = firstSnapshot.horses.find(h => h.numero === horse.numero)?.cote || horse.cote;
                          const change = horse.cote - firstOdds;
                          horseTrends.set(horse.numero, { change, lastOdds: horse.cote });
                          
                          // Update individual horse stats
                          if (!horseStatsMap.has(horse.numero)) {
                            horseStatsMap.set(horse.numero, {
                              numero: horse.numero,
                              wins: 0,
                              places: 0,
                              top5: 0,
                              avgOdds: 0,
                              totalBaisse: 0,
                              totalHausse: 0,
                              occurrencesInBaisse: 0,
                              occurrencesInHausse: 0,
                            });
                          }
                          const stats = horseStatsMap.get(horse.numero)!;
                          const posIdx = positions.indexOf(horse.numero);
                          if (posIdx === 0) stats.wins++;
                          if (posIdx >= 0 && posIdx < 3) stats.places++;
                          if (posIdx >= 0 && posIdx < 5) stats.top5++;
                          if (change < 0) {
                            stats.totalBaisse += Math.abs(change);
                            stats.occurrencesInBaisse++;
                          } else if (change > 0) {
                            stats.totalHausse += change;
                            stats.occurrencesInHausse++;
                          }
                        });

                        // Extract couples from Top 3 arrivals
                        if (positions.length >= 2) {
                          const couple1 = [positions[0], positions[1]].sort((a, b) => a - b).join('-');
                          const key1 = couple1;
                          if (!coupleStats.has(key1)) {
                            coupleStats.set(key1, { count: 0, wins: 0, trend: 'mixed' });
                          }
                          const cs1 = coupleStats.get(key1)!;
                          cs1.count++;
                          cs1.wins++;
                          
                          // Determine trend of the couple
                          const t1 = horseTrends.get(positions[0])?.change || 0;
                          const t2 = horseTrends.get(positions[1])?.change || 0;
                          if (t1 < 0 && t2 < 0) cs1.trend = 'baisse';
                          else if (t1 > 0 && t2 > 0) cs1.trend = 'hausse';
                          else cs1.trend = 'mixed';
                        }

                        // Extract trifectas from Top 3 arrivals
                        if (positions.length >= 3) {
                          const tierce = [positions[0], positions[1], positions[2]].sort((a, b) => a - b).join('-');
                          if (!tierceStats.has(tierce)) {
                            tierceStats.set(tierce, { count: 0, wins: 0, avgTrend: 0 });
                          }
                          const ts = tierceStats.get(tierce)!;
                          ts.count++;
                          ts.wins++;
                          
                          // Average trend
                          const t1 = horseTrends.get(positions[0])?.change || 0;
                          const t2 = horseTrends.get(positions[1])?.change || 0;
                          const t3 = horseTrends.get(positions[2])?.change || 0;
                          ts.avgTrend = (t1 + t2 + t3) / 3;
                        }
                      });

                      // Convert to arrays and sort
                      const horsesInBaisse = Array.from(horseStatsMap.values())
                        .filter(h => h.occurrencesInBaisse > 0)
                        .sort((a, b) => b.wins - a.wins || b.totalBaisse - a.totalBaisse)
                        .slice(0, 8);
                      
                      const horsesInHausse = Array.from(horseStatsMap.values())
                        .filter(h => h.occurrencesInHausse > 0)
                        .sort((a, b) => b.wins - a.wins || b.totalHausse - a.totalHausse)
                        .slice(0, 8);

                      const topCouples = Array.from(coupleStats.entries())
                        .sort((a, b) => b[1].count - a[1].count)
                        .slice(0, 6);
                      
                      const topTierces = Array.from(tierceStats.entries())
                        .sort((a, b) => b[1].count - a[1].count)
                        .slice(0, 6);

                      // Calculate couples in baisse
                      const couplesInBaisse = topCouples.filter(([_, stats]) => stats.trend === 'baisse');
                      const couplesInHausse = topCouples.filter(([_, stats]) => stats.trend === 'hausse');

                      return (
                        <div className="space-y-4">
                          {/* Chevaux gagnants en baisse */}
                          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                            <h5 className="text-sm font-medium flex items-center gap-2 mb-2 text-green-600">
                              <TrendingDown className="w-4 h-4" />
                              Numéros Gagnants en Baisse de Cote
                            </h5>
                            <div className="flex flex-wrap gap-2">
                              {horsesInBaisse.length > 0 ? horsesInBaisse.map(horse => (
                                <Badge 
                                  key={horse.numero}
                                  variant="outline"
                                  className="border-green-500/30 bg-green-500/10 text-green-700"
                                >
                                  N°{horse.numero}
                                  <span className="ml-1 opacity-70">({horse.wins}🏆)</span>
                                  <span className="ml-1 text-xs text-green-500">-{horse.totalBaisse.toFixed(1)}</span>
                                </Badge>
                              )) : (
                                <span className="text-xs text-muted-foreground">Pas de données</span>
                              )}
                            </div>
                          </div>

                          {/* Chevaux gagnants en hausse */}
                          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                            <h5 className="text-sm font-medium flex items-center gap-2 mb-2 text-red-600">
                              <TrendingUp className="w-4 h-4" />
                              Numéros Gagnants en Hausse de Cote
                            </h5>
                            <div className="flex flex-wrap gap-2">
                              {horsesInHausse.length > 0 ? horsesInHausse.map(horse => (
                                <Badge 
                                  key={horse.numero}
                                  variant="outline"
                                  className="border-red-500/30 bg-red-500/10 text-red-700"
                                >
                                  N°{horse.numero}
                                  <span className="ml-1 opacity-70">({horse.wins}🏆)</span>
                                  <span className="ml-1 text-xs text-red-500">+{horse.totalHausse.toFixed(1)}</span>
                                </Badge>
                              )) : (
                                <span className="text-xs text-muted-foreground">Pas de données</span>
                              )}
                            </div>
                          </div>

                          {/* Top Couplés récurrents */}
                          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                            <h5 className="text-sm font-medium flex items-center gap-2 mb-2 text-blue-600">
                              <Sparkles className="w-4 h-4" />
                              Couplés Récurrents (Top 6)
                            </h5>
                            <div className="flex flex-wrap gap-2">
                              {topCouples.length > 0 ? topCouples.map(([couple, stats]) => (
                                <Badge 
                                  key={couple}
                                  variant="outline"
                                  className={`border-blue-500/30 ${
                                    stats.trend === 'baisse' ? 'bg-green-500/10 text-green-700' :
                                    stats.trend === 'hausse' ? 'bg-red-500/10 text-red-700' :
                                    'bg-blue-500/10 text-blue-700'
                                  }`}
                                >
                                  <span className="font-mono font-bold">{couple}</span>
                                  <span className="ml-1 opacity-70">×{stats.count}</span>
                                  {stats.trend === 'baisse' && <TrendingDown className="w-3 h-3 ml-1 text-green-500" />}
                                  {stats.trend === 'hausse' && <TrendingUp className="w-3 h-3 ml-1 text-red-500" />}
                                </Badge>
                              )) : (
                                <span className="text-xs text-muted-foreground">Pas de couplés enregistrés</span>
                              )}
                            </div>
                          </div>

                          {/* Top Tiercés récurrents */}
                          <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                            <h5 className="text-sm font-medium flex items-center gap-2 mb-2 text-purple-600">
                              <Medal className="w-4 h-4" />
                              Tiercés Récurrents (Top 6)
                            </h5>
                            <div className="flex flex-wrap gap-2">
                              {topTierces.length > 0 ? topTierces.map(([tierce, stats]) => (
                                <Badge 
                                  key={tierce}
                                  variant="outline"
                                  className={`border-purple-500/30 ${
                                    stats.avgTrend < 0 ? 'bg-green-500/10 text-green-700' :
                                    stats.avgTrend > 0 ? 'bg-red-500/10 text-red-700' :
                                    'bg-purple-500/10 text-purple-700'
                                  }`}
                                >
                                  <span className="font-mono font-bold">{tierce}</span>
                                  <span className="ml-1 opacity-70">×{stats.count}</span>
                                  {stats.avgTrend < 0 && <TrendingDown className="w-3 h-3 ml-1 text-green-500" />}
                                  {stats.avgTrend > 0 && <TrendingUp className="w-3 h-3 ml-1 text-red-500" />}
                                </Badge>
                              )) : (
                                <span className="text-xs text-muted-foreground">Pas de tiercés enregistrés</span>
                              )}
                            </div>
                          </div>

                          {/* Selection Top 8 & 6 Couplés basés sur historique */}
                          {horsesInBaisse.length > 0 && (
                            <div className="mt-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                              <h5 className="text-sm font-medium flex items-center gap-2 mb-2 text-yellow-600">
                                <Target className="w-4 h-4" />
                                Sélection Historique: Top 8 & 6 Couplés
                              </h5>
                              <div className="space-y-3">
                                <div>
                                  <span className="text-xs text-muted-foreground">Top 8 numéros (basé sur victoires + baisse):</span>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {horsesInBaisse.slice(0, 8).map((horse, idx) => (
                                      <Badge 
                                        key={horse.numero}
                                        className={`${
                                          idx === 0 ? 'bg-yellow-500 text-yellow-950' :
                                          idx === 1 ? 'bg-gray-400 text-gray-950' :
                                          idx === 2 ? 'bg-amber-600 text-amber-50' :
                                          'bg-secondary'
                                        }`}
                                      >
                                        N°{horse.numero}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                                <div>
                                  <span className="text-xs text-muted-foreground">6 Couplés suggérés:</span>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {(() => {
                                      const top = horsesInBaisse.slice(0, 5);
                                      const suggestedCouples: string[] = [];
                                      for (let i = 0; i < Math.min(top.length, 4); i++) {
                                        for (let j = i + 1; j < Math.min(top.length, 5); j++) {
                                          if (suggestedCouples.length < 6) {
                                            suggestedCouples.push(`${top[i].numero}-${top[j].numero}`);
                                          }
                                        }
                                      }
                                      return suggestedCouples.map(c => (
                                        <Badge key={c} variant="outline" className="border-yellow-500/30 bg-yellow-500/10 font-mono">
                                          {c}
                                        </Badge>
                                      ));
                                    })()}
                                  </div>
                                </div>
                                <div>
                                  <span className="text-xs text-muted-foreground">Top 3 Simple Gagnant:</span>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {horsesInBaisse.slice(0, 3).map((horse, idx) => (
                                      <Badge 
                                        key={horse.numero}
                                        className={`${
                                          idx === 0 ? 'bg-yellow-500 text-yellow-950' :
                                          idx === 1 ? 'bg-gray-400 text-gray-950' :
                                          'bg-amber-600 text-amber-50'
                                        }`}
                                      >
                                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'} N°{horse.numero}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Performance Evolution Chart */}
                  <RecurringNumbersChart oddsHistory={oddsHistory} />
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default OddsEvolutionTab;

