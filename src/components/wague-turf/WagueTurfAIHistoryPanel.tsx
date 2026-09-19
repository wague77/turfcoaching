
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  History, Trash2, ChevronDown, ChevronUp, Trophy, Target,
  BarChart3, AlertTriangle, X, CheckCircle2, TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';
import { WagueTurfAIEntry } from '@/hooks/useWagueTurfAIHistory';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';
import ReactMarkdown from 'react-markdown';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, ReferenceLine } from 'recharts';

interface WagueTurfAIHistoryPanelProps {
  history: WagueTurfAIEntry[];
  onAddArrival: (id: string, arrival: number[]) => void;
  onDelete: (id: string) => void;
  onClear: () => void;
  stats: { total: number; compared: number; avgSuccess: number; winnerRate: number; avgTierce: number } | null;
}

function ArrivalInput({ entryId, onSubmit }: { entryId: string; onSubmit: (id: string, arr: number[]) => void }) {
  const [input, setInput] = useState('');

  const handleSubmit = () => {
    const nums = input.split(/[\s,;-]+/).map(Number).filter(n => n > 0);
    if (nums.length < 3) {
      toast.error('Entrez au moins 3 numéros (ex: 5 12 3 8 1)');
      return;
    }
    onSubmit(entryId, nums.slice(0, 5));
    setInput('');
    toast.success('Arrivée enregistrée et comparaison effectuée !');
  };

  return (
    <div className="flex gap-2 items-center mt-2">
      <Input
        value={input}
        onChange={e => setInput(e.target.value)}
        placeholder="Arrivée: 5 12 3 8 1"
        className="flex-1 text-sm"
        onKeyDown={e => e.key === 'Enter' && handleSubmit()}
      />
      <Button size="sm" onClick={handleSubmit} className="gap-1">
        <CheckCircle2 className="w-3.5 h-3.5" /> OK
      </Button>
    </div>
  );
}

function getSuccessColor(rate: number) {
  if (rate >= 50) return 'bg-green-500/20 text-green-400 border-green-500/30';
  if (rate >= 25) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
  return 'bg-red-500/20 text-red-400 border-red-500/30';
}

