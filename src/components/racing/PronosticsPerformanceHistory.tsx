
import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Trophy,
  TrendingUp,
  TrendingDown,
  Trash2,
  Target,
  Check,
  X,
  Percent,
  Award,
  Flame,
  BarChart3,
  History,
} from 'lucide-react';
import { PronosticPerformanceEntry, PronosticsPerformanceStats } from '@/hooks/usePronosticsPerformance';

interface PronosticsPerformanceHistoryProps {
  history: PronosticPerformanceEntry[];
  stats: PronosticsPerformanceStats;
  onDelete: (id: string) => void;
  onClear: () => void;
}

const PronosticsPerformanceHistory = ({
  history,
  stats,
  onDelete,
  onClear,
}: PronosticsPerformanceHistoryProps) => {
  if (history.length === 0) {
    return null;
  }

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBg = (score: number) => {
    if (score >= 70) return 'bg-green-500';
    if (score >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <Card className="border-indigo-500/30 bg-gradient-to-br from-indigo-500/5 to-violet-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-500" />
            <span>Performance des Pronostics</span>
            <Badge variant="secondary" className="text-xs">
              {stats.totalEntries} analyse(s)
            </Badge>
          </div>
          {history.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClear}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Effacer
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Global Statistics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2">
          <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-center">
            <Percent className="w-4 h-4 mx-auto mb-1 text-primary" />
            <div className={`text-xl font-bold ${getScoreColor(stats.avgOverallScore)}`}>
              {stats.avgOverallScore.toFixed(0)}%
            </div>
            <div className="text-xs text-muted-foreground">Score moyen</div>
          </div>
          
          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-center">
            <Trophy className="w-4 h-4 mx-auto mb-1 text-yellow-500" />
            <div className="text-xl font-bold text-green-600">
              {stats.winnerPredictionRate.toFixed(0)}%
            </div>
            <div className="text-xs text-muted-foreground">Gagnants prédits</div>
          </div>
          
          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-center">
            <Target className="w-4 h-4 mx-auto mb-1 text-blue-500" />
            <div className="text-xl font-bold text-blue-600">
              {stats.basesInTop3Rate.toFixed(0)}%
            </div>
            <div className="text-xs text-muted-foreground">Bases en Top 3</div>
          </div>
          
          <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20 text-center">
            <Award className="w-4 h-4 mx-auto mb-1 text-purple-500" />
            <div className="text-xl font-bold text-purple-600">
              {stats.coupleWinRate.toFixed(0)}%
            </div>
            <div className="text-xs text-muted-foreground">Couplés gagnants</div>
          </div>
          
          <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20 text-center">
            <Flame className="w-4 h-4 mx-auto mb-1 text-orange-500" />
            <div className="text-xl font-bold text-orange-600">
              {stats.currentStreak}
              <span className="text-xs font-normal ml-1">/ {stats.bestStreak}</span>
            </div>
            <div className="text-xs text-muted-foreground">Série actuelle / max</div>
          </div>
        </div>

        {/* Confidence Accuracy Indicator */}
        <div className="p-3 rounded-lg bg-muted/50 border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Fiabilité du score de confiance</span>
            </div>
            <Badge 
              variant={stats.confidenceAccuracy >= 60 ? 'default' : 'secondary'}
              className={stats.confidenceAccuracy >= 60 ? 'bg-green-600' : ''}
            >
              {stats.confidenceAccuracy.toFixed(0)}%
            </Badge>
          </div>
          <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
            <div 
              className={`h-full transition-all ${
                stats.confidenceAccuracy >= 60 ? 'bg-green-500' : 
                stats.confidenceAccuracy >= 40 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${stats.confidenceAccuracy}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {stats.confidenceAccuracy >= 60 
              ? 'Les prédictions à haute confiance sont significativement plus fiables'
              : stats.confidenceAccuracy >= 40
                ? 'Corrélation modérée entre confiance et résultats'
                : 'Encore trop peu de données pour évaluer'
            }
          </p>
        </div>

        {/* History List */}
        <div>
          <h5 className="text-sm font-medium mb-2 flex items-center gap-2">
            <History className="w-4 h-4 text-muted-foreground" />
            Historique détaillé
          </h5>
          <ScrollArea className="h-[200px]">
            <div className="space-y-2">
              {history.map((entry) => (
                <div 
                  key={entry.id}
                  className="p-3 rounded-lg bg-muted/50 border hover:bg-muted/70 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-xs">
                        R{entry.reunion}C{entry.course}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {entry.date.slice(0, 2)}/{entry.date.slice(2, 4)}/{entry.date.slice(4)}
                      </span>
                      <Badge 
                        variant="secondary" 
                        className={`text-xs ${getScoreBg(entry.overallScore)} text-white`}
                      >
                        {entry.overallScore}%
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(entry.id)}
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="flex items-center gap-1">
                      <span className="text-muted-foreground">Bases:</span>
                      <span className="font-medium">{entry.suggestedBases.join(', ')}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {entry.winnerPredicted ? (
                        <Check className="w-3 h-3 text-green-500" />
                      ) : (
                        <X className="w-3 h-3 text-red-500" />
                      )}
                      <span>Gagnant prédit</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-muted-foreground">Top 3:</span>
                      <span className={entry.basesInTop3.length > 0 ? 'text-green-600 font-medium' : ''}>
                        {entry.basesInTop3.length}/{entry.suggestedBases.length}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {entry.coupleWin ? (
                        <Badge variant="default" className="text-xs bg-green-600">Couplé ✓</Badge>
                      ) : entry.tierceWin ? (
                        <Badge variant="default" className="text-xs bg-purple-600">Tiercé ✓</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="mt-2 pt-2 border-t border-border/50 flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">Arrivée:</span>
                    {entry.arrivee.slice(0, 5).map((num, idx) => (
                      <Badge 
                        key={idx}
                        variant={entry.suggestedBases.includes(num) || entry.suggestedOutsiders.includes(num) ? 'default' : 'outline'}
                        className={`text-xs ${
                          entry.suggestedBases.includes(num) ? 'bg-green-600' :
                          entry.suggestedOutsiders.includes(num) ? 'bg-orange-500' : ''
                        }`}
                      >
                        {idx === 0 ? '🏆' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : ''} {num}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
};

export default PronosticsPerformanceHistory;

