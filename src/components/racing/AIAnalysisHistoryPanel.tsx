
import { useState } from 'react';
import DOMPurify from 'dompurify';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  History,
  Trash2,
  Eye,
  Flag,
  Brain,
  Clock,
  Target,
  Sparkles,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { AIAnalysisEntry } from '@/hooks/useAIAnalysisHistory';
import { toast } from 'sonner';

interface AIAnalysisHistoryPanelProps {
  history: AIAnalysisEntry[];
  onDelete: (id: string) => void;
  onClearAll: () => void;
  onSelectRace?: (date: string, reunion: number, course: number) => void;
}

const AIAnalysisHistoryPanel = ({
  history,
  onDelete,
  onClearAll,
  onSelectRace,
}: AIAnalysisHistoryPanelProps) => {
  const [selectedAnalysis, setSelectedAnalysis] = useState<AIAnalysisEntry | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatRaceDate = (dateStr: string) => {
    // Format DDMMYYYY to DD/MM/YYYY
    if (dateStr.length === 8) {
      return `${dateStr.slice(0, 2)}/${dateStr.slice(2, 4)}/${dateStr.slice(4)}`;
    }
    return dateStr;
  };

  const handleView = (analysis: AIAnalysisEntry) => {
    setSelectedAnalysis(analysis);
    setViewDialogOpen(true);
  };

  const handleCopy = () => {
    if (selectedAnalysis) {
      navigator.clipboard.writeText(selectedAnalysis.analysis);
      toast.success('Analyse copiée');
    }
  };

  if (history.length === 0) {
    return null;
  }

  const displayedHistory = isExpanded ? history : history.slice(0, 5);

  return (
    <Card className="border-purple-500/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-purple-500" />
            Historique Analyses IA
            <Badge variant="secondary" className="bg-purple-500/10">
              {history.length}
            </Badge>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-destructive">
                <Trash2 className="w-4 h-4 mr-1" />
                Tout effacer
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Supprimer tout l'historique ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Cette action supprimera définitivement toutes les analyses IA sauvegardées.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={onClearAll} className="bg-destructive hover:bg-destructive/90">
                  Supprimer tout
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {displayedHistory.map((entry) => (
          <div
            key={entry.id}
            className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="font-mono">
                  R{entry.reunion}C{entry.course}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {formatRaceDate(entry.date)}
                </span>
                {entry.hasArrivee && (
                  <Badge variant="secondary" className="bg-green-500/20 text-green-600 text-xs">
                    <Flag className="w-3 h-3 mr-1" />
                    Post-course
                  </Badge>
                )}
                <Badge variant="secondary" className="text-xs">
                  <Clock className="w-3 h-3 mr-1" />
                  {entry.snapshotCount} relevé{entry.snapshotCount > 1 ? 's' : ''}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {formatDate(entry.createdAt)}
              </p>
              {entry.arrivee && entry.arrivee.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Arrivée: {entry.arrivee.slice(0, 5).join(' - ')}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1 ml-2">
              {onSelectRace && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onSelectRace(entry.date, entry.reunion, entry.course)}
                  title="Charger cette course"
                >
                  <Target className="w-4 h-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleView(entry)}
              >
                <Eye className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(entry.id)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}

        {history.length > 5 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full mt-2"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-4 h-4 mr-2" />
                Voir moins
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4 mr-2" />
                Voir tout ({history.length})
              </>
            )}
          </Button>
        )}

        {/* View Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-500" />
                Analyse IA - R{selectedAnalysis?.reunion}C{selectedAnalysis?.course}
                {selectedAnalysis?.hasArrivee && (
                  <Badge variant="secondary" className="bg-green-500/20 text-green-600">
                    <Flag className="w-3 h-3 mr-1" />
                    Post-course
                  </Badge>
                )}
              </DialogTitle>
            </DialogHeader>
            <div className="text-xs text-muted-foreground mb-2">
              {selectedAnalysis && formatDate(selectedAnalysis.createdAt)}
              {selectedAnalysis?.arrivee && (
                <span className="ml-4">
                  Arrivée: {selectedAnalysis.arrivee.slice(0, 5).join(' - ')}
                </span>
              )}
            </div>
            <ScrollArea className="flex-1 pr-4">
              <div className="prose prose-sm dark:prose-invert max-w-none">
                {selectedAnalysis?.analysis && (
                  <div className="space-y-4 text-sm whitespace-pre-wrap">
                    {selectedAnalysis.analysis.split('\n').map((line, idx) => {
                      if (line.startsWith('##')) {
                        return (
                          <h3 key={idx} className="text-lg font-bold text-primary mt-4 mb-2 flex items-center gap-2">
                            <Target className="w-4 h-4" />
                            {line.replace(/^#+\s*/, '')}
                          </h3>
                        );
                      }
                      if (line.startsWith('#')) {
                        return (
                          <h2 key={idx} className="text-xl font-bold text-primary mt-6 mb-3">
                            {line.replace(/^#+\s*/, '')}
                          </h2>
                        );
                      }
                      if (line.includes('**')) {
                        const sanitizedHTML = DOMPurify.sanitize(
                          line.replace(/\*\*(.*?)\*\*/g, '<strong class="text-primary">$1</strong>'),
                          { ALLOWED_TAGS: ['strong', 'em', 'u', 'br'], ALLOWED_ATTR: ['class'] }
                        );
                        return (
                          <p key={idx} className="mb-2" dangerouslySetInnerHTML={{ __html: sanitizedHTML }} />
                        );
                      }
                      if (line.trim() === '') {
                        return <div key={idx} className="h-2" />;
                      }
                      return <p key={idx} className="mb-1">{line}</p>;
                    })}
                  </div>
                )}
              </div>
            </ScrollArea>
            <div className="flex gap-2 pt-4 border-t">
              <Button
                onClick={handleCopy}
                variant="outline"
                size="sm"
              >
                <Check className="w-4 h-4 mr-2" />
                Copier
              </Button>
              <Button
                onClick={() => setViewDialogOpen(false)}
                variant="default"
                size="sm"
              >
                Fermer
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default AIAnalysisHistoryPanel;

