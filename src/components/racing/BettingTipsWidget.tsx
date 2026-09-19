
import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Sparkles, Loader2, Trophy, Target, Zap, Brain, Save, Check, AlertTriangle, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { RawHorseData, AnalysisResult, SavedPronostic, ComparisonResult } from '@/types/racing';
import { PMUHorse } from '@/lib/pmu-api';
import { useAIPassword } from '@/hooks/useAIPassword';
import { AIPasswordDialog } from './AIPasswordDialog';

interface BettingTipsWidgetProps {
  horses: RawHorseData[] | PMUHorse[];
  analysisResult?: AnalysisResult | null;
  onSave?: (pronostic: Omit<SavedPronostic, 'id' | 'timestamp'>) => void;
  arrivee?: number[]; // Optional: official finish order for comparison
  onSaveComparison?: (comparison: Omit<ComparisonResult, 'id' | 'timestamp'>) => void;
}

interface ErrorDetails {
  message: string;
  code?: string;
  details?: string;
}

const BettingTipsWidget = ({ horses, analysisResult, onSave, arrivee = [], onSaveComparison }: BettingTipsWidgetProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [tips, setTips] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [raceName, setRaceName] = useState('');
  const [error, setError] = useState<ErrorDetails | null>(null);
  const [comparisonSaved, setComparisonSaved] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const lastSavedComparisonRef = useRef<string | null>(null);
  const { isAuthenticated, getSessionToken, getDeviceId } = useAIPassword();

  const generateTips = async () => {
    if (!horses || horses.length === 0) {
      toast.error('Veuillez d\'abord charger des données de course');
      return;
    }

    // Check if user is authenticated for AI
    if (!isAuthenticated) {
      setShowPasswordDialog(true);
      return;
    }

    performGenerateTips();
  };

  const performGenerateTips = async () => {
    if (!horses || horses.length === 0) return;

    setIsLoading(true);
    setError(null);
    try {
      const sessionToken = getSessionToken();
      const deviceId = getDeviceId();
      
      const { data, error: invokeError } = await supabase.functions.invoke('generate-betting-tips', {
        body: { horses, analysisResult, sessionToken, deviceId }
      });

      if (invokeError) {
        console.error('Edge function error:', invokeError);
        // Try to get more details from the error
        let errorDetails = invokeError.message || JSON.stringify(invokeError);
        if (invokeError.context) {
          try {
            const contextBody = await invokeError.context.json?.() || invokeError.context.text?.();
            if (contextBody) {
              errorDetails += `\n\nServer response: ${typeof contextBody === 'string' ? contextBody : JSON.stringify(contextBody)}`;
            }
          } catch {
            // Ignore parsing errors
          }
        }
        setError({
          message: 'Erreur de communication avec le serveur',
          code: invokeError.name || 'INVOKE_ERROR',
          details: errorDetails,
        });
        return;
      }

      if (data?.error) {
        console.error('API error:', data.error);
        setError({
          message: data.error,
          code: data.code || 'API_ERROR',
          details: data.details || undefined,
        });
        return;
      }

      if (data?.success && data?.analysis) {
        setTips(data.analysis);
        setIsSaved(false);
        setRaceName('');
        toast.success('Système de jeu généré !');
      } else {
        setError({
          message: 'Réponse inattendue du serveur',
          code: 'UNEXPECTED_RESPONSE',
          details: JSON.stringify(data),
        });
      }
    } catch (err) {
      console.error('Error generating tips:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      setError({
        message: 'Erreur lors de la génération des pronostics',
        code: 'CATCH_ERROR',
        details: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Extract horse numbers mentioned in the AI tips (BASE, OUTSIDERS sections)
  const extractMentionedHorses = (text: string): { bases: number[]; outsiders: number[]; all: number[] } => {
    const bases: number[] = [];
    const outsiders: number[] = [];
    
    const lines = text.split('\n');
    let currentSection = '';
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Detect section headers
      if (/BASE/i.test(trimmed)) {
        currentSection = 'base';
      } else if (/OUTSIDER/i.test(trimmed)) {
        currentSection = 'outsider';
      } else if (/SYSTÈME|ANALYSE|SYNTHÈSE/i.test(trimmed)) {
        currentSection = 'other';
      }
      
      // Extract numbers from the line (look for patterns like "N°5", "cheval 5", just "5" at start, etc.)
      const numbers = trimmed.match(/(?:n°?\s*)?(\d{1,2})(?:\s|,|\.|\)|$)/gi);
      if (numbers) {
        for (const match of numbers) {
          const num = parseInt(match.replace(/\D/g, ''), 10);
          if (num > 0 && num <= 20) {
            if (currentSection === 'base' && !bases.includes(num)) {
              bases.push(num);
            } else if (currentSection === 'outsider' && !outsiders.includes(num)) {
              outsiders.push(num);
            }
          }
        }
      }
    }
    
    return { bases, outsiders, all: [...new Set([...bases, ...outsiders])] };
  };

  // Calculate comparison metrics between AI predictions and actual results
  const calculateComparison = () => {
    if (!tips || arrivee.length === 0) return null;
    
    const mentioned = extractMentionedHorses(tips);
    if (mentioned.all.length === 0) return null;
    
    const top3 = arrivee.slice(0, 3);
    const top5 = arrivee.slice(0, 5);
    
    // Check if bases are in top positions
    const basesInTop3 = mentioned.bases.filter(n => top3.includes(n));
    const basesInTop5 = mentioned.bases.filter(n => top5.includes(n));
    
    // Check if outsiders are in results
    const outsidersInTop3 = mentioned.outsiders.filter(n => top3.includes(n));
    const outsidersInTop5 = mentioned.outsiders.filter(n => top5.includes(n));
    
    // All mentioned horses in results
    const allInTop3 = mentioned.all.filter(n => top3.includes(n));
    const allInTop5 = mentioned.all.filter(n => top5.includes(n));
    
    // Calculate success rates
    const baseSuccessRate = mentioned.bases.length > 0 
      ? (basesInTop3.length / mentioned.bases.length) * 100 
      : null;
    
    const overallSuccessRate = mentioned.all.length > 0 
      ? (allInTop5.length / mentioned.all.length) * 100 
      : null;
    
    // Winner prediction (first base in first position)
    const winnerPredicted = mentioned.bases.length > 0 && arrivee[0] === mentioned.bases[0];
    
    // Tierce score (top 3 in correct order)
    let tierceScore = 0;
    for (let i = 0; i < 3 && i < mentioned.all.length; i++) {
      if (arrivee[i] === mentioned.all[i]) tierceScore++;
    }
    
    return {
      mentioned,
      basesInTop3,
      basesInTop5,
      outsidersInTop3,
      outsidersInTop5,
      allInTop3,
      allInTop5,
      baseSuccessRate,
      overallSuccessRate,
      winnerPredicted,
      tierceScore,
    };
  };

  const comparison = calculateComparison();

  // Auto-save comparison when we have tips, arrivee, and a valid comparison
  useEffect(() => {
    if (!comparison || !tips || arrivee.length < 3 || !onSaveComparison) return;
    
    // Create a unique key for this comparison to avoid duplicates
    const compKey = `${tips.substring(0, 50)}-${arrivee.join('-')}`;
    if (lastSavedComparisonRef.current === compKey) return;
    
    // Auto-save the comparison
    onSaveComparison({
      raceName: raceName || undefined,
      arrivee,
      bases: comparison.mentioned.bases,
      outsiders: comparison.mentioned.outsiders,
      allMentioned: comparison.mentioned.all,
      winnerPredicted: comparison.winnerPredicted,
      basesInTop3: comparison.basesInTop3,
      basesInTop5: comparison.basesInTop5,
      outsidersInTop3: comparison.outsidersInTop3,
      outsidersInTop5: comparison.outsidersInTop5,
      allInTop3: comparison.allInTop3,
      allInTop5: comparison.allInTop5,
      baseSuccessRate: comparison.baseSuccessRate,
      overallSuccessRate: comparison.overallSuccessRate,
      tierceScore: comparison.tierceScore,
    });
    
    lastSavedComparisonRef.current = compKey;
    setComparisonSaved(true);
    toast.success('Comparaison enregistrée dans l\'historique');
  }, [comparison, tips, arrivee, raceName, onSaveComparison]);

  // Reset comparison saved state when tips change
  useEffect(() => {
    setComparisonSaved(false);
    lastSavedComparisonRef.current = null;
  }, [tips]);

  const formatTips = (text: string) => {
    // Parse sections from the AI response with emoji headers
    const sections: { icon: React.ReactNode; title: string; content: string; color: string; bgClass: string }[] = [];
    
    const lines = text.split('\n');
    let currentSection = '';
    let currentContent: string[] = [];
    
    const sectionConfig: Record<string, { icon: React.ReactNode; color: string; bgClass: string }> = {
      'BASE': { icon: <Trophy className="h-5 w-5" />, color: 'text-amber-400', bgClass: 'from-amber-500/10 to-amber-500/5 border-amber-500/30' },
      'OUTSIDER': { icon: <Target className="h-5 w-5" />, color: 'text-emerald-400', bgClass: 'from-emerald-500/10 to-emerald-500/5 border-emerald-500/30' },
      'SYSTÈME': { icon: <Zap className="h-5 w-5" />, color: 'text-blue-400', bgClass: 'from-blue-500/10 to-blue-500/5 border-blue-500/30' },
      'ANALYSE': { icon: <Brain className="h-5 w-5" />, color: 'text-purple-400', bgClass: 'from-purple-500/10 to-purple-500/5 border-purple-500/30' },
      'SYNTHÈSE': { icon: <Sparkles className="h-5 w-5" />, color: 'text-pink-400', bgClass: 'from-pink-500/10 to-pink-500/5 border-pink-500/30' },
    };

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      
      // Check if it's a section header (with emoji or number prefix)
      const headerMatch = trimmed.match(/^[🏆⚡🎯📊💡]?\s*(BASE|OUTSIDER|SYSTÈME|ANALYSE|SYNTHÈSE)/i);
      if (headerMatch) {
        if (currentSection && currentContent.length > 0) {
          const key = Object.keys(sectionConfig).find(k => currentSection.toUpperCase().includes(k));
          const config = key ? sectionConfig[key] : { icon: <Sparkles className="h-5 w-5" />, color: 'text-primary', bgClass: 'from-primary/10 to-primary/5 border-primary/30' };
          sections.push({
            icon: config.icon,
            title: currentSection.replace(/^[🏆⚡🎯📊💡]\s*/, ''),
            content: currentContent.join('\n'),
            color: config.color,
            bgClass: config.bgClass,
          });
        }
        currentSection = trimmed;
        currentContent = [];
      } else if (currentSection) {
        currentContent.push(trimmed);
      } else {
        currentContent.push(trimmed);
      }
    });

    // Add last section
    if (currentSection && currentContent.length > 0) {
      const key = Object.keys(sectionConfig).find(k => currentSection.toUpperCase().includes(k));
      const config = key ? sectionConfig[key] : { icon: <Sparkles className="h-5 w-5" />, color: 'text-primary', bgClass: 'from-primary/10 to-primary/5 border-primary/30' };
      sections.push({
        icon: config.icon,
        title: currentSection.replace(/^[🏆⚡🎯📊💡]\s*/, ''),
        content: currentContent.join('\n'),
        color: config.color,
        bgClass: config.bgClass,
      });
    }

    if (sections.length === 0) {
      return (
        <div className="prose prose-sm prose-invert max-w-none">
          <p className="text-muted-foreground whitespace-pre-wrap">{text}</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {sections.map((section, index) => (
          <div 
            key={index} 
            className={`rounded-xl border bg-gradient-to-br ${section.bgClass} p-4 transition-all hover:scale-[1.01]`}
          >
            <div className="flex items-center gap-2 mb-3">
              <div className={`p-2 rounded-lg bg-background/50 ${section.color}`}>
                {section.icon}
              </div>
              <h4 className={`font-bold text-base ${section.color}`}>{section.title}</h4>
            </div>
            <div className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed pl-1">
              {section.content.split('\n').map((line, i) => (
                <p key={i} className={`${line.startsWith('-') || line.startsWith('•') ? 'pl-2 border-l-2 border-border/50 ml-2 my-1' : 'my-1'}`}>
                  {line}
                </p>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <>
      {/* AI Password Dialog */}
      <AIPasswordDialog 
        open={showPasswordDialog} 
        onOpenChange={setShowPasswordDialog}
        onSuccess={performGenerateTips}
      />

      <Card className="border-border/50 bg-gradient-to-br from-card/80 to-card/50 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-primary" />
              Système de Jeu IA
            </CardTitle>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
              Expert
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
        {!tips && !error ? (
          <div className="text-center py-8">
            <Sparkles className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              Générez un système de jeu personnalisé basé sur l'analyse IA des données de course
            </p>
            <Button 
              onClick={generateTips} 
              disabled={isLoading || !horses || horses.length === 0}
              className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyse en cours...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Générer Système de Jeu
                </>
              )}
            </Button>
          </div>
        ) : error ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-destructive/50 bg-gradient-to-br from-destructive/10 to-destructive/5 p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-destructive/20 text-destructive shrink-0">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <h4 className="font-bold text-destructive">Erreur</h4>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-foreground"
                      onClick={() => setError(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-foreground/90 mb-2">{error.message}</p>
                  {error.code && (
                    <Badge variant="outline" className="text-xs mb-2 bg-destructive/10 text-destructive border-destructive/30">
                      Code: {error.code}
                    </Badge>
                  )}
                  {error.details && (
                    <details className="mt-2">
                      <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                        Détails techniques
                      </summary>
                      <pre className="mt-2 p-2 rounded bg-background/50 text-xs text-muted-foreground overflow-x-auto whitespace-pre-wrap break-all">
                        {error.details}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            </div>
            <div className="flex justify-center">
              <Button 
                onClick={generateTips} 
                disabled={isLoading}
                variant="outline"
                size="sm"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Nouvelle tentative...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Réessayer
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : tips ? (
          <div className="space-y-4">
            {formatTips(tips)}
            
            {/* Comparison with actual results */}
            {comparison && arrivee.length >= 3 && (
              <div className="rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
                      <Trophy className="h-5 w-5" />
                    </div>
                    <h4 className="font-bold text-emerald-400">Comparaison avec l'arrivée</h4>
                  </div>
                  {comparisonSaved && (
                    <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                      <Check className="h-3 w-3 mr-1" />
                      Historisé
                    </Badge>
                  )}
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                  {/* Winner prediction */}
                  <div className={`rounded-lg p-3 text-center ${comparison.winnerPredicted ? 'bg-yellow-500/20 border border-yellow-500/50' : 'bg-muted/30'}`}>
                    <div className={`text-2xl font-bold ${comparison.winnerPredicted ? 'text-yellow-400' : 'text-muted-foreground'}`}>
                      {comparison.winnerPredicted ? '✓' : '✗'}
                    </div>
                    <div className="text-xs text-muted-foreground">Gagnant</div>
                  </div>
                  
                  {/* Bases in Top 3 */}
                  <div className="rounded-lg bg-muted/30 p-3 text-center">
                    <div className="text-2xl font-bold text-amber-400">
                      {comparison.basesInTop3.length}/{comparison.mentioned.bases.length}
                    </div>
                    <div className="text-xs text-muted-foreground">Bases Top 3</div>
                  </div>
                  
                  {/* Overall in Top 5 */}
                  <div className="rounded-lg bg-muted/30 p-3 text-center">
                    <div className="text-2xl font-bold text-blue-400">
                      {comparison.allInTop5.length}/{comparison.mentioned.all.length}
                    </div>
                    <div className="text-xs text-muted-foreground">Placés Top 5</div>
                  </div>
                  
                  {/* Success Rate */}
                  <div className={`rounded-lg p-3 text-center ${
                    comparison.overallSuccessRate && comparison.overallSuccessRate >= 60 
                      ? 'bg-green-500/20 border border-green-500/50' 
                      : comparison.overallSuccessRate && comparison.overallSuccessRate >= 40
                        ? 'bg-amber-500/20 border border-amber-500/50'
                        : 'bg-muted/30'
                  }`}>
                    <div className={`text-2xl font-bold ${
                      comparison.overallSuccessRate && comparison.overallSuccessRate >= 60 
                        ? 'text-green-400' 
                        : comparison.overallSuccessRate && comparison.overallSuccessRate >= 40
                          ? 'text-amber-400'
                          : 'text-muted-foreground'
                    }`}>
                      {comparison.overallSuccessRate?.toFixed(0) || 0}%
                    </div>
                    <div className="text-xs text-muted-foreground">Taux réussite</div>
                  </div>
                </div>
                
                {/* Detailed horses */}
                <div className="flex flex-wrap gap-2 text-sm">
                  {comparison.mentioned.bases.length > 0 && (
                    <div className="flex items-center gap-1">
                      <span className="text-muted-foreground">Bases:</span>
                      {comparison.mentioned.bases.map(n => (
                        <Badge 
                          key={n} 
                          className={`${comparison.basesInTop3.includes(n) ? 'bg-green-500/30 text-green-400 border-green-500/50' : 'bg-red-500/20 text-red-400 border-red-500/30'}`}
                        >
                          {n} {comparison.basesInTop3.includes(n) ? '✓' : '✗'}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {comparison.mentioned.outsiders.length > 0 && (
                    <div className="flex items-center gap-1 ml-2">
                      <span className="text-muted-foreground">Outsiders:</span>
                      {comparison.mentioned.outsiders.map(n => (
                        <Badge 
                          key={n} 
                          className={`${comparison.outsidersInTop5.includes(n) ? 'bg-green-500/30 text-green-400 border-green-500/50' : 'bg-muted/50 text-muted-foreground border-border/50'}`}
                        >
                          {n} {comparison.outsidersInTop5.includes(n) ? '✓' : '-'}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
            {/* Race name input and save controls */}
            {onSave && !isSaved && (
              <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                <Input
                  placeholder="Nom de la course (ex: Prix d'Amérique)"
                  value={raceName}
                  onChange={(e) => setRaceName(e.target.value.slice(0, 100))}
                  className="flex-1 h-9 text-sm"
                />
              </div>
            )}
            
            <div className="flex justify-center gap-2 pt-2">
              <Button 
                variant="outline" 
                onClick={generateTips} 
                disabled={isLoading}
                size="sm"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Régénération...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Nouvelle Analyse
                  </>
                )}
              </Button>
              {onSave && (
                <Button
                  variant={isSaved ? "secondary" : "default"}
                  onClick={() => {
                    if (tips && !isSaved) {
                      onSave({
                        raceName: raceName.trim() || undefined,
                        horseCount: horses.length,
                        tips,
                        analysisResult,
                      });
                      setIsSaved(true);
                      toast.success('Pronostic sauvegardé !');
                    }
                  }}
                  disabled={isSaved}
                  size="sm"
                >
                  {isSaved ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Sauvegardé
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Sauvegarder
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        ) : null}
        </CardContent>
      </Card>
    </>
  );
};

export default BettingTipsWidget;

