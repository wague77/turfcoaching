
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  History, 
  Trophy, 
  Target, 
  Trash2, 
  ChevronDown, 
  ChevronUp, 
  TrendingUp,
  Award,
  Flame
} from 'lucide-react';
import { ComparisonResult, ComparisonStats } from '@/types/racing';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface ComparisonHistoryPanelProps {
  history: ComparisonResult[];
  stats: ComparisonStats | null;
  onDelete: (id: string) => void;
  onClearAll: () => void;
}

const ComparisonHistoryPanel = ({ 
  history, 
  stats, 
  onDelete, 
  onClearAll 
}: ComparisonHistoryPanelProps) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getSuccessColor = (rate: number | null) => {
    if (rate === null) return 'text-muted-foreground';
    if (rate >= 60) return 'text-green-400';
    if (rate >= 40) return 'text-amber-400';
    return 'text-red-400';
  };

  const getSuccessBg = (rate: number | null) => {
    if (rate === null) return 'bg-muted/30';
    if (rate >= 60) return 'bg-green-500/20 border-green-500/50';
    if (rate >= 40) return 'bg-amber-500/20 border-amber-500/50';
    return 'bg-red-500/20 border-red-500/50';
  };

  return (
    <Card className="border-border/50 bg-gradient-to-br from-card/80 to-card/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <History className="h-5 w-5 text-primary" />
            Historique des Performances
          </CardTitle>
          {history.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Effacer l'historique ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Cette action supprimera définitivement toutes les {history.length} comparaisons enregistrées.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={onClearAll} className="bg-destructive hover:bg-destructive/90">
                    Effacer tout
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Global Stats */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/30">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{stats.totalComparisons}</div>
              <div className="text-xs text-muted-foreground">Courses analysées</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${getSuccessColor(stats.avgSuccessRate)}`}>
                {stats.avgSuccessRate}%
              </div>
              <div className="text-xs text-muted-foreground">Taux moyen</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-400">{stats.winnerPredictionRate}%</div>
              <div className="text-xs text-muted-foreground">Gagnants trouvés</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">{stats.basesInTop3Rate}%</div>
              <div className="text-xs text-muted-foreground">Bases en Top 3</div>
            </div>
            <div className="text-center flex flex-col items-center">
              <div className="flex items-center gap-1">
                <Flame className="h-5 w-5 text-orange-400" />
                <span className="text-2xl font-bold text-orange-400">{stats.currentStreak}</span>
              </div>
              <div className="text-xs text-muted-foreground">Série actuelle</div>
            </div>
            <div className="text-center flex flex-col items-center">
              <div className="flex items-center gap-1">
                <Award className="h-5 w-5 text-purple-400" />
                <span className="text-2xl font-bold text-purple-400">{stats.bestStreak}</span>
              </div>
              <div className="text-xs text-muted-foreground">Meilleure série</div>
            </div>
          </div>
        )}

        {/* History List */}
        {history.length === 0 ? (
          <div className="text-center py-8">
            <TrendingUp className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-muted-foreground">
              Aucune comparaison enregistrée.<br />
              Générez des pronostics puis saisissez l'arrivée pour commencer.
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-3">
            <div className="space-y-2">
              {history.map((comp) => (
                <div 
                  key={comp.id}
                  className={`rounded-lg border ${getSuccessBg(comp.overallSuccessRate)} p-3 transition-all`}
                >
                  <div 
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => setExpandedId(expandedId === comp.id ? null : comp.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`text-xl font-bold ${getSuccessColor(comp.overallSuccessRate)}`}>
                        {comp.overallSuccessRate?.toFixed(0) || '?'}%
                      </div>
                      <div>
                        <div className="font-medium text-sm">
                          {comp.raceName || 'Course sans nom'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatDate(comp.timestamp)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {comp.winnerPredicted && (
                        <Badge className="bg-yellow-500/30 text-yellow-400 border-yellow-500/50">
                          <Trophy className="h-3 w-3 mr-1" />
                          Gagnant
                        </Badge>
                      )}
                      {expandedId === comp.id ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  {expandedId === comp.id && (
                    <div className="mt-3 pt-3 border-t border-border/50 space-y-3">
                      {/* Arrival */}
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">Arrivée:</span>
                        <div className="flex gap-1">
                          {comp.arrivee.slice(0, 5).map((n, i) => (
                            <Badge 
                              key={i} 
                              className={`${
                                i === 0 ? 'bg-yellow-500/30 text-yellow-400' :
                                i === 1 ? 'bg-slate-400/30 text-slate-300' :
                                i === 2 ? 'bg-amber-600/30 text-amber-500' :
                                'bg-muted/50 text-muted-foreground'
                              }`}
                            >
                              {n}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* Bases */}
                      {comp.bases.length > 0 && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-muted-foreground">Bases:</span>
                          {comp.bases.map(n => (
                            <Badge 
                              key={n} 
                              className={`${comp.basesInTop3.includes(n) ? 'bg-green-500/30 text-green-400' : 'bg-red-500/20 text-red-400'}`}
                            >
                              {n} {comp.basesInTop3.includes(n) ? '✓' : '✗'}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Outsiders */}
                      {comp.outsiders.length > 0 && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-muted-foreground">Outsiders:</span>
                          {comp.outsiders.map(n => (
                            <Badge 
                              key={n} 
                              className={`${comp.outsidersInTop5.includes(n) ? 'bg-green-500/30 text-green-400' : 'bg-muted/50 text-muted-foreground'}`}
                            >
                              {n} {comp.outsidersInTop5.includes(n) ? '✓' : '-'}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Stats row */}
                      <div className="flex items-center justify-between">
                        <div className="flex gap-4 text-xs">
                          <span>
                            <Trophy className="h-3 w-3 inline mr-1 text-amber-400" />
                            {comp.basesInTop3.length}/{comp.bases.length} bases Top 3
                          </span>
                          <span>
                            <Target className="h-3 w-3 inline mr-1 text-blue-400" />
                            {comp.allInTop5.length}/{comp.allMentioned.length} placés Top 5
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(comp.id);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default ComparisonHistoryPanel;

