
import { Badge } from '@/components/ui/badge';
import { PronosticEvaluation, RaceResult } from '@/types/racing';
import { Trophy, Target, CheckCircle, XCircle, Percent } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface EvaluationBadgeProps {
  evaluation: PronosticEvaluation;
  raceResult: RaceResult;
  compact?: boolean;
}

const EvaluationBadge = ({ evaluation, raceResult, compact = false }: EvaluationBadgeProps) => {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    if (score >= 50) return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    if (score >= 25) return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    return 'bg-destructive/20 text-destructive border-destructive/30';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 50) return 'Bon';
    if (score >= 25) return 'Moyen';
    return 'Faible';
  };

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge 
              variant="outline" 
              className={`${getScoreColor(evaluation.overallScore)} cursor-help`}
            >
              <Percent className="h-3 w-3 mr-1" />
              {evaluation.overallScore}%
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <div className="space-y-2 text-xs">
              <p className="font-semibold">Résultat: {raceResult.first}-{raceResult.second}-{raceResult.third}</p>
              <div className="flex items-center gap-2">
                {evaluation.baseSuccess ? (
                  <CheckCircle className="h-3 w-3 text-emerald-400" />
                ) : (
                  <XCircle className="h-3 w-3 text-destructive" />
                )}
                <span>Base {evaluation.baseSuccess ? 'validée' : 'ratée'}</span>
              </div>
              <div className="flex items-center gap-2">
                {evaluation.outsiderSuccess ? (
                  <CheckCircle className="h-3 w-3 text-emerald-400" />
                ) : (
                  <XCircle className="h-3 w-3 text-destructive" />
                )}
                <span>Outsider {evaluation.outsiderSuccess ? 'placé' : 'raté'}</span>
              </div>
              <p>Tiercé: {evaluation.trifectaScore}/3 chevaux</p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className="space-y-3 p-3 rounded-lg border bg-gradient-to-br from-card to-card/50">
      {/* Score principal */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Score global</span>
        <Badge 
          variant="outline" 
          className={`${getScoreColor(evaluation.overallScore)} text-base px-3 py-1`}
        >
          {evaluation.overallScore}% - {getScoreLabel(evaluation.overallScore)}
        </Badge>
      </div>

      {/* Résultat officiel */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Trophy className="h-4 w-4 text-amber-400" />
        <span>Arrivée: </span>
        <span className="font-mono font-semibold text-foreground">
          {raceResult.first} - {raceResult.second} - {raceResult.third}
          {raceResult.fourth && ` - ${raceResult.fourth}`}
          {raceResult.fifth && ` - ${raceResult.fifth}`}
        </span>
      </div>

      {/* Détails */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className={`flex items-center gap-2 p-2 rounded ${
          evaluation.baseSuccess 
            ? 'bg-emerald-500/10 text-emerald-400' 
            : 'bg-destructive/10 text-destructive'
        }`}>
          {evaluation.baseSuccess ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <XCircle className="h-4 w-4" />
          )}
          <span>Base {evaluation.baseSuccess ? 'validée' : 'ratée'}</span>
        </div>

        <div className={`flex items-center gap-2 p-2 rounded ${
          evaluation.outsiderSuccess 
            ? 'bg-emerald-500/10 text-emerald-400' 
            : 'bg-destructive/10 text-destructive'
        }`}>
          {evaluation.outsiderSuccess ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <XCircle className="h-4 w-4" />
          )}
          <span>Outsider {evaluation.outsiderSuccess ? 'placé' : 'raté'}</span>
        </div>

        <div className="flex items-center gap-2 p-2 rounded bg-blue-500/10 text-blue-400">
          <Target className="h-4 w-4" />
          <span>Tiercé: {evaluation.trifectaScore}/3</span>
        </div>

        {evaluation.superfectaScore !== undefined && (
          <div className="flex items-center gap-2 p-2 rounded bg-purple-500/10 text-purple-400">
            <Target className="h-4 w-4" />
            <span>Quarté: {evaluation.superfectaScore}/4</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default EvaluationBadge;

