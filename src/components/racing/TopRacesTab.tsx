import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Loader2, RefreshCw, TrendingUp, Star, Target, CheckCircle, AlertCircle, XCircle, Bookmark, BookmarkCheck, CalendarIcon, Download } from 'lucide-react';
import { fetchPMUData } from '@/lib/pmu-api';
import { analyzeRace } from '@/lib/racing-logic';
import { Discipline } from '@/types/racing';
import { toast } from 'sonner';
import { useTopRacesCache, TopRaceResult } from '@/hooks/useTopRacesCache';
import { useSavedRaces } from '@/hooks/useSavedRaces';
import { getArriveePosition, getArriveeStyle, isInArrivee } from '@/lib/arrivee-utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ArriveeInputDialog } from './ArriveeInputDialog';

interface TopRacesTabProps {
  arrivee?: number[];
  onSelectRace?: (race: TopRaceResult) => void;
}

const TopRacesTab = ({ arrivee = [], onSelectRace }: TopRacesTabProps) => {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, status: '' });
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const { topRaces, setTopRaces, lastFetch } = useTopRacesCache();
  const { saveTopRace, isRaceSaved } = useSavedRaces();
  const [arriveeDialogOpen, setArriveeDialogOpen] = useState(false);
  const [selectedRaceForSave, setSelectedRaceForSave] = useState<TopRaceResult | null>(null);

  const formatDateForPMU = (date: Date): string => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}${month}${year}`;
  };

  const handleSaveClick = (race: TopRaceResult) => {
    setSelectedRaceForSave(race);
    setArriveeDialogOpen(true);
  };

  const handleSaveWithArrivee = (arriveeInput: number[]) => {
    if (selectedRaceForSave) {
      saveTopRace(selectedRaceForSave, arriveeInput);
      toast.success(`Course R${selectedRaceForSave.raceInfo.reunionNumber} C${selectedRaceForSave.raceInfo.raceNumber} sauvegardée`);
      setSelectedRaceForSave(null);
    }
  };

  // Determine discipline from PMU pace
  const getDiscipline = (pace?: string): Discipline => {
    if (!pace) return 'plat';
    const p = pace.toUpperCase();
    if (p.includes('TROT')) return 'trot';
    if (p.includes('OBSTACLE') || p.includes('HAIE') || p.includes('STEEPLE')) return 'obstacle';
    return 'plat';
  };

  // Fetch and analyze a single race
  const fetchAndAnalyzeRace = async (
    date: string, 
    reunion: number, 
    course: number
  ): Promise<TopRaceResult | null> => {
    try {
      const data = await fetchPMUData(date, reunion, course);
      
      if (!data || !data.success || !data.horses || data.horses.length < 4) {
        return null;
      }
      
      const horses = data.horses;
      const discipline = getDiscipline(horses[0]?.pace);
      
      // Convert PMU horses to RawHorseData format with names
      const rawData = horses.map((h: any) => ({
        numero: h.numero,
        name: h.name || '',
        cote: h.lastDirectRatio || h.cote || 99,
        musique: h.musique || ''
      }));
      
      if (rawData.length < 4) return null;
      
      // Analyze the race
      const analysis = analyzeRace(rawData, discipline);
      
      // Calculate average score of top 4
      const top4 = analysis.horses.slice(0, 4);
      const averageScore = top4.reduce((sum, h) => sum + h.scoreTotal, 0) / top4.length;
      
      return {
        raceInfo: {
          reunionNumber: reunion,
          raceNumber: course,
          hippodrome: data.hippodrome || `Réunion ${reunion}`,
          discipline
        },
        top4,
        averageScore,
        difficultyScore: analysis.difficultyScore,
        difficulty: analysis.difficulty,
        analysis
      };
    } catch {
      return null;
    }
  };

  // Main fetch function
  const fetchAllRaces = async () => {
    setLoading(true);
    setProgress({ current: 0, total: 0, status: 'Recherche des réunions...' });
    
    const date = formatDateForPMU(selectedDate);
    const allRaces: TopRaceResult[] = [];
    
    try {
      // Scan all reunions and courses
      let totalScanned = 0;
      const maxReunions = 10;
      const maxCourses = 12;
      const estimatedTotal = maxReunions * maxCourses;
      
      for (let reunion = 1; reunion <= maxReunions; reunion++) {
        let reunionHasRaces = false;
        
        for (let course = 1; course <= maxCourses; course++) {
          totalScanned++;
          setProgress({ 
            current: totalScanned, 
            total: estimatedTotal, 
            status: `R${reunion} C${course} - Analyse en cours...` 
          });
          
          const result = await fetchAndAnalyzeRace(date, reunion, course);
          
          if (result) {
            reunionHasRaces = true;
            allRaces.push(result);
          } else if (course === 1 && !reunionHasRaces) {
            // If first course doesn't exist, skip this reunion
            break;
          }
          
          // Small delay to avoid rate limiting
          await new Promise(r => setTimeout(r, 100));
        }
      }
      
      // Sort by average score (descending)
      allRaces.sort((a, b) => b.averageScore - a.averageScore);
      
      setProgress({ current: totalScanned, total: totalScanned, status: 'Terminé!' });
      setTopRaces(allRaces);
      
      if (allRaces.length === 0) {
        toast.info('Aucune course trouvée pour cette date');
      } else {
        toast.success(`${allRaces.length} course(s) analysée(s) !`);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des courses:', error);
      toast.error('Erreur lors de la récupération des données PMU');
    } finally {
      setLoading(false);
    }
  };

  const getDifficultyBadge = (difficulty: 'easy' | 'medium' | 'hard') => {
    switch (difficulty) {
      case 'easy':
        return (
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500">
            <CheckCircle className="w-3 h-3 mr-1" />
            Facile
          </Badge>
        );
      case 'medium':
        return (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500">
            <AlertCircle className="w-3 h-3 mr-1" />
            Moyen
          </Badge>
        );
      case 'hard':
        return (
          <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500">
            <XCircle className="w-3 h-3 mr-1" />
            Difficile
          </Badge>
        );
    }
  };

  const getPositionColor = (index: number, horseNumero: number): string => {
    if (arrivee.length > 0 && isInArrivee(horseNumero, arrivee)) {
      const pos = getArriveePosition(horseNumero, arrivee);
      const style = getArriveeStyle(pos);
      return `${style.background} ${style.border} ${style.text}`;
    }
    
    switch (index) {
      case 0: return 'bg-amber-500/20 border-amber-500 text-amber-400';
      case 1: return 'bg-slate-400/20 border-slate-400 text-slate-300';
      case 2: return 'bg-orange-600/20 border-orange-600 text-orange-400';
      case 3: return 'bg-blue-500/20 border-blue-500 text-blue-400';
      default: return 'bg-muted border-border text-muted-foreground';
    }
  };

  const getDisciplineLabel = (discipline: Discipline) => {
    switch (discipline) {
      case 'trot': return 'Trot';
      case 'obstacle': return 'Obstacle';
      default: return 'Plat';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-card border-border">
        <CardHeader className="flex flex-col gap-4">
          <div className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Classement Général des Courses
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Toutes les courses du jour classées par potentiel et indice de confiance
              </p>
            </div>
            <Button 
              onClick={fetchAllRaces} 
              disabled={loading}
              className="bg-primary hover:bg-primary/90"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyse...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Analyser les réunions
                </>
              )}
            </Button>
          </div>
          
          {/* Date Picker */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Date:</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <CalendarIcon className="w-4 h-4" />
                  {format(selectedDate, 'dd MMMM yyyy', { locale: fr })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  locale={fr}
                  disabled={(date) => date > new Date()}
                />
              </PopoverContent>
            </Popover>
          </div>
        </CardHeader>
        
        {loading && (
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{progress.status}</span>
                <span className="text-primary">{progress.current}/{progress.total}</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }}
                />
              </div>
            </div>
          </CardContent>
        )}
        
        {lastFetch && !loading && (
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground">
              Dernière mise à jour: {lastFetch.toLocaleTimeString('fr-FR')}
            </p>
          </CardContent>
        )}
      </Card>

      {/* Results */}
      {topRaces.length === 0 && !loading ? (
        <Card className="bg-card border-border">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Star className="w-16 h-16 text-muted-foreground/30 mb-4" />
            <h3 className="text-xl font-semibold text-muted-foreground mb-2">
              Aucune course analysée
            </h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              Cliquez sur "Analyser les réunions" pour scanner toutes les courses du jour 
              et obtenir leur classement par potentiel.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {topRaces.map((race, idx) => {
            const isSaved = isRaceSaved(race.raceInfo.reunionNumber, race.raceInfo.raceNumber, race.difficulty);
            
            return (
            <Card key={`${race.raceInfo.reunionNumber}-${race.raceInfo.raceNumber}-${idx}`} className="bg-card border-border hover:border-primary/50 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary">
                      R{race.raceInfo.reunionNumber} C{race.raceInfo.raceNumber}
                    </Badge>
                    {getDifficultyBadge(race.difficulty)}
                  </div>
                  <div className="flex items-center gap-2">
                    {onSelectRace && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1 text-xs"
                        onClick={() => onSelectRace(race)}
                      >
                        <Download className="w-3.5 h-3.5" />
                        Importer
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`h-8 w-8 ${isSaved ? 'text-primary' : 'text-muted-foreground hover:text-primary'}`}
                      onClick={() => handleSaveClick(race)}
                      disabled={isSaved}
                    >
                      {isSaved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                    </Button>
                    <Badge variant="outline" className="text-xs">
                      {getDisciplineLabel(race.raceInfo.discipline)}
                    </Badge>
                  </div>
                </div>
                {race.raceInfo.hippodrome && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {race.raceInfo.hippodrome}
                  </p>
                )}
              </CardHeader>
              
              <CardContent className="space-y-2">
                <div className="flex justify-between items-center text-xs text-muted-foreground mb-2">
                  <span>Score moyen Top 4: <strong className="text-primary">{race.averageScore.toFixed(1)}</strong></span>
                  <span>Difficulté: {race.difficultyScore}</span>
                </div>
                
                {race.top4.map((horse, horseIdx) => {
                  const inArrivee = arrivee.length > 0 && isInArrivee(horse.numero, arrivee);
                  const arriveePos = inArrivee ? getArriveePosition(horse.numero, arrivee) : -1;
                  const arriveeStyle = arriveePos > 0 ? getArriveeStyle(arriveePos) : null;
                  
                  return (
                    <div 
                      key={horse.numero}
                      className={`flex items-center justify-between p-3 rounded-lg border ${getPositionColor(horseIdx, horse.numero)}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`text-lg font-bold w-8 text-center ${inArrivee ? 'ring-2 ring-offset-1 ring-offset-background rounded-md px-1' : ''} ${arriveeStyle?.text || ''}`}>
                          {horse.numero}
                        </span>
                        <div className="flex flex-col">
                          {horse.name && (
                            <span className="text-sm font-medium truncate max-w-[140px]">
                              {horse.name}
                            </span>
                          )}
                          <span className="text-xs opacity-70">
                            Cote: {horse.cote.toFixed(1)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {arriveeStyle && (
                          <Badge className={`${arriveeStyle.background} ${arriveeStyle.text} border ${arriveeStyle.border} text-xs`}>
                            {arriveeStyle.badge}
                          </Badge>
                        )}
                        <div className="text-right">
                          <div className="text-sm font-semibold">
                            Score: {horse.scoreTotal}
                          </div>
                          {horse.label !== 'NEUTRE' && (
                            <Badge variant="outline" className="text-[10px] mt-1">
                              {horse.label}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
            );
          })}
        </div>
      )}

      {/* Arrivee Input Dialog */}
      {selectedRaceForSave && (
        <ArriveeInputDialog
          open={arriveeDialogOpen}
          onOpenChange={setArriveeDialogOpen}
          raceInfo={selectedRaceForSave.raceInfo}
          top4={selectedRaceForSave.top4}
          onSave={handleSaveWithArrivee}
        />
      )}
    </div>
  );
};

export default TopRacesTab;
