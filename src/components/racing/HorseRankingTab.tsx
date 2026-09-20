
import { useState, useMemo, useCallback } from 'react';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/env';
import { generateGeminiContent } from '@/lib/gemini';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart3,
  Trophy,
  Star,
  TrendingDown,
  TrendingUp,
  Users,
  Sparkles,
  Loader2,
  Crown,
  AlertTriangle,
  HelpCircle,
  Target,
  Percent,
  CheckCircle2,
  XCircle,
  Copy,
} from 'lucide-react';
import { OddsSnapshot, HorseOdds } from '@/hooks/useOddsHistory';
import { toast } from 'sonner';
import { useAIPassword } from '@/hooks/useAIPassword';

interface HorseRankingData {
  numero: number;
  name: string;
  rankings: { hour: string; rank: number; cote: number }[];
  avgRank: number;
  bestRank: number;
  worstRank: number;
  latestCote: number;
  firstCote: number;
  evolution: number;
  category: 'favori' | 'outsider' | 'tocard';
}

interface Props {
  snapshots: OddsSnapshot[];
  date: string;
  reunion: number;
  course: number;
  allHistory?: RaceOddsHistory[];
}

interface RaceOddsHistory {
  date: string;
  reunion: number;
  course: number;
  snapshots: OddsSnapshot[];
  arrivee?: {
    positions: number[];
    recordedAt: string;
  };
}

