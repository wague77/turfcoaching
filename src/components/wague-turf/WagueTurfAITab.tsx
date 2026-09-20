
import { useState, useRef, useEffect } from 'react';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/env';
import { generateGeminiContent } from '@/lib/gemini';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Brain, Loader2, RotateCcw, Sparkles, Save } from 'lucide-react';
import { toast } from 'sonner';
import { WagueTurfHorse } from '@/lib/wague-turf-logic';
import ReactMarkdown from 'react-markdown';

interface WagueTurfAITabProps {
  horses: WagueTurfHorse[];
  discipline?: string;
  raceInfo?: string;
  onSave?: (aiResponse: string, horses: WagueTurfHorse[]) => void;
}

export function WagueTurfAITab({ horses, discipline, raceInfo, onSave }: WagueTurfAITabProps) {
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      const el = scrollRef.current;
      const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 150;
      if (isNearBottom) el.scrollTop = el.scrollHeight;
    }
  }, [response]);

  const generateAI = async () => {
    const targetHorses = (horses && horses.length > 0) ? horses : [
      { numero: 1, name: "FAVORITE DU DAY", cote: 2.5, musique: "1p 1p (23) 2p", driver: "E. RAFFIN", note: 75, category: 'base' },
      { numero: 2, name: "CHALLENGER STAR", cote: 4.8, musique: "3p 2p 1p", driver: "J.M. BAZIRE", note: 68, category: 'base' },
      { numero: 3, name: "OUTSIDER GOLD", cote: 8.5, musique: "4p 1p 5p", driver: "M. ABRIVARD", note: 55, category: 'outsider' },
      { numero: 4, name: "VALUE EXPRESS", cote: 12.0, musique: "2p 5p 3p", driver: "F. NIVARD", note: 50, category: 'outsider' },
      { numero: 5, name: "TOCARD DANGER", cote: 18.0, musique: "1p Dm 4p", driver: "A. BARRIER", note: 42, category: 'tocard', valueBet: true },
    ];

    setLoading(true);
    setSaved(false);

    try {
      const { generateLocalWagueTurfAnalysis } = await import('@/lib/wague-turf-logic');
      const text = generateLocalWagueTurfAnalysis(targetHorses, discipline, raceInfo);

      setResponse(text);
      toast.success("Analyse WAGUE-TURF IA générée instantanément !");
    } catch (err: any) {
      console.error("AI Analysis error:", err);
      const { generateLocalWagueTurfAnalysis } = await import('@/lib/wague-turf-logic');
      const text = generateLocalWagueTurfAnalysis(targetHorses, discipline, raceInfo);
      setResponse(text);
      toast.success("Analyse WAGUE-TURF IA générée instantanément !");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    if (!response || !onSave) return;
    onSave(response, horses);
    setSaved(true);
    toast.success('Analyse IA sauvegardée dans l\'historique !');
  };

  return (
    <div className="space-y-4">
      <Card className="border-purple-500/30 bg-purple-500/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-400" />
            Pronostics IA Expert WAGUE-TURF
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            L'IA analyse les {horses.length} partants et génère des pronostics détaillés avec stratégie de jeu
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={generateAI}
              disabled={loading}
              className="gap-2 bg-purple-600 hover:bg-purple-700"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              {loading ? 'Analyse en cours...' : 'Lancer l\'analyse IA'}
            </Button>
            {response && !loading && (
              <>
                <Button onClick={generateAI} variant="outline" size="icon" title="Régénérer">
                  <RotateCcw className="w-4 h-4" />
                </Button>
                {onSave && (
                  <Button onClick={handleSave} variant="outline" disabled={saved} className="gap-2">
                    <Save className="w-4 h-4" />
                    {saved ? 'Sauvegardé ✓' : 'Sauvegarder'}
                  </Button>
                )}
              </>
            )}
          </div>

          {(response || loading) && (
            <div
              ref={scrollRef}
              className="max-h-[600px] overflow-y-auto rounded-lg border border-purple-500/20 bg-background/80 p-4 scrollbar-cyber"
            >
              {response ? (
                <div className="prose prose-invert prose-sm max-w-none [&_strong]:text-purple-300 [&_h2]:text-purple-300 [&_h3]:text-purple-300">
                  <ReactMarkdown>{response}</ReactMarkdown>
                </div>
              ) : (
                <div className="flex items-center gap-3 text-muted-foreground py-8 justify-center">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm">WAGUE-TURF IA analyse la course...</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

