
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bookmark, Trash2, Trophy, Star, CheckCircle, AlertCircle, XCircle, TrendingUp, Target, Percent } from 'lucide-react';
import { useSavedRaces, SavedRace } from '@/hooks/useSavedRaces';
import { toast } from 'sonner';

// Calculate success stats for a single race
const calculateRaceStats = (race: SavedRace) => {
  if (!race.arrivee || race.arrivee.length === 0) {
    return null;
  }
  
  const top4Numbers = race.top4.map(h => h.numero);
  const arrivee4 = race.arrivee.slice(0, 4);
  
  // How many of our TOP 4 are in the actual TOP 4 arrivee
  const matchedInTop4 = top4Numbers.filter(num => arrivee4.includes(num)).length;
  
  // Did our 1st pick win?
  const firstPickWon = top4Numbers[0] === arrivee4[0];
  
  // Did our 1st pick place (1-3)?
  const firstPickPlaced = arrivee4.slice(0, 3).includes(top4Numbers[0]);
  
  return {
    matchedInTop4,
    matchedPercent: (matchedInTop4 / 4) * 100,
    firstPickWon,
    firstPickPlaced
  };
};

const SavedRacesPanel = () => {
  const { savedRaces, deleteRace, clearAll } = useSavedRaces();

  // Calculate global statistics
  const globalStats = useMemo(() => {
    const racesWithArrivee = savedRaces.filter(r => r.arrivee && r.arrivee.length >= 4);
    
    if (racesWithArrivee.length === 0) {
      return null;
    }

    let totalMatched = 0;
    let totalPossible = 0;
    let firstPickWins = 0;
    let firstPickPlacements = 0;
    let easyRacesMatched = 0;
    let easyRacesTotal = 0;
    let topRacesMatched = 0;
    let topRacesTotal = 0;

    racesWithArrivee.forEach(race => {
      const stats = calculateRaceStats(race);
      if (stats) {
        totalMatched += stats.matchedInTop4;
        totalPossible += 4;
        if (stats.firstPickWon) firstPickWins++;
        if (stats.firstPickPlaced) firstPickPlacements++;
        
        if (race.type === 'easy') {
          easyRacesMatched += stats.matchedInTop4;
          easyRacesTotal += 4;
        } else {
          topRacesMatched += stats.matchedInTop4;
          topRacesTotal += 4;
        }
      }
    });

    return {
      totalRaces: racesWithArrivee.length,
      globalSuccessRate: totalPossible > 0 ? (totalMatched / totalPossible) * 100 : 0,
      avgMatchedPerRace: totalPossible > 0 ? totalMatched / racesWithArrivee.length : 0,
      firstPickWinRate: (firstPickWins / racesWithArrivee.length) * 100,
      firstPickPlacementRate: (firstPickPlacements / racesWithArrivee.length) * 100,
      easySuccessRate: easyRacesTotal > 0 ? (easyRacesMatched / easyRacesTotal) * 100 : null,
      topSuccessRate: topRacesTotal > 0 ? (topRacesMatched / topRacesTotal) * 100 : null,
      easyRacesCount: savedRaces.filter(r => r.type === 'easy' && r.arrivee?.length).length,
      topRacesCount: savedRaces.filter(r => r.type === 'top' && r.arrivee?.length).length
    };
  }, [savedRaces]);

  const handleDelete = (id: string, raceInfo: SavedRace['raceInfo']) => {
    deleteRace(id);
    toast.success(`Course R${raceInfo.reunionNumber} C${raceInfo.raceNumber} supprimée`);
  };

  const handleClearAll = () => {
    if (savedRaces.length === 0) return;
    clearAll();
    toast.success('Toutes les courses sauvegardées ont été supprimées');
  };

  const getDifficultyBadge = (difficulty?: 'easy' | 'medium' | 'hard') => {
    switch (difficulty) {
      case 'easy':
        return (
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500 text-xs">
            <CheckCircle className="w-3 h-3 mr-1" />
            Facile
          </Badge>
        );
      case 'medium':
        return (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500 text-xs">
            <AlertCircle className="w-3 h-3 mr-1" />
            Moyen
          </Badge>
        );
      case 'hard':
        return (
          <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500 text-xs">
            <XCircle className="w-3 h-3 mr-1" />
            Difficile
          </Badge>
        );
      default:
        return null;
    }
  };

  const getDisciplineLabel = (discipline: string) => {
    switch (discipline) {
      case 'trot': return 'Trot';
      case 'obstacle': return 'Obstacle';
      default: return 'Plat';
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSuccessColor = (percent: number) => {
    if (percent >= 75) return 'text-emerald-400';
    if (percent >= 50) return 'text-amber-400';
    return 'text-red-400';
  };

  if (savedRaces.length === 0) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Bookmark className="w-12 h-12 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-semibold text-muted-foreground mb-2">
            Aucune course sauvegardée
          </h3>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            Utilisez le bouton <Bookmark className="w-4 h-4 inline mx-1" /> dans les onglets "Couplés Facile" 
            ou "Top Courses" pour sauvegarder des courses.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Statistics Card */}
      {globalStats && (
        <Card className="bg-gradient-to-br from-primary/10 via-card to-emerald-500/10 border-primary/30">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="w-5 h-5 text-primary" />
              Statistiques de Réussite
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Global Success Rate */}
              <div className="bg-card/50 rounded-lg p-3 text-center border border-border">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Percent className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Taux global</span>
                </div>
                <div className={`text-2xl font-bold ${getSuccessColor(globalStats.globalSuccessRate)}`}>
                  {globalStats.globalSuccessRate.toFixed(0)}%
                </div>
                <div className="text-xs text-muted-foreground">
                  ~{globalStats.avgMatchedPerRace.toFixed(1)} chevaux/course
                </div>
              </div>
              
              {/* First Pick Win Rate */}
              <div className="bg-card/50 rounded-lg p-3 text-center border border-border">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span className="text-xs text-muted-foreground">1er Gagnant</span>
                </div>
                <div className={`text-2xl font-bold ${getSuccessColor(globalStats.firstPickWinRate)}`}>
                  {globalStats.firstPickWinRate.toFixed(0)}%
                </div>
                <div className="text-xs text-muted-foreground">
                  1er choix = 1er
                </div>
              </div>
              
              {/* First Pick Placement Rate */}
              <div className="bg-card/50 rounded-lg p-3 text-center border border-border">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Target className="w-4 h-4 text-primary" />
                  <span className="text-xs text-muted-foreground">1er Placé</span>
                </div>
                <div className={`text-2xl font-bold ${getSuccessColor(globalStats.firstPickPlacementRate)}`}>
                  {globalStats.firstPickPlacementRate.toFixed(0)}%
                </div>
                <div className="text-xs text-muted-foreground">
                  1er choix dans top 3
                </div>
              </div>
              
              {/* Races Analyzed */}
              <div className="bg-card/50 rounded-lg p-3 text-center border border-border">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Star className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Courses</span>
                </div>
                <div className="text-2xl font-bold text-foreground">
                  {globalStats.totalRaces}
                </div>
                <div className="text-xs text-muted-foreground">
                  avec arrivée
                </div>
              </div>
            </div>
            
            {/* Type breakdown */}
            {(globalStats.easySuccessRate !== null || globalStats.topSuccessRate !== null) && (
              <div className="flex flex-wrap justify-center gap-4 mt-4 pt-4 border-t border-border">
                {globalStats.easySuccessRate !== null && (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500">
                      <Trophy className="w-3 h-3 mr-1" />
                      Couplés Facile
                    </Badge>
                    <span className={`font-semibold ${getSuccessColor(globalStats.easySuccessRate)}`}>
                      {globalStats.easySuccessRate.toFixed(0)}%
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({globalStats.easyRacesCount} courses)
                    </span>
                  </div>
                )}
                {globalStats.topSuccessRate !== null && (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary">
                      <Star className="w-3 h-3 mr-1" />
                      Top Courses
                    </Badge>
                    <span className={`font-semibold ${getSuccessColor(globalStats.topSuccessRate)}`}>
                      {globalStats.topSuccessRate.toFixed(0)}%
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({globalStats.topRacesCount} courses)
                    </span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="bg-card border-border">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-primary" />
            Courses Sauvegardées ({savedRaces.length})
          </CardTitle>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleClearAll}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Tout supprimer
          </Button>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {savedRaces.map((race) => (
          <Card key={race.id} className="bg-card border-border hover:border-primary/50 transition-colors">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary">
                    R{race.raceInfo.reunionNumber} C{race.raceInfo.raceNumber}
                  </Badge>
                  {race.type === 'easy' ? (
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500 text-xs">
                      <Trophy className="w-3 h-3 mr-1" />
                      Facile
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary text-xs">
                      <Star className="w-3 h-3 mr-1" />
                      Top
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(race.id, race.raceInfo)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-between mt-2">
                {race.raceInfo.hippodrome && (
                  <p className="text-sm text-muted-foreground">
                    {race.raceInfo.hippodrome}
                  </p>
                )}
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {getDisciplineLabel(race.raceInfo.discipline)}
                  </Badge>
                  {race.difficulty && getDifficultyBadge(race.difficulty)}
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                <span>Sauvegardé le {formatDate(race.timestamp)}</span>
                {race.averageScore && (
                  <span className="text-primary font-medium">
                    Score moy: {race.averageScore.toFixed(1)}
                  </span>
                )}
              </div>
              {/* Arrivée display */}
              {race.arrivee && race.arrivee.length > 0 && (
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className="text-xs text-muted-foreground">Arrivée:</span>
                  {race.arrivee.slice(0, 4).map((num, idx) => {
                    const isInTop4 = race.top4.some(h => h.numero === num);
                    return (
                      <Badge 
                        key={`arr-${num}-${idx}`}
                        variant="outline"
                        className={`text-xs ${isInTop4 
                          ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' 
                          : 'bg-red-500/10 border-red-500 text-red-400'
                        }`}
                      >
                        {idx + 1}er: {num}
                      </Badge>
                    );
                  })}
                </div>
              )}
            </CardHeader>
            
            <CardContent className="space-y-2">
              {race.top4.map((horse, idx) => (
                <div 
                  key={horse.numero}
                  className={`flex items-center justify-between p-2 rounded-lg border ${
                    idx === 0 ? 'bg-amber-500/10 border-amber-500/50' :
                    idx === 1 ? 'bg-slate-400/10 border-slate-400/50' :
                    idx === 2 ? 'bg-orange-600/10 border-orange-600/50' :
                    'bg-muted/50 border-border'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold w-8 text-center">
                      {horse.numero}
                    </span>
                    <div className="flex flex-col">
                      {horse.name && (
                        <span className="text-sm font-medium truncate max-w-[120px]">
                          {horse.name}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        Cote: {horse.cote.toFixed(1)}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold">
                      {horse.scoreTotal}
                    </div>
                    {horse.label !== 'NEUTRE' && (
                      <Badge variant="outline" className="text-[10px]">
                        {horse.label}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default SavedRacesPanel;