export function WagueTurfAIHistoryPanel({ history, onAddArrival, onDelete, onClear, stats }: WagueTurfAIHistoryPanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (history.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center text-muted-foreground">
          <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Aucune analyse IA sauvegardée</p>
          <p className="text-xs mt-1">Lancez une analyse IA puis sauvegardez-la</p>
        </CardContent>
      </Card>
    );
  }

  // Build chart data from compared entries (chronological order)
  const chartData = history
    .filter(e => e.comparison)
    .reverse()
    .map((e, i) => {
      const label = e.raceInfo?.replace(/\s*-\s*\d+$/, '') || `#${i + 1}`;
      return {
        name: label,
        success: e.comparison!.successRate,
        tierce: e.comparison!.tierceHits,
        quinte: e.comparison!.quinteHits,
        winner: e.comparison!.winnerPredicted ? 1 : 0,
      };
    });

  // Compute running average
  let runSum = 0;
  const chartDataWithAvg = chartData.map((d, i) => {
    runSum += d.success;
    return { ...d, avg: Math.round(runSum / (i + 1)) };
  });

  return (
    <div className="space-y-4">
      {/* Stats */}
      {stats && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              Statistiques globales ({stats.compared} comparaisons)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-3 text-center">
              <div>
                <div className="text-lg font-bold text-primary">{stats.avgSuccess}%</div>
                <div className="text-[10px] text-muted-foreground">Succès moyen</div>
              </div>
              <div>
                <div className="text-lg font-bold text-green-400">{stats.winnerRate}%</div>
                <div className="text-[10px] text-muted-foreground">Gagnant prédit</div>
              </div>
              <div>
                <div className="text-lg font-bold text-amber-400">{stats.avgTierce}</div>
                <div className="text-[10px] text-muted-foreground">Moy. Tiercé /3</div>
              </div>
              <div>
                <div className="text-lg font-bold">{stats.total}</div>
                <div className="text-[10px] text-muted-foreground">Total analyses</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance Evolution Chart */}
      {chartDataWithAvg.length >= 2 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Évolution des performances IA
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartDataWithAvg} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <defs>
                    <linearGradient id="successGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} unit="%" />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                    formatter={(value: number, name: string) => {
                      const labels: Record<string, string> = { success: 'Succès', avg: 'Moyenne cumulée' };
                      return [`${value}%`, labels[name] || name];
                    }}
                  />
                  <ReferenceLine y={50} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" strokeOpacity={0.5} />
                  <Area type="monotone" dataKey="success" stroke="hsl(var(--primary))" fill="url(#successGradient)" strokeWidth={2} dot={{ r: 4, fill: 'hsl(var(--primary))' }} />
                  <Line type="monotone" dataKey="avg" stroke="hsl(var(--destructive))" strokeWidth={1.5} strokeDasharray="5 5" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-4 mt-2 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-primary inline-block rounded" /> Taux de succès</span>
              <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-destructive inline-block rounded border-dashed" /> Moyenne cumulée</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Header with clear button */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{history.length} analyse(s) sauvegardée(s)</span>
        <Button variant="ghost" size="sm" onClick={onClear} className="text-xs text-destructive gap-1">
          <Trash2 className="w-3 h-3" /> Tout effacer
        </Button>
      </div>

      {/* Entries */}
      <div className="space-y-2">
        {history.map(entry => (
          <Collapsible
            key={entry.id}
            open={expandedId === entry.id}
            onOpenChange={open => setExpandedId(open ? entry.id : null)}
          >
            <div className={`rounded-lg border p-3 ${entry.comparison ? 'border-primary/20' : 'border-border'}`}>
              <CollapsibleTrigger className="w-full">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-left">
                    <Trophy className="w-4 h-4 text-amber-500 shrink-0" />
                    <div>
                      <div className="font-medium text-sm">{entry.raceInfo || 'Course'}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {new Date(entry.timestamp).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        {' • '}{entry.horsesSnapshot.length} partants
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {entry.comparison ? (
                      <Badge className={`text-[10px] ${getSuccessColor(entry.comparison.successRate)}`}>
                        {entry.comparison.successRate}%
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">
                        <AlertTriangle className="w-3 h-3 mr-1" />En attente
                      </Badge>
                    )}
                    {expandedId === entry.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="mt-3 pt-3 border-t border-border space-y-3">
                  {/* Comparison result */}
                  {entry.comparison && (
                    <div className="rounded-lg bg-muted/50 p-3 space-y-1">
                      <div className="text-xs font-medium flex items-center gap-1">
                        <Target className="w-3.5 h-3.5" /> Comparaison avec l'arrivée
                      </div>
                      <pre className="text-xs whitespace-pre-wrap font-sans">{entry.comparison.details}</pre>
                      {entry.arrival && (
                        <div className="text-[11px] text-muted-foreground mt-1">
                          Arrivée: {entry.arrival.map((n, i) => (
                            <span key={i} className={i === 0 ? 'font-bold text-primary' : ''}>
                              {i > 0 ? ' - ' : ''}N°{n}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Add arrival if not yet compared */}
                  {!entry.arrival && (
                    <ArrivalInput entryId={entry.id} onSubmit={onAddArrival} />
                  )}

                  {/* AI response preview */}
                  <div className="max-h-[300px] overflow-y-auto rounded border border-border bg-background/80 p-3 scrollbar-cyber">
                    <div className="prose prose-invert prose-sm max-w-none text-xs">
                      <ReactMarkdown>{entry.aiResponse}</ReactMarkdown>
                    </div>
                  </div>

                  <Button variant="ghost" size="sm" onClick={() => onDelete(entry.id)} className="text-xs text-destructive gap-1">
                    <X className="w-3 h-3" /> Supprimer
                  </Button>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        ))}
      </div>
    </div>
  );
}

