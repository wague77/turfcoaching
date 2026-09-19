
import { Copy, TrendingUp, Target, Zap, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AnalysisResult } from '@/types/racing';
import { toast } from '@/hooks/use-toast';
import { getArriveePosition, getArriveeStyle, isInArrivee } from '@/lib/arrivee-utils';

interface ResultsTabProps {
  result: AnalysisResult | null;
  arrivee?: number[];
}

function DifficultyBadge({ level }: { level: 'easy' | 'medium' | 'hard' }) {
  const config = {
    easy: { icon: '🟢', text: 'FACILE', className: 'difficulty-easy' },
    medium: { icon: '🟠', text: 'MODÉRÉ', className: 'difficulty-medium' },
    hard: { icon: '🔴', text: 'DIFFICILE', className: 'difficulty-hard' },
  };
  
  const { icon, text, className } = config[level];
  
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-xl">{icon}</span>
      <span className="font-bold">{text}</span>
    </div>
  );
}

function TopList({ 
  title, 
  horses, 
  icon: Icon, 
  accentColor,
  arrivee = []
}: { 
  title: string; 
  horses: { numero: number; cote: number }[]; 
  icon: React.ElementType;
  accentColor: string;
  arrivee?: number[];
}) {
  return (
    <div className="cyber-card">
      <div className="flex items-center gap-2 mb-4">
        <Icon className={`w-5 h-5 ${accentColor}`} />
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      </div>
      
      <div className="space-y-2">
        {horses.map((horse, idx) => {
          const inArrivee = isInArrivee(horse.numero, arrivee);
          const arriveePos = inArrivee ? getArriveePosition(horse.numero, arrivee) : -1;
          const arriveeStyle = arriveePos > 0 && arriveePos <= 5 ? getArriveeStyle(arriveePos) : null;
          
          return (
            <div 
              key={horse.numero}
              className={`flex items-center justify-between px-4 py-2 rounded-lg transition-colors ${
                arriveeStyle 
                  ? `${arriveeStyle.background} border ${arriveeStyle.border}` 
                  : 'bg-muted/30 hover:bg-muted/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                  arriveeStyle 
                    ? `${arriveeStyle.background} ${arriveeStyle.text} ring-2 ${arriveeStyle.border.replace('border-', 'ring-')}`
                    : idx === 0 ? 'bg-primary/20 text-primary' :
                      idx === 1 ? 'bg-secondary/20 text-secondary' :
                      idx === 2 ? 'bg-accent/20 text-accent' :
                      'bg-muted text-muted-foreground'
                }`}>
                  {idx + 1}
                </span>
                <span className={`font-semibold ${arriveeStyle ? arriveeStyle.text : 'text-foreground'}`}>
                  N°{horse.numero}
                </span>
                {arriveeStyle && (
                  <Badge className={`${arriveeStyle.background} ${arriveeStyle.text} border ${arriveeStyle.border} text-xs`}>
                    {arriveeStyle.badge}
                  </Badge>
                )}
              </div>
              <span className="text-sm text-muted-foreground font-mono">{horse.cote.toFixed(1)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ResultsTab({ result, arrivee = [] }: ResultsTabProps) {
  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertTriangle className="w-16 h-16 text-muted-foreground/30 mb-4" />
        <h3 className="text-xl font-semibold text-muted-foreground mb-2">
          Aucune analyse
        </h3>
        <p className="text-sm text-muted-foreground">
          Saisissez les données des chevaux et lancez l'analyse
        </p>
      </div>
    );
  }

  const copyCouplés = () => {
    const text = result.couples.join('\n');
    navigator.clipboard.writeText(text);
    toast({
      title: "Couplés copiés",
      description: `${result.couples.length} couplés copiés dans le presse-papier`,
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Difficulty Card */}
      <div className="cyber-card">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-1">
              Niveau de difficulté
            </h3>
            <p className="text-sm text-muted-foreground">
              Basé sur l'écart des scores et la concentration des favoris
            </p>
          </div>
          <DifficultyBadge level={result.difficulty} />
        </div>
      </div>

      {/* TOP 8 Grids */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <TopList 
          title="TOP 8 par Cote" 
          horses={result.topByCote} 
          icon={TrendingUp}
          accentColor="text-primary"
          arrivee={arrivee}
        />
        <TopList 
          title="TOP 8 par Musique" 
          horses={result.topByMusique} 
          icon={Zap}
          accentColor="text-secondary"
          arrivee={arrivee}
        />
        <TopList 
          title="TOP 8 Ajusté" 
          horses={result.topAjuste} 
          icon={Target}
          accentColor="text-accent"
          arrivee={arrivee}
        />
      </div>

      {/* Couplés */}
      <div className="cyber-card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              Couplés Générés
            </h3>
            <p className="text-sm text-muted-foreground">
              Paires uniques du TOP 8 ajusté ({result.couples.length} combinaisons)
            </p>
          </div>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={copyCouplés}
            className="border-primary/30 text-primary hover:bg-primary/10"
          >
            <Copy className="w-4 h-4 mr-2" />
            Copier tout
          </Button>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {result.couples.map((couple) => (
            <button
              key={couple}
              onClick={() => {
                navigator.clipboard.writeText(couple);
                toast({ title: "Copié", description: couple });
              }}
              className="px-4 py-2 rounded-lg bg-muted/50 border border-border hover:border-primary/50 hover:bg-primary/5 text-foreground font-mono text-sm transition-all cursor-pointer"
            >
              {couple}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

