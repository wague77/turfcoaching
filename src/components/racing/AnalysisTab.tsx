
import { useState } from 'react';
import { Shield, Gem, AlertTriangle, Filter, Users, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AnalysisResult, Horse, Discipline } from '@/types/racing';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getArriveePosition, getArriveeStyle, isInArrivee } from '@/lib/arrivee-utils';
import { useAIPassword } from '@/hooks/useAIPassword';
import { AIPasswordDialog } from './AIPasswordDialog';

interface AnalysisTabProps {
  result: AnalysisResult | null;
  discipline?: Discipline;
  arrivee?: number[];
}

function VerdictBadge({ verdict }: { verdict: Horse['verdict'] }) {
  if (!verdict) return null;
  
  const config = {
    FIABLE: { icon: '🧱', text: 'FIABLE', className: 'badge-fiable' },
    DOUTEUX: { icon: '⚠️', text: 'DOUTEUX', className: 'badge-douteux' },
    FAUX_FAVORI: { icon: '❌', text: 'FAUX FAVORI', className: 'badge-faux' },
  };
  
  const { icon, text, className } = config[verdict];
  
  return (
    <span className={className}>
      <span>{icon}</span>
      <span>{text}</span>
    </span>
  );
}

function LabelBadge({ label }: { label: Horse['label'] }) {
  const config: Record<Horse['label'], { icon?: string; text: string; className: string }> = {
    BASE: { icon: '🧱', text: 'BASE', className: 'badge-fiable' },
    OUTSIDER: { icon: '💎', text: 'OUTSIDER', className: 'badge-outsider' },
    DOUTEUX: { icon: '⚠️', text: 'DOUTEUX', className: 'badge-douteux' },
    NEUTRE: { text: 'NEUTRE', className: 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide bg-muted/30 text-muted-foreground border border-muted' },
  };
  
  const { icon, text, className } = config[label];
  
  return (
    <span className={className}>
      {icon && <span>{icon}</span>}
      <span>{text}</span>
    </span>
  );
}

export function AnalysisTab({ result, discipline, arrivee = [] }: AnalysisTabProps) {
  const [filter, setFilter] = useState<string | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const { isAuthenticated, getSessionToken, getDeviceId } = useAIPassword();

  const requestAIAnalysis = async () => {
    if (!result) return;
    performAIAnalysis();
  };

  const performAIAnalysis = async () => {
    if (!result) return;
    
    setIsLoadingAI(true);
    try {
      let analysisText = '';

      // 1. Try native Next.js AI API route
      try {
        const resp = await fetch('/api/ai/wague-ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            horses: result.horses,
            discipline: discipline || 'plat',
            raceInfo: `Course ${result.difficulty ? `- Difficulté: ${result.difficulty}` : ''}`,
          }),
        });

        if (resp.ok) {
          const data = await resp.json();
          analysisText = data.text || data.response || '';
        }
      } catch (apiErr) {
        console.warn('Native AI API error, trying local fallback:', apiErr);
      }

      // 2. Edge Function fallback if available
      if (!analysisText) {
        try {
          const sessionToken = getSessionToken();
          const deviceId = getDeviceId();
          const { data, error } = await supabase.functions.invoke('ai-analysis', {
            body: {
              horses: result.horses,
              favorites: result.favorites,
              difficulty: result.difficulty,
              difficultyScore: result.difficultyScore,
              discipline: discipline || 'plat',
              sessionToken,
              deviceId
            }
          });
          if (!error && data?.success && data?.analysis) {
            analysisText = data.analysis;
          }
        } catch (edgeErr) {
          console.warn('Edge Function fallback skipped:', edgeErr);
        }
      }

      // 3. Guaranteed local algorithmic fallback
      if (!analysisText) {
        const { generateLocalWagueTurfAnalysis } = await import('@/lib/wague-turf-logic');
        analysisText = generateLocalWagueTurfAnalysis(result.horses, discipline || 'plat', `Course - Difficulté: ${result.difficulty || 'Moyenne'}`);
      }

      setAiAnalysis(analysisText);
      toast.success('Analyse IA générée avec succès !');
    } catch (error) {
      console.error('AI Analysis error, using local fallback:', error);
      try {
        const { generateLocalWagueTurfAnalysis } = await import('@/lib/wague-turf-logic');
        const fallbackText = generateLocalWagueTurfAnalysis(result.horses, discipline || 'plat', `Course - Difficulté: ${result.difficulty || 'Moyenne'}`);
        setAiAnalysis(fallbackText);
        toast.success('Analyse IA générée avec succès !');
      } catch (fallbackErr) {
        toast.error('Erreur lors de l\'analyse IA');
      }
    } finally {
      setIsLoadingAI(false);
    }
  };

  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Users className="w-16 h-16 text-muted-foreground/30 mb-4" />
        <h3 className="text-xl font-semibold text-muted-foreground mb-2">
          Aucune analyse détaillée
        </h3>
        <p className="text-sm text-muted-foreground">
          Lancez une analyse pour voir les détails
        </p>
      </div>
    );
  }

  const filteredHorses = filter 
    ? result.horses.filter(h => h.label === filter || h.verdict === filter)
    : result.horses;

  const filters = [
    { key: null, label: 'Tous', icon: Filter },
    { key: 'BASE', label: 'Base', icon: Shield },
    { key: 'OUTSIDER', label: 'Outsider', icon: Gem },
    { key: 'DOUTEUX', label: 'Douteux', icon: AlertTriangle },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* AI Password Dialog */}
      <AIPasswordDialog 
        open={showPasswordDialog} 
        onOpenChange={setShowPasswordDialog}
        onSuccess={performAIAnalysis}
      />

      {/* AI Analysis Section */}
      <div className="cyber-card border-primary/30">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Analyse IA Avancée
          </h3>
          <Button
            onClick={requestAIAnalysis}
            disabled={isLoadingAI}
            className="bg-gradient-to-r from-primary to-primary/80"
          >
            {isLoadingAI ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyse en cours...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Obtenir conseils IA
              </>
            )}
          </Button>
        </div>
        
        {aiAnalysis ? (
          <div className="prose prose-invert max-w-none">
            <div className="whitespace-pre-wrap text-sm text-foreground/90 leading-relaxed bg-muted/20 rounded-lg p-4 border border-border/50">
              {aiAnalysis}
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            Cliquez sur le bouton pour obtenir une analyse IA personnalisée avec des conseils de jeu.
          </p>
        )}
      </div>

      {/* Favorites Analysis */}
      <div className="cyber-card">
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          Analyse des 3 Favoris
        </h3>
        
        <div className="overflow-x-auto scrollbar-cyber">
          <table className="table-cyber">
            <thead>
              <tr>
                <th>N°</th>
                <th>Cote</th>
                <th>Score Cote</th>
                <th>Score Musique</th>
                <th>Score Ajusté</th>
                <th>Verdict</th>
              </tr>
            </thead>
            <tbody>
              {result.favorites.map((horse) => {
                const inArrivee = isInArrivee(horse.numero, arrivee);
                const arriveePos = inArrivee ? getArriveePosition(horse.numero, arrivee) : -1;
                const arriveeStyle = arriveePos > 0 && arriveePos <= 5 ? getArriveeStyle(arriveePos) : null;
                
                return (
                  <tr key={horse.numero} className={`hover:bg-muted/20 ${arriveeStyle ? `${arriveeStyle.background}` : ''}`}>
                    <td>
                      <div className="flex items-center gap-2">
                        <span className={`w-8 h-8 rounded-lg font-bold flex items-center justify-center ${
                          arriveeStyle 
                            ? `${arriveeStyle.background} ${arriveeStyle.text} ring-2 ${arriveeStyle.border.replace('border-', 'ring-')}`
                            : 'bg-primary/20 text-primary'
                        }`}>
                          {horse.numero}
                        </span>
                        {arriveeStyle && (
                          <Badge className={`${arriveeStyle.background} ${arriveeStyle.text} border ${arriveeStyle.border} text-xs`}>
                            {arriveeStyle.badge}
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="font-mono">{horse.cote.toFixed(1)}</td>
                    <td>
                      <span className="px-2 py-1 rounded bg-muted/50 font-mono text-sm">
                        {horse.scoreCote}
                      </span>
                    </td>
                    <td>
                      <span className="px-2 py-1 rounded bg-muted/50 font-mono text-sm">
                        {horse.scoreMusique}
                      </span>
                    </td>
                    <td>
                      <span className="px-2 py-1 rounded bg-primary/20 text-primary font-mono text-sm font-bold">
                        {horse.scoreMusiqueAjuste}
                      </span>
                    </td>
                    <td>
                      <VerdictBadge verdict={horse.verdict} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="flex flex-wrap gap-2">
        {filters.map(({ key, label, icon: Icon }) => (
          <Button
            key={label}
            variant={filter === key ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(key)}
            className={filter === key 
              ? "bg-primary text-primary-foreground" 
              : "border-border text-muted-foreground hover:text-foreground"
            }
          >
            <Icon className="w-4 h-4 mr-2" />
            {label}
          </Button>
        ))}
      </div>

      {/* Full Rankings Table */}
      <div className="cyber-card">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Classement Complet ({filteredHorses.length} chevaux)
        </h3>
        
        <div className="overflow-x-auto scrollbar-cyber">
          <table className="table-cyber">
            <thead>
              <tr>
                <th>Rang</th>
                <th>N°</th>
                <th>Cote</th>
                <th>Musique</th>
                <th>S.Cote</th>
                <th>S.Musique</th>
                <th>S.Ajusté</th>
                <th>Total</th>
                <th>Label</th>
              </tr>
            </thead>
            <tbody>
              {filteredHorses.map((horse, idx) => {
                const inArrivee = isInArrivee(horse.numero, arrivee);
                const arriveePos = inArrivee ? getArriveePosition(horse.numero, arrivee) : -1;
                const arriveeStyle = arriveePos > 0 && arriveePos <= 5 ? getArriveeStyle(arriveePos) : null;
                
                return (
                  <tr key={horse.numero} className={arriveeStyle ? arriveeStyle.background : ''}>
                    <td>
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        idx < 3 ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                      }`}>
                        {idx + 1}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${arriveeStyle ? arriveeStyle.text : 'text-foreground'}`}>
                          {horse.numero}
                        </span>
                        {arriveeStyle && (
                          <Badge className={`${arriveeStyle.background} ${arriveeStyle.text} border ${arriveeStyle.border} text-xs`}>
                            {arriveeStyle.badge}
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="font-mono text-sm">{horse.cote.toFixed(1)}</td>
                    <td className="font-mono text-xs text-muted-foreground max-w-[120px] truncate">
                      {horse.musique}
                    </td>
                    <td className="font-mono text-sm">{horse.scoreCote}</td>
                    <td className="font-mono text-sm">{horse.scoreMusique}</td>
                    <td className="font-mono text-sm">{horse.scoreMusiqueAjuste}</td>
                    <td>
                      <span className="px-2 py-1 rounded bg-primary/20 text-primary font-mono text-sm font-bold">
                        {horse.scoreTotal}
                      </span>
                    </td>
                    <td>
                      <LabelBadge label={horse.label} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