const HorseRankingTab = ({ snapshots, date, reunion, course, allHistory = [] }: Props) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiSynthesis, setAiSynthesis] = useState<string | null>(null);
  const { getSessionToken, getDeviceId } = useAIPassword();

  // Calculate success statistics from all historical races with arrivée
  const successStats = useMemo(() => {
    const racesWithArrivee = allHistory.filter(race => race.arrivee && race.arrivee.positions.length >= 3 && race.snapshots.length > 0);
    
    if (racesWithArrivee.length === 0) {
      return null;
    }

    let totalFavorisInTop3 = 0;
    let totalOutsidersInTop3 = 0;
    let totalTocardsInTop3 = 0;
    let totalFavoris = 0;
    let totalOutsiders = 0;
    let totalTocards = 0;

    racesWithArrivee.forEach(race => {
      const lastSnapshot = race.snapshots[race.snapshots.length - 1];
      const top3Positions = race.arrivee!.positions.slice(0, 3);
      
      // Sort horses by odds to determine categories
      const sortedHorses = [...lastSnapshot.horses].sort((a, b) => a.cote - b.cote);
      
      sortedHorses.forEach((horse, idx) => {
        const rank = idx + 1;
        const isInTop3 = top3Positions.includes(horse.numero);
        
        // Categorize based on rank and odds (same logic as main component)
        let category: 'favori' | 'outsider' | 'tocard';
        if (rank <= 3 || horse.cote <= 5) {
          category = 'favori';
          totalFavoris++;
          if (isInTop3) totalFavorisInTop3++;
        } else if (rank <= 8 || horse.cote <= 15) {
          category = 'outsider';
          totalOutsiders++;
          if (isInTop3) totalOutsidersInTop3++;
        } else {
          category = 'tocard';
          totalTocards++;
          if (isInTop3) totalTocardsInTop3++;
        }
      });
    });

    return {
      totalRaces: racesWithArrivee.length,
      favoris: {
        total: totalFavoris,
        inTop3: totalFavorisInTop3,
        rate: totalFavoris > 0 ? (totalFavorisInTop3 / totalFavoris) * 100 : 0,
      },
      outsiders: {
        total: totalOutsiders,
        inTop3: totalOutsidersInTop3,
        rate: totalOutsiders > 0 ? (totalOutsidersInTop3 / totalOutsiders) * 100 : 0,
      },
      tocards: {
        total: totalTocards,
        inTop3: totalTocardsInTop3,
        rate: totalTocards > 0 ? (totalTocardsInTop3 / totalTocards) * 100 : 0,
      },
    };
  }, [allHistory]);

  // Calculate horse rankings per hour
  const horseRankings = useMemo(() => {
    if (!snapshots || snapshots.length === 0) return [];

    // Collect all horse data across all snapshots
    const horseMap = new Map<number, HorseRankingData>();

    snapshots.forEach((snapshot) => {
      // Sort horses by odds to get ranking for this hour
      const sortedHorses = [...snapshot.horses].sort((a, b) => a.cote - b.cote);

      sortedHorses.forEach((horse, index) => {
        const rank = index + 1;
        
        if (!horseMap.has(horse.numero)) {
          horseMap.set(horse.numero, {
            numero: horse.numero,
            name: horse.name,
            rankings: [],
            avgRank: 0,
            bestRank: Infinity,
            worstRank: 0,
            latestCote: 0,
            firstCote: 0,
            evolution: 0,
            category: 'tocard',
          });
        }

        const horseData = horseMap.get(horse.numero)!;
        horseData.rankings.push({
          hour: snapshot.hour,
          rank,
          cote: horse.cote,
        });
      });
    });

    // Calculate statistics for each horse
    const result: HorseRankingData[] = [];
    
    horseMap.forEach((data) => {
      if (data.rankings.length === 0) return;

      const ranks = data.rankings.map(r => r.rank);
      data.avgRank = ranks.reduce((a, b) => a + b, 0) / ranks.length;
      data.bestRank = Math.min(...ranks);
      data.worstRank = Math.max(...ranks);
      data.latestCote = data.rankings[data.rankings.length - 1].cote;
      data.firstCote = data.rankings[0].cote;
      data.evolution = data.latestCote - data.firstCote;

      // Categorize based on average rank and latest odds
      if (data.avgRank <= 3 || data.latestCote <= 5) {
        data.category = 'favori';
      } else if (data.avgRank <= 8 || data.latestCote <= 15) {
        data.category = 'outsider';
      } else {
        data.category = 'tocard';
      }

      result.push(data);
    });

    // Sort by average rank
    return result.sort((a, b) => a.avgRank - b.avgRank);
  }, [snapshots]);

  // Group by category
  const groupedHorses = useMemo(() => {
    const groups = {
      favoris: horseRankings.filter(h => h.category === 'favori'),
      outsiders: horseRankings.filter(h => h.category === 'outsider'),
      tocards: horseRankings.filter(h => h.category === 'tocard'),
    };
    return groups;
  }, [horseRankings]);

  // Generate AI synthesis
  const generateAISynthesis = useCallback(async () => {
    if (horseRankings.length === 0) {
      toast.error('Aucune donnée à analyser');
      return;
    }

    setIsAnalyzing(true);
    setAiSynthesis('');

    try {
      const synthesisData = {
        favoris: groupedHorses.favoris.map(h => ({
          numero: h.numero,
          name: h.name,
          avgRank: h.avgRank.toFixed(1),
          latestCote: h.latestCote,
          evolution: h.evolution,
        })),
        outsiders: groupedHorses.outsiders.map(h => ({
          numero: h.numero,
          name: h.name,
          avgRank: h.avgRank.toFixed(1),
          latestCote: h.latestCote,
          evolution: h.evolution,
        })),
        tocards: groupedHorses.tocards.map(h => ({
          numero: h.numero,
          name: h.name,
          avgRank: h.avgRank.toFixed(1),
          latestCote: h.latestCote,
          evolution: h.evolution,
        })),
      };

      const prompt = `Tu es un expert en courses hippiques. Analyse ce classement des chevaux basé sur l'évolution de leurs cotes au cours de la journée pour la course R${reunion}C${course} du ${date}.

DONNÉES DE CLASSEMENT:

🏆 FAVORIS (Top 3 en moyenne, cotes ≤ 5):
${synthesisData.favoris.map(h => `- N°${h.numero} ${h.name}: Rang moyen ${h.avgRank}, Cote ${h.latestCote}, Évol ${h.evolution > 0 ? '+' : ''}${h.evolution.toFixed(1)}`).join('\n') || 'Aucun'}

⭐ OUTSIDERS (Rangs 4-8, cotes 5-15):
${synthesisData.outsiders.map(h => `- N°${h.numero} ${h.name}: Rang moyen ${h.avgRank}, Cote ${h.latestCote}, Évol ${h.evolution > 0 ? '+' : ''}${h.evolution.toFixed(1)}`).join('\n') || 'Aucun'}

❓ TOCARDS (Au-delà du top 8, cotes > 15):
${synthesisData.tocards.map(h => `- N°${h.numero} ${h.name}: Rang moyen ${h.avgRank}, Cote ${h.latestCote}, Évol ${h.evolution > 0 ? '+' : ''}${h.evolution.toFixed(1)}`).join('\n') || 'Aucun'}

Fournis une analyse concise (max 300 mots) avec:
1. **Synthèse des favoris**: Qui est le plus joué? Stabilité des favoris?
2. **Outsiders à surveiller**: Quels chevaux montent en puissance?
3. **Tocards dangereux**: Y a-t-il des signaux d'alerte sur des outsiders tardifs?
4. **Recommandation**: Ton avis sur les 3-5 chevaux à privilégier.

Format ta réponse de manière claire avec des emojis et sections bien définies.`;

      let text = '';
      try {
        const resp = await fetch('/api/ai/odds-analysis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ snapshots, date, reunion, course, customPrompt: prompt }),
        });
        if (resp.ok) {
          const data = await resp.json();
          text = data.text || data.result || data.analysis || '';
        }
      } catch (err) {
        console.warn('API route failed, falling back to direct Gemini client generation', err);
      }

      if (!text) {
        try {
          text = await generateGeminiContent(prompt, "Tu es un Algorithme Expert d'Analyse des Cotes Hippiques pour Turf Coaching System.");
        } catch (geminiErr) {
          console.warn('Client Gemini generation failed, using local fallback:', geminiErr);
        }
      }

      if (!text) {
        const { generateLocalOddsAnalysis } = await import('@/lib/wague-turf-logic');
        text = generateLocalOddsAnalysis(snapshots, date, reunion, course);
      }

      setAiSynthesis(text);
      toast.success('Analyse IA générée avec succès');
    } catch (err: any) {
      console.warn('Error generating AI ranking analysis:', err);
      const { generateLocalOddsAnalysis } = await import('@/lib/wague-turf-logic');
      const text = generateLocalOddsAnalysis(snapshots, date, reunion, course);
      setAiSynthesis(text);
      toast.success('Analyse IA générée avec succès');
    } finally {
      setIsAnalyzing(false);
    }
  }, [horseRankings, groupedHorses, snapshots, date, reunion, course]);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'favori':
        return <Crown className="w-4 h-4 text-yellow-500" />;
      case 'outsider':
        return <Star className="w-4 h-4 text-blue-500" />;
      default:
        return <HelpCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'favori':
        return 'border-yellow-500/50 bg-yellow-500/5';
      case 'outsider':
        return 'border-blue-500/50 bg-blue-500/5';
      default:
        return 'border-gray-500/50 bg-gray-500/5';
    }
  };

  if (!snapshots || snapshots.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <BarChart3 className="w-12 h-12 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">Aucun relevé disponible pour afficher le classement</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with AI button */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Classement par Popularité
              <Badge variant="outline">{horseRankings.length} chevaux</Badge>
            </CardTitle>
            <Button
              onClick={generateAISynthesis}
              disabled={isAnalyzing}
              size="sm"
              className="bg-gradient-to-r from-purple-500 to-pink-500 text-white"
            >
              {isAnalyzing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              Synthèse IA
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Success Statistics */}
      {successStats && (
        <Card className="border-emerald-500/30 bg-gradient-to-r from-emerald-500/5 to-teal-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Target className="w-5 h-5 text-emerald-500" />
              Statistiques de Réussite Historiques
              <Badge variant="outline" className="ml-2">{successStats.totalRaces} courses analysées</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Favoris Stats */}
              <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <Crown className="w-5 h-5 text-yellow-500" />
                  <span className="font-semibold text-yellow-600 dark:text-yellow-400">Favoris</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                      {successStats.favoris.rate.toFixed(1)}%
                    </span>
                    <Percent className="w-4 h-4 text-yellow-500" />
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-green-500" />
                      {successStats.favoris.inTop3} dans Top 3
                    </div>
                    <div>sur {successStats.favoris.total} chevaux</div>
                  </div>
                </div>
                <div className="mt-2 h-2 bg-yellow-200 dark:bg-yellow-900 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-yellow-500 rounded-full transition-all"
                    style={{ width: `${Math.min(successStats.favoris.rate, 100)}%` }}
                  />
                </div>
              </div>

              {/* Outsiders Stats */}
              <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <Star className="w-5 h-5 text-blue-500" />
                  <span className="font-semibold text-blue-600 dark:text-blue-400">Outsiders</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                      {successStats.outsiders.rate.toFixed(1)}%
                    </span>
                    <Percent className="w-4 h-4 text-blue-500" />
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-green-500" />
                      {successStats.outsiders.inTop3} dans Top 3
                    </div>
                    <div>sur {successStats.outsiders.total} chevaux</div>
                  </div>
                </div>
                <div className="mt-2 h-2 bg-blue-200 dark:bg-blue-900 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 rounded-full transition-all"
                    style={{ width: `${Math.min(successStats.outsiders.rate, 100)}%` }}
                  />
                </div>
              </div>

              {/* Tocards Stats */}
              <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-5 h-5 text-orange-500" />
                  <span className="font-semibold text-orange-600 dark:text-orange-400">Tocards</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                      {successStats.tocards.rate.toFixed(1)}%
                    </span>
                    <Percent className="w-4 h-4 text-orange-500" />
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-green-500" />
                      {successStats.tocards.inTop3} dans Top 3
                    </div>
                    <div>sur {successStats.tocards.total} chevaux</div>
                  </div>
                </div>
                <div className="mt-2 h-2 bg-orange-200 dark:bg-orange-900 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-orange-500 rounded-full transition-all"
                    style={{ width: `${Math.min(successStats.tocards.rate, 100)}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 text-xs text-muted-foreground text-center">
              📊 Basé sur {successStats.totalRaces} course{successStats.totalRaces > 1 ? 's' : ''} avec arrivée enregistrée
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Synthesis */}
      {aiSynthesis && (
        <Card className="border-purple-500/30 bg-gradient-to-r from-purple-500/5 to-pink-500/5">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Sparkles className="w-5 h-5 text-purple-500" />
                Synthèse IA - Classement Global
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(aiSynthesis);
                  toast.success('Synthèse copiée dans le presse-papier');
                }}
                className="flex items-center gap-1"
              >
                <Copy className="w-4 h-4" />
                Copier
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <div className="prose prose-sm dark:prose-invert max-w-none text-sm whitespace-pre-wrap pr-4">
                {aiSynthesis.split('\n').map((line, idx) => {
                  if (line.startsWith('##') || line.startsWith('**')) {
                    return (
                      <p key={idx} className="font-bold text-primary mt-3 mb-1">
                        {line.replace(/^#+\s*/, '').replace(/\*\*/g, '')}
                      </p>
                    );
                  }
                  if (line.trim() === '') return <div key={idx} className="h-2" />;
                  return <p key={idx} className="mb-1">{line}</p>;
                })}
                {isAnalyzing && <span className="inline-block w-2 h-4 bg-purple-500 animate-pulse ml-1" />}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Category Groups */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all" className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            Tous
          </TabsTrigger>
          <TabsTrigger value="favoris" className="flex items-center gap-1">
            <Crown className="w-4 h-4 text-yellow-500" />
            Favoris ({groupedHorses.favoris.length})
          </TabsTrigger>
          <TabsTrigger value="outsiders" className="flex items-center gap-1">
            <Star className="w-4 h-4 text-blue-500" />
            Outsiders ({groupedHorses.outsiders.length})
          </TabsTrigger>
          <TabsTrigger value="tocards" className="flex items-center gap-1">
            <AlertTriangle className="w-4 h-4 text-orange-500" />
            Tocards ({groupedHorses.tocards.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <HorseRankingTable horses={horseRankings} snapshots={snapshots} />
        </TabsContent>

        <TabsContent value="favoris" className="mt-4">
          <Card className="border-yellow-500/30">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-yellow-600">
                <Crown className="w-5 h-5" />
                Favoris - Les Plus Joués
              </CardTitle>
            </CardHeader>
            <CardContent>
              <HorseRankingTable horses={groupedHorses.favoris} snapshots={snapshots} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="outsiders" className="mt-4">
          <Card className="border-blue-500/30">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-blue-600">
                <Star className="w-5 h-5" />
                Outsiders - À Surveiller
              </CardTitle>
            </CardHeader>
            <CardContent>
              <HorseRankingTable horses={groupedHorses.outsiders} snapshots={snapshots} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tocards" className="mt-4">
          <Card className="border-orange-500/30">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-orange-600">
                <AlertTriangle className="w-5 h-5" />
                Tocards - Peu Joués
              </CardTitle>
            </CardHeader>
            <CardContent>
              <HorseRankingTable horses={groupedHorses.tocards} snapshots={snapshots} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Hourly Rankings Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            Classement Horaire (Plus Joués → Moins Joués)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] w-full">
            <div className="min-w-max">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-background z-10">
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-2">N°</th>
                    <th className="text-left py-2 px-2">Cheval</th>
                    <th className="text-center py-2 px-2">Cat.</th>
                    {snapshots.map((s, i) => (
                      <th key={i} className="text-center py-2 px-2 min-w-[50px]">
                        {s.hour}
                      </th>
                    ))}
                    <th className="text-center py-2 px-2">Moy.</th>
                  </tr>
                </thead>
                <tbody>
                  {horseRankings.map((horse) => (
                    <tr 
                      key={horse.numero} 
                      className={`border-b border-border/50 hover:bg-muted/50 ${getCategoryColor(horse.category)}`}
                    >
                      <td className="py-2 px-2">
                        <Badge variant="outline">{horse.numero}</Badge>
                      </td>
                      <td className="py-2 px-2 font-medium truncate max-w-[100px]" title={horse.name}>
                        {horse.name}
                      </td>
                      <td className="text-center py-2 px-2">
                        {getCategoryIcon(horse.category)}
                      </td>
                      {snapshots.map((snapshot, i) => {
                        const ranking = horse.rankings.find(r => r.hour === snapshot.hour);
                        const rank = ranking?.rank;
                        
                        let rankClass = '';
                        if (rank === 1) rankClass = 'bg-yellow-500 text-yellow-950 font-bold';
                        else if (rank === 2) rankClass = 'bg-gray-300 text-gray-800 font-bold';
                        else if (rank === 3) rankClass = 'bg-amber-600 text-amber-50 font-bold';
                        else if (rank && rank <= 5) rankClass = 'text-green-600 font-semibold';

                        return (
                          <td key={i} className="text-center py-2 px-2">
                            {rank ? (
                              <span className={`inline-block min-w-[24px] rounded px-1 ${rankClass}`}>
                                {rank}
                              </span>
                            ) : (
                              '-'
                            )}
                          </td>
                        );
                      })}
                      <td className="text-center py-2 px-2 font-bold text-primary">
                        {horse.avgRank.toFixed(1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

// Sub-component for horse ranking table in category views
const HorseRankingTable = ({ horses, snapshots }: { horses: HorseRankingData[]; snapshots: OddsSnapshot[] }) => {
  if (horses.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-4">Aucun cheval dans cette catégorie</p>;
  }

  return (
    <div className="space-y-2">
      {horses.map((horse, idx) => (
        <div 
          key={horse.numero} 
          className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
        >
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
            {idx + 1}
          </div>
          <Badge variant="outline" className="min-w-[40px] justify-center">
            N°{horse.numero}
          </Badge>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{horse.name}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Rang moy: <strong className="text-foreground">{horse.avgRank.toFixed(1)}</strong></span>
              <span>|</span>
              <span>Meilleur: <strong className="text-green-500">{horse.bestRank}</strong></span>
              <span>|</span>
              <span>Pire: <strong className="text-red-500">{horse.worstRank}</strong></span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold">{horse.latestCote.toFixed(1)}</div>
            <div className={`text-xs flex items-center justify-end gap-1 ${
              horse.evolution < 0 ? 'text-green-500' : horse.evolution > 0 ? 'text-red-500' : 'text-muted-foreground'
            }`}>
              {horse.evolution < 0 ? <TrendingDown className="w-3 h-3" /> : horse.evolution > 0 ? <TrendingUp className="w-3 h-3" /> : null}
              {horse.evolution > 0 ? '+' : ''}{horse.evolution.toFixed(1)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default HorseRankingTab;

