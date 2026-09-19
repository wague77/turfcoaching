
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  History, Trash2, ChevronDown, ChevronUp, Trophy, Target,
  TrendingUp, Calculator, CheckCircle2, XCircle, Flame, Award
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { TurfCoachingHistoryEntry, TurfCoachingStats } from '@/hooks/useTurfCoachingHistory';

interface TurfCoachingHistoryPanelProps {
  history: TurfCoachingHistoryEntry[];
  stats: TurfCoachingStats;
  onDelete: (id: string) => void;
  onClearAll: () => void;
}

const getPositionColor = (position: number): string => {
  switch (position) {
    case 1: return 'bg-yellow-500 text-yellow-950';
    case 2: return 'bg-gray-300 text-gray-800';
    case 3: return 'bg-amber-600 text-amber-50';
    case 4: return 'bg-blue-500 text-white';
    case 5: return 'bg-purple-500 text-white';
    default: return 'bg-muted text-muted-foreground';
  }
};

export function TurfCoachingHistoryPanel({
  history,
  stats,
  onDelete,
  onClearAll,
}: TurfCoachingHistoryPanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (history.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <History className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">
            Aucune analyse sauvegardée
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Sauvegardez vos analyses pour suivre vos performances
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Statistics */}
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Statistiques globales
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{stats.totalAnalyses}</p>
              <p className="text-xs text-muted-foreground">Analyses</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-500">{stats.successRate.toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground">Taux succès</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{stats.avgFilteredCombinations.toFixed(0)}</p>
              <p className="text-xs text-muted-foreground">Moy. combis</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{stats.avgBetCost.toFixed(0)}€</p>
              <p className="text-xs text-muted-foreground">Moy. mise</p>
            </div>
          </div>

          {/* Streaks */}
          {(stats.currentStreak > 0 || stats.bestStreak > 0) && (
            <div className="mt-4 pt-3 border-t border-border flex gap-4 justify-center">
              {stats.currentStreak > 0 && (
                <Badge variant="secondary" className="gap-1">
                  <Flame className="w-3 h-3 text-orange-500" />
                  Série en cours: {stats.currentStreak}
                </Badge>
              )}
              {stats.bestStreak > 0 && (
                <Badge variant="outline" className="gap-1">
                  <Award className="w-3 h-3 text-yellow-500" />
                  Meilleure série: {stats.bestStreak}
                </Badge>
              )}
            </div>
          )}

          {/* By bet type */}
          <div className="mt-4 pt-3 border-t border-border">
            <p className="text-xs text-muted-foreground mb-2">Par type de pari:</p>
            <div className="flex gap-2 flex-wrap">
              {(['tierce', 'quarte', 'quinte'] as const).map(type => {
                const data = stats.byBetType[type];
                if (data.total === 0) return null;
                const rate = (data.success / data.total * 100).toFixed(0);
                return (
                  <Badge key={type} variant="outline" className="text-xs">
                    {type.charAt(0).toUpperCase() + type.slice(1)}: {data.success}/{data.total} ({rate}%)
                  </Badge>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* History list */}
      <Card>
        <CardHeader className="pb-2 flex-row items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <History className="w-4 h-4 text-primary" />
            Historique ({history.length})
          </CardTitle>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                <Trash2 className="w-4 h-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Effacer tout l'historique ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Cette action est irréversible. Toutes les analyses sauvegardées seront supprimées.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={onClearAll} className="bg-destructive text-destructive-foreground">
                  Effacer
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[400px]">
            <div className="p-4 space-y-2">
              {history.map((entry) => (
                <Collapsible
                  key={entry.id}
                  open={expandedId === entry.id}
                  onOpenChange={(open) => setExpandedId(open ? entry.id : null)}
                >
                  <div className={`border rounded-lg overflow-hidden ${
                    entry.arrivee.length > 0 
                      ? entry.isSuccess 
                        ? 'border-green-500/50 bg-green-500/5' 
                        : 'border-red-500/30 bg-red-500/5'
                      : 'border-border'
                  }`}>
                    <CollapsibleTrigger className="w-full p-3 flex items-center justify-between hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3 text-left">
                        {entry.arrivee.length > 0 ? (
                          entry.isSuccess ? (
                            <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                          )
                        ) : (
                          <Target className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                        )}
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">
                              {entry.raceName || format(new Date(entry.createdAt), 'dd MMM yyyy HH:mm', { locale: fr })}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {entry.betType.charAt(0).toUpperCase() + entry.betType.slice(1)}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                            <span>{entry.starters} partants</span>
                            <span>•</span>
                            <span>{entry.filteredCombinations} combis</span>
                            <span>•</span>
                            <span>{entry.betCost}€</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {entry.arrivee.length > 0 && (
                          <div className="flex gap-0.5">
                            {entry.arrivee.slice(0, 3).map((num, idx) => (
                              <Badge key={num} className={`${getPositionColor(idx + 1)} text-xs px-1.5`}>
                                {num}
                              </Badge>
                            ))}
                          </div>
                        )}
                        {expandedId === entry.id ? (
                          <ChevronUp className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <div className="px-3 pb-3 pt-0 space-y-3 border-t border-border">
                        {/* Date */}
                        <p className="text-xs text-muted-foreground pt-2">
                          {format(new Date(entry.createdAt), "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr })}
                        </p>

                        {/* Arrivée complète */}
                        {entry.arrivee.length > 0 && (
                          <div>
                            <p className="text-xs font-medium mb-1">Arrivée:</p>
                            <div className="flex gap-1">
                              {entry.arrivee.map((num, idx) => (
                                <Badge key={num} className={`${getPositionColor(idx + 1)} text-xs`}>
                                  {idx + 1}e: {num}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Winning combinations */}
                        {entry.arrivee.length > 0 && (
                          <div className={`p-2 rounded ${entry.isSuccess ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                            <p className={`text-sm font-medium ${entry.isSuccess ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                              {entry.isSuccess 
                                ? `✓ ${entry.winningCombinationsCount} combinaison(s) gagnante(s)` 
                                : '✗ Aucune combinaison gagnante'}
                            </p>
                          </div>
                        )}

                        {/* Filters applied */}
                        <div>
                          <p className="text-xs font-medium mb-1">Filtres appliqués:</p>
                          <div className="flex gap-1 flex-wrap">
                            {entry.filtersApplied.paniers.length > 0 && (
                              <Badge variant="secondary" className="text-xs">
                                Paniers: {entry.filtersApplied.paniers.join(', ')}
                              </Badge>
                            )}
                            {entry.filtersApplied.groupes.length > 0 && (
                              <Badge variant="secondary" className="text-xs">
                                Groupes: {entry.filtersApplied.groupes.join(', ')}
                              </Badge>
                            )}
                            {entry.filtersApplied.simulator.length > 0 && (
                              <Badge variant="secondary" className="text-xs">
                                Simulator: {entry.filtersApplied.simulator.join(', ')}
                              </Badge>
                            )}
                            {entry.filtersApplied.chevauxHS.length > 0 && (
                              <Badge variant="secondary" className="text-xs">
                                HS: {entry.filtersApplied.chevauxHS.join(', ')}
                              </Badge>
                            )}
                            {entry.filtersApplied.hasFavorisFilter && (
                              <Badge variant="secondary" className="text-xs">Favoris</Badge>
                            )}
                            {entry.filtersApplied.hasTocardsFilter && (
                              <Badge variant="secondary" className="text-xs">Tocards</Badge>
                            )}
                            {entry.filtersApplied.hasPronosticFilter && (
                              <Badge variant="secondary" className="text-xs">Pronostics</Badge>
                            )}
                            {entry.filtersApplied.hasConsecutifsFilter && (
                              <Badge variant="secondary" className="text-xs">Consécutifs</Badge>
                            )}
                            {entry.filtersApplied.hasGeneratorFilters && (
                              <Badge variant="secondary" className="text-xs">Filtres avancés</Badge>
                            )}
                          </div>
                        </div>

                        {/* Horses */}
                        <div>
                          <p className="text-xs font-medium mb-1">Chevaux (par cote):</p>
                          <div className="flex gap-1 flex-wrap">
                            {entry.horsesData.slice(0, 10).map(horse => {
                              const posInArrivee = entry.arrivee.indexOf(horse.number);
                              return (
                                <Badge 
                                  key={horse.number}
                                  variant={horse.isFavorite ? "default" : horse.isTocard ? "outline" : "secondary"}
                                  className={`text-xs ${posInArrivee !== -1 ? getPositionColor(posInArrivee + 1) : ''}`}
                                >
                                  {horse.number} ({horse.odds.toFixed(1)})
                                  {posInArrivee !== -1 && <span className="ml-1">{posInArrivee + 1}e</span>}
                                </Badge>
                              );
                            })}
                            {entry.horsesData.length > 10 && (
                              <Badge variant="outline" className="text-xs">
                                +{entry.horsesData.length - 10}
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end pt-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => onDelete(entry.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Supprimer
                          </Button>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

