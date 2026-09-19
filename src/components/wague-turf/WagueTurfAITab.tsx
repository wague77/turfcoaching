
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
    if (!horses.length) {
      toast.error("Analysez d'abord une course avant de lancer l'IA");
      return;
    }

    setLoading(true);
    setResponse('');
    setSaved(false);

    try {
      let text = '';
      try {
        const resp = await fetch('/api/ai/wague-ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ horses, discipline, raceInfo }),
        });
        if (resp.ok) {
          const data = await resp.json();
          text = data.text || data.response || '';
        }
      } catch (err) {
        console.warn('API route failed, falling back to direct Gemini client generation', err);
      }

      if (!text) {
        const prompt = `Analyse les chevaux WAGUE-TURF : ${JSON.stringify(horses).slice(0, 3000)}`;
        text = await generateGeminiContent(prompt, "Tu es le Moteur d'IA Avancée WAGUE-TURF.");
      }

      setResponse(text);
      toast.success("Analyse WAGUE-TURF IA Gemini générée avec succès !");
    } catch (err: any) {
      toast.error(err?.message || "Erreur lors de l'analyse IA Gemini");
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
              disabled={loading || !horses.length}
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

