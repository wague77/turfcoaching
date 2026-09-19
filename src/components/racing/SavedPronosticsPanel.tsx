
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  History, 
  Trash2, 
  Eye, 
  X, 
  Trophy, 
  Target, 
  Zap, 
  Brain, 
  Sparkles,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  BarChart3
} from 'lucide-react';
import { SavedPronostic, RaceResult, PronosticEvaluation } from '@/types/racing';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import RaceResultDialog from './RaceResultDialog';
import EvaluationBadge from './EvaluationBadge';

interface SavedPronosticsPanelProps {
  savedPronostics: SavedPronostic[];
  onDelete: (id: string) => void;
  onClearAll: () => void;
  onUpdateResult: (id: string, result: RaceResult, evaluation: PronosticEvaluation) => void;
  stats?: {
    totalEvaluated: number;
    avgScore: number;
    baseSuccessRate: number;
    outsiderSuccessRate: number;
  } | null;
}

const SavedPronosticsPanel = ({ 
  savedPronostics, 
  onDelete, 
  onClearAll,
  onUpdateResult,
  stats,
}: SavedPronosticsPanelProps) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [resultDialogProno, setResultDialogProno] = useState<SavedPronostic | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const toggleCompare = (id: string) => {
    if (compareIds.includes(id)) {
      setCompareIds(compareIds.filter(cId => cId !== id));
    } else if (compareIds.length < 2) {
      setCompareIds([...compareIds, id]);
    }
  };

  const formatTipsPreview = (tips: string) => {
    const lines = tips.split('\n').filter(l => l.trim());
    return lines.slice(0, 3).join(' ').substring(0, 150) + '...';
  };

  const formatTipsFull = (text: string) => {
    const sections: { icon: React.ReactNode; title: string; content: string; color: string; bgClass: string }[] = [];
    
    const lines = text.split('\n');
    let currentSection = '';
    let currentContent: string[] = [];
    
    const sectionConfig: Record<string, { icon: React.ReactNode; color: string; bgClass: string }> = {
      'BASE': { icon: <Trophy className="h-4 w-4" />, color: 'text-amber-400', bgClass: 'from-amber-500/10 to-amber-500/5 border-amber-500/30' },
      'OUTSIDER': { icon: <Target className="h-4 w-4" />, color: 'text-emerald-400', bgClass: 'from-emerald-500/10 to-emerald-500/5 border-emerald-500/30' },
      'SYSTÈME': { icon: <Zap className="h-4 w-4" />, color: 'text-blue-400', bgClass: 'from-blue-500/10 to-blue-500/5 border-blue-500/30' },
      'ANALYSE': { icon: <Brain className="h-4 w-4" />, color: 'text-purple-400', bgClass: 'from-purple-500/10 to-purple-500/5 border-purple-500/30' },
      'SYNTHÈSE': { icon: <Sparkles className="h-4 w-4" />, color: 'text-pink-400', bgClass: 'from-pink-500/10 to-pink-500/5 border-pink-500/30' },
    };

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      
      const headerMatch = trimmed.match(/^[🏆⚡🎯📊💡]?\s*(BASE|OUTSIDER|SYSTÈME|ANALYSE|SYNTHÈSE)/i);
      if (headerMatch) {
        if (currentSection && currentContent.length > 0) {
          const key = Object.keys(sectionConfig).find(k => currentSection.toUpperCase().includes(k));
          const config = key ? sectionConfig[key] : { icon: <Sparkles className="h-4 w-4" />, color: 'text-primary', bgClass: 'from-primary/10 to-primary/5 border-primary/30' };
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
      }
    });

    if (currentSection && currentContent.length > 0) {
      const key = Object.keys(sectionConfig).find(k => currentSection.toUpperCase().includes(k));
      const config = key ? sectionConfig[key] : { icon: <Sparkles className="h-4 w-4" />, color: 'text-primary', bgClass: 'from-primary/10 to-primary/5 border-primary/30' };
      sections.push({
        icon: config.icon,
        title: currentSection.replace(/^[🏆⚡🎯📊💡]\s*/, ''),
        content: currentContent.join('\n'),
        color: config.color,
        bgClass: config.bgClass,
      });
    }

    if (sections.length === 0) {
      return <p className="text-sm text-muted-foreground whitespace-pre-wrap">{text}</p>;
    }

    return (
      <div className="space-y-3">
        {sections.map((section, index) => (
          <div 
            key={index} 
            className={`rounded-lg border bg-gradient-to-br ${section.bgClass} p-3`}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className={`p-1.5 rounded bg-background/50 ${section.color}`}>
                {section.icon}
              </div>
              <h5 className={`font-semibold text-sm ${section.color}`}>{section.title}</h5>
            </div>
            <div className="text-xs text-foreground/80 whitespace-pre-wrap leading-relaxed">
              {section.content}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const comparingPronostics = compareIds.length === 2 
    ? savedPronostics.filter(p => compareIds.includes(p.id))
    : [];

  if (savedPronostics.length === 0) {
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <History className="h-5 w-5 text-primary" />
            Pronostics Sauvegardés
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <History className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Aucun pronostic sauvegardé</p>
            <p className="text-sm mt-1">Générez et sauvegardez vos analyses IA</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <History className="h-5 w-5 text-primary" />
              Pronostics Sauvegardés
              <Badge variant="secondary" className="ml-2">{savedPronostics.length}</Badge>
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClearAll} className="text-destructive hover:text-destructive">
              <Trash2 className="h-4 w-4 mr-1" />
              Tout effacer
            </Button>
          </div>

          {/* Global Stats */}
          {stats && (
            <div className="grid grid-cols-4 gap-2 mt-3 p-3 rounded-lg bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Évalués</p>
                <p className="font-bold text-lg text-foreground">{stats.totalEvaluated}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Score moyen</p>
                <p className="font-bold text-lg text-primary">{stats.avgScore}%</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Base OK</p>
                <p className="font-bold text-lg text-amber-400">{stats.baseSuccessRate}%</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Outsider OK</p>
                <p className="font-bold text-lg text-emerald-400">{stats.outsiderSuccessRate}%</p>
              </div>
            </div>
          )}

          {compareIds.length > 0 && (
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="bg-primary/10">
                {compareIds.length}/2 sélectionné(s) pour comparaison
              </Badge>
              <Button variant="ghost" size="sm" onClick={() => setCompareIds([])}>
                <X className="h-3 w-3 mr-1" />
                Annuler
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Comparison View */}
          {comparingPronostics.length === 2 && (
            <div className="border border-primary/30 rounded-xl p-4 bg-gradient-to-br from-primary/5 to-primary/10 mb-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold flex items-center gap-2">
                  <Eye className="h-4 w-4 text-primary" />
                  Comparaison
                </h4>
                <Button variant="ghost" size="sm" onClick={() => setCompareIds([])}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {comparingPronostics.map((prono) => (
                  <div key={prono.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {prono.raceName && (
                          <span className="font-medium text-sm text-foreground truncate max-w-[120px]">
                            {prono.raceName}
                          </span>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {format(new Date(prono.timestamp), 'dd/MM HH:mm', { locale: fr })}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">{prono.horseCount} chevaux</span>
                    </div>
                    {prono.evaluation && prono.raceResult && (
                      <EvaluationBadge 
                        evaluation={prono.evaluation} 
                        raceResult={prono.raceResult}
                        compact 
                      />
                    )}
                    <ScrollArea className="h-[300px] rounded-lg border bg-background/50 p-3">
                      {formatTipsFull(prono.tips)}
                    </ScrollArea>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* List of saved pronostics */}
          <ScrollArea className="h-[400px]">
            <div className="space-y-3 pr-4">
              {savedPronostics.map((prono) => (
                <div 
                  key={prono.id}
                  className={`border rounded-xl p-3 transition-all ${
                    compareIds.includes(prono.id) 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border/50 hover:border-border'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {prono.raceName && (
                        <span className="font-semibold text-sm text-foreground">
                          {prono.raceName}
                        </span>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {format(new Date(prono.timestamp), 'dd MMM yyyy HH:mm', { locale: fr })}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{prono.horseCount} chevaux</span>
                      
                      {/* Show evaluation badge if available */}
                      {prono.evaluation && prono.raceResult && (
                        <EvaluationBadge 
                          evaluation={prono.evaluation} 
                          raceResult={prono.raceResult}
                          compact 
                        />
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {/* Button to add/edit result */}
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setResultDialogProno(prono)}
                        className={prono.raceResult ? 'text-emerald-400' : 'text-amber-400'}
                        title={prono.raceResult ? 'Modifier le résultat' : 'Saisir le résultat'}
                      >
                        <ClipboardCheck className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => toggleCompare(prono.id)}
                        className={compareIds.includes(prono.id) ? 'text-primary' : ''}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => toggleExpand(prono.id)}
                      >
                        {expandedId === prono.id ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => onDelete(prono.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {expandedId === prono.id ? (
                    <div className="mt-3 space-y-3">
                      {/* Show full evaluation if available */}
                      {prono.evaluation && prono.raceResult && (
                        <EvaluationBadge 
                          evaluation={prono.evaluation} 
                          raceResult={prono.raceResult}
                        />
                      )}
                      {formatTipsFull(prono.tips)}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {formatTipsPreview(prono.tips)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Race Result Dialog */}
      {resultDialogProno && (
        <RaceResultDialog
          open={!!resultDialogProno}
          onOpenChange={(open) => !open && setResultDialogProno(null)}
          pronostic={resultDialogProno}
          onSaveResult={onUpdateResult}
        />
      )}
    </>
  );
};

export default SavedPronosticsPanel;

