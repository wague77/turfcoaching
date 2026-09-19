
import { Trophy, Medal } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { AnalysisResult } from '@/types/racing';
import { getArriveePosition, getArriveeStyle, isInArrivee } from '@/lib/arrivee-utils';

interface HistoryTabProps {
  result: AnalysisResult | null;
  arrivee?: number[];
}

export function HistoryTab({ result, arrivee = [] }: HistoryTabProps) {
  if (!result || result.winners.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Trophy className="w-16 h-16 text-muted-foreground/30 mb-4" />
        <h3 className="text-xl font-semibold text-muted-foreground mb-2">
          Aucun gagnant précédent
        </h3>
        <p className="text-sm text-muted-foreground">
          Les chevaux ayant déjà gagné (1 dans la musique) apparaîtront ici
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="cyber-card">
        <div className="flex items-center gap-2 mb-6">
          <Trophy className="w-6 h-6 text-accent" />
          <h3 className="text-xl font-semibold text-foreground">
            Historique des 1ers ({result.winners.length} chevaux)
          </h3>
        </div>
        
        <p className="text-sm text-muted-foreground mb-6">
          Chevaux ayant au moins une victoire dans leurs 6 dernières courses, triés par cote
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {result.winners.map((horse, idx) => {
            const inArrivee = isInArrivee(horse.numero, arrivee);
            const arriveePos = inArrivee ? getArriveePosition(horse.numero, arrivee) : -1;
            const arriveeStyle = arriveePos > 0 && arriveePos <= 5 ? getArriveeStyle(arriveePos) : null;
            
            return (
              <div 
                key={horse.numero}
                className={`relative overflow-hidden rounded-xl border p-6 transition-colors ${
                  arriveeStyle 
                    ? `${arriveeStyle.background} ${arriveeStyle.border}` 
                    : 'border-border bg-gradient-to-br from-muted/30 to-muted/10 hover:border-accent/50'
                }`}
              >
                {idx < 3 && (
                  <div className="absolute top-2 right-2">
                    <Medal className={`w-6 h-6 ${
                      idx === 0 ? 'text-yellow-400' : idx === 1 ? 'text-gray-400' : 'text-amber-600'
                    }`} />
                  </div>
                )}
                
                {arriveeStyle && (
                  <div className="absolute top-2 left-2">
                    <Badge className={`${arriveeStyle.background} ${arriveeStyle.text} border ${arriveeStyle.border}`}>
                      {arriveeStyle.badge}
                    </Badge>
                  </div>
                )}
                
                <div className="flex items-start gap-4">
                  <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${
                    arriveeStyle 
                      ? `${arriveeStyle.background} border ${arriveeStyle.border}` 
                      : 'bg-accent/20 border border-accent/30'
                  }`}>
                    <span className={`text-2xl font-bold ${arriveeStyle ? arriveeStyle.text : 'text-accent'}`}>
                      {horse.numero}
                    </span>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="text-2xl font-bold text-foreground">{horse.cote.toFixed(1)}</span>
                      <span className="text-sm text-muted-foreground">cote</span>
                    </div>
                    
                    <div className="font-mono text-lg text-muted-foreground mb-3 tracking-wide">
                      {horse.musique}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-primary" />
                      <span className="text-sm text-muted-foreground">
                        Victoire{horse.winPositions.length > 1 ? 's' : ''}: 
                      </span>
                      <div className="flex gap-1">
                        {horse.winPositions.map((pos) => (
                          <span key={pos} className="px-2 py-0.5 rounded bg-primary/20 text-primary text-xs font-bold">
                            {pos}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t border-border/50">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Score total</span>
                    <span className="font-mono">{horse.scoreTotal}/100</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all"
                      style={{ width: `${horse.scoreTotal}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

