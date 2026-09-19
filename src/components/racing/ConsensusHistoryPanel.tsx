
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  History, 
  Trash2, 
  TrendingUp, 
  Target, 
  Trophy, 
  Layers,
  ChevronDown,
  ChevronUp,
  Flame,
  BarChart3
} from 'lucide-react';
import { ConsensusHistoryEntry, ConsensusStats } from '@/hooks/useConsensusHistory';
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

interface ConsensusHistoryPanelProps {
  history: ConsensusHistoryEntry[];
  stats: ConsensusStats;
  onDelete: (id: string) => void;
  onClear: () => void;
}

const ConsensusHistoryPanel = ({ history, stats, onDelete, onClear }: ConsensusHistoryPanelProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (history.length === 0) {
    return null;
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="w-5 h-5 text-amber-400" />
            Historique Consensus ({history.length})
          </CardTitle>
          <div className="flex items-center gap-2">
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
                    Cette action supprimera définitivement les {history.length} entrées de l'historique consensus.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={onClear} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Effacer tout
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg bg-card/50 border border-border">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="w-4 h-4 text-amber-400" />
              <span className="text-xs text-muted-foreground">Taux moyen</span>
            </div>
            <p className={`text-xl font-bold ${stats.avgSuccessRate >= 10 ? 'text-green-400' : stats.avgSuccessRate >= 5 ? 'text-yellow-400' : 'text-muted-foreground'}`}>
              {stats.avgSuccessRate.toFixed(1)}%
            </p>
          </div>

          <div className="p-3 rounded-lg bg-card/50 border border-border">
            <div className="flex items-center gap-2 mb-1">
              <Layers className="w-4 h-4 text-violet-400" />
              <span className="text-xs text-muted-foreground">Couplés</span>
            </div>
            <p className="text-xl font-bold text-violet-400">
              {stats.totalCouplesWon}/{stats.totalCouplesGenerated}
            </p>
            <p className="text-[10px] text-muted-foreground">
              ({stats.couplesWinRate.toFixed(1)}%)
            </p>
          </div>

          <div className="p-3 rounded-lg bg-card/50 border border-border">
            <div className="flex items-center gap-2 mb-1">
              <Trophy className="w-4 h-4 text-fuchsia-400" />
              <span className="text-xs text-muted-foreground">Tiercés</span>
            </div>
            <p className="text-xl font-bold text-fuchsia-400">
              {stats.totalTiercesWon}/{stats.totalTiercesGenerated}
            </p>
            <p className="text-[10px] text-muted-foreground">
              ({stats.tiercesWinRate.toFixed(1)}%)
            </p>
          </div>

          <div className="p-3 rounded-lg bg-card/50 border border-border">
            <div className="flex items-center gap-2 mb-1">
              <Flame className="w-4 h-4 text-orange-400" />
              <span className="text-xs text-muted-foreground">Série</span>
            </div>
            <p className="text-xl font-bold text-orange-400">
              {stats.currentStreak}
            </p>
            <p className="text-[10px] text-muted-foreground">
              (max: {stats.bestStreak})
            </p>
          </div>
        </div>

        {/* History List */}
        {isExpanded && (
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-2">
              {history.map((entry) => (
                <div 
                  key={entry.id} 
                  className="p-3 rounded-lg bg-card/30 border border-border/50 hover:bg-card/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-muted-foreground">
                          {formatDate(entry.timestamp)}
                        </span>
                        {entry.raceName && (
                          <Badge variant="outline" className="text-[10px] truncate max-w-[120px]">
                            {entry.raceName}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs text-muted-foreground">Consensus:</span>
                        <div className="flex flex-wrap gap-1">
                          {entry.consensusHorses.map(n => (
                            <Badge 
                              key={n} 
                              variant="outline" 
                              className={`text-[10px] px-1.5 py-0 ${
                                entry.arrivee.slice(0, 3).includes(n) 
                                  ? 'bg-green-500/20 text-green-400 border-green-500/50' 
                                  : ''
                              }`}
                            >
                              {n}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-xs">
                        <span className="flex items-center gap-1">
                          <Layers className="w-3 h-3 text-violet-400" />
                          <span className={entry.couplesSuccess > 0 ? 'text-green-400' : 'text-muted-foreground'}>
                            {entry.couplesSuccess}/{entry.couplesTotal}
                          </span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Trophy className="w-3 h-3 text-fuchsia-400" />
                          <span className={entry.tiercesSuccess > 0 ? 'text-green-400' : 'text-muted-foreground'}>
                            {entry.tiercesSuccess}/{entry.tiercesTotal}
                          </span>
                        </span>
                        <Badge 
                          variant="outline" 
                          className={`text-[10px] ${
                            entry.successRate >= 10 
                              ? 'bg-green-500/20 text-green-400 border-green-500/50' 
                              : entry.successRate > 0 
                                ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50'
                                : 'bg-muted/50'
                          }`}
                        >
                          {entry.successRate.toFixed(1)}%
                        </Badge>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      onClick={() => onDelete(entry.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default ConsensusHistoryPanel;

