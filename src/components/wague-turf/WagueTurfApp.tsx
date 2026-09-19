
import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Trophy, Target, TrendingUp, AlertTriangle, DollarSign,
  Zap, Users, Star, ChevronDown, ChevronUp, Loader2,
  RefreshCw, Award, BarChart3, Lightbulb, Hash, Brain, History,
  ShieldCheck, ShieldAlert, Search
} from 'lucide-react';
import { WagueTurfAITab } from './WagueTurfAITab';
import { WagueTurfAIHistoryPanel } from './WagueTurfAIHistoryPanel';
import { useWagueTurfAIHistory } from '@/hooks/useWagueTurfAIHistory';
import { toast } from 'sonner';
import { fetchPMUData, PMUHorse } from '@/lib/pmu-api';
import { analyzeWagueTurf, WagueTurfResult, WagueTurfHorse, Couple } from '@/lib/wague-turf-logic';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

function getCategoryColor(cat: string) {
  switch (cat) {
    case 'base': return 'bg-green-500/20 text-green-400 border-green-500/30';
    case 'outsider': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    case 'tocard': return 'bg-red-500/20 text-red-400 border-red-500/30';
    default: return 'bg-muted text-muted-foreground';
  }
}

function getDifficultyColor(d: string) {
  switch (d) {
    case 'facile': return 'bg-green-500/20 text-green-400';
    case 'moyen': return 'bg-yellow-500/20 text-yellow-400';
    case 'difficile': return 'bg-red-500/20 text-red-400';
    default: return 'bg-muted text-muted-foreground';
  }
}

function HorseCard({ horse, rank }: { horse: WagueTurfHorse; rank?: number }) {
  const [open, setOpen] = useState(false);
  
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className={`rounded-lg border p-3 ${horse.isFauxFavori ? 'border-yellow-500/50 bg-yellow-500/5' : 'border-border bg-card/50'}`}>
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {rank !== undefined && (
                <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                  {rank}
                </div>
              )}
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <span className="font-bold">N°{horse.numero}</span>
                  <span className="text-sm">{horse.name}</span>
                  {horse.isFauxFavori && (
                    <Badge variant="outline" className="text-[10px] border-yellow-500/50 text-yellow-400">
                      <AlertTriangle className="w-3 h-3 mr-1" />FAUX FAVORI
                    </Badge>
                  )}
                  {horse.valueBet && (
                    <Badge variant="outline" className="text-[10px] border-green-500/50 text-green-400">
                      <DollarSign className="w-3 h-3 mr-1" />VALUE
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                  <span>Cote: {horse.cote.toFixed(1)}</span>
                  <span>•</span>
                  <span>Driver: {horse.driver || '?'}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={`text-xs ${getCategoryColor(horse.category)}`}>
                {horse.category.toUpperCase()}
              </Badge>
              <div className="text-right">
                <div className="text-lg font-bold text-primary">{horse.note.toFixed(1)}</div>
                <div className="text-[10px] text-muted-foreground">NOTE</div>
              </div>
              {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </div>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-3 pt-3 border-t border-border space-y-2">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div><span className="text-muted-foreground">Musique:</span> <span className="font-mono">{horse.musique || '-'}</span></div>
              <div><span className="text-muted-foreground">Courses:</span> {horse.numberOfRaces} ({horse.numberOfWins}V/{horse.numberOfPlaces}P)</div>
              <div><span className="text-muted-foreground">Gains carrière:</span> {(horse.gainsCareer / 100).toLocaleString('fr-FR')}€</div>
              <div><span className="text-muted-foreground">Gains année:</span> {(horse.gainsCurrentYear / 100).toLocaleString('fr-FR')}€</div>
              <div><span className="text-muted-foreground">Proba estimée:</span> {(horse.estimatedProba * 100).toFixed(1)}%</div>
              <div><span className="text-muted-foreground">Value ratio:</span> <span className={horse.valueRatio > 1.3 ? 'text-green-400 font-bold' : ''}>{horse.valueRatio.toFixed(2)}</span></div>
            </div>
            <div className="text-xs space-y-1">
              <p className="text-muted-foreground font-medium">Détail note:</p>
              <div className="grid grid-cols-3 gap-1 text-[11px]">
                <span>Cote: +{horse.noteDetails.baseCote.toFixed(1)}</span>
                <span>Forme: +{horse.noteDetails.bonusForme.toFixed(1)}</span>
                <span>Gains: +{horse.noteDetails.bonusGains.toFixed(1)}</span>
                <span>Driver: +{horse.noteDetails.bonusDriver.toFixed(1)}</span>
                <span>Victoires: +{horse.noteDetails.bonusVictoire.toFixed(1)}</span>
                <span className="text-red-400">Pénalité: -{horse.noteDetails.penalitePosition.toFixed(1)}</span>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

export function WagueTurfApp() {
  const [date, setDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0].replace(/-/g, '');
  });
  const [reunion, setReunion] = useState(1);
  const [course, setCourse] = useState(1);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<WagueTurfResult | null>(null);
  const [pmuHorses, setPmuHorses] = useState<PMUHorse[]>([]);
  const aiHistory = useWagueTurfAIHistory();
  const [analyseFilter, setAnalyseFilter] = useState<'all' | 'base' | 'outsider' | 'tocard'>('all');
  const [analyseSort, setAnalyseSort] = useState<'note' | 'cote' | 'default'>('default');

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      const formattedDate = date.includes('-') ? date.replace(/-/g, '') : date;
      const response = await fetchPMUData(formattedDate, reunion, course);
      
      if (!response.success || !response.horses?.length) {
        toast.error(response.error || 'Aucune donnée trouvée pour cette course');
        return;
      }
      
      setPmuHorses(response.horses);
      const analysis = analyzeWagueTurf(response.horses);
      setResult(analysis);
      toast.success(`Analyse WAGUE-TURF terminée: ${response.horses.length} partants`);
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors de la récupération des données');
    } finally {
      setLoading(false);
    }
  };

  // Also allow importing from persisted race data (like Turf Coaching does)
  const handleImportLocal = () => {
    try {
      const stored = localStorage.getItem('persisted-race-data');
      if (!stored) {
        toast.error("Aucune donnée locale. Récupérez d'abord les données PMU depuis l'onglet principal.");
        return;
      }
      const data = JSON.parse(stored);
      const fetchedHorses = data.fetchedHorses as PMUHorse[];
      if (!fetchedHorses?.length) {
        toast.error("Pas de données chevaux en mémoire");
        return;
      }
      setPmuHorses(fetchedHorses);
      const analysis = analyzeWagueTurf(fetchedHorses);
      setResult(analysis);
      toast.success(`Import local: ${fetchedHorses.length} chevaux analysés`);
    } catch {
      toast.error("Erreur lors de l'import local");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-br from-amber-600/20 via-primary/10 to-transparent border-amber-600/30 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-40 h-40 bg-amber-600/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-600/20 rounded-xl">
              <Trophy className="w-7 h-7 text-amber-500" />
            </div>
            <div>
              <CardTitle className="text-2xl">WAGUE-TURF</CardTitle>
              <p className="text-sm text-muted-foreground">Expert PMU • 60 ans d'expérience • Analyse prédictive avancée</p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Data Input */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Date (JJMMAAAA)</label>
              <Input 
                value={date} 
                onChange={e => setDate(e.target.value)} 
                placeholder="01022026" 
                className="w-32"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Réunion</label>
              <Input 
                type="number" 
                value={reunion} 
                onChange={e => setReunion(Number(e.target.value))} 
                min={1} max={10} 
                className="w-20"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Course</label>
              <Input 
                type="number" 
                value={course} 
                onChange={e => setCourse(Number(e.target.value))} 
                min={1} max={12} 
                className="w-20"
              />
            </div>
            <Button onClick={handleAnalyze} disabled={loading} className="gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              Analyser
            </Button>
            <Button onClick={handleImportLocal} variant="outline" className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Import local
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <Tabs defaultValue="pronostics" className="space-y-4">
          <TabsList className="grid grid-cols-4 md:grid-cols-8 w-full">
            <TabsTrigger value="pronostics" className="text-xs gap-1">
              <Target className="w-3.5 h-3.5" />Pronostics
            </TabsTrigger>
            <TabsTrigger value="top3" className="text-xs gap-1">
              <Trophy className="w-3.5 h-3.5" />Top 3
            </TabsTrigger>
            <TabsTrigger value="analyse-avancee" className="text-xs gap-1">
              <Search className="w-3.5 h-3.5" />Analyse+
            </TabsTrigger>
            <TabsTrigger value="ia" className="text-xs gap-1">
              <Brain className="w-3.5 h-3.5" />IA
            </TabsTrigger>
            <TabsTrigger value="historique-ia" className="text-xs gap-1">
              <History className="w-3.5 h-3.5" />Historique
            </TabsTrigger>
            <TabsTrigger value="outsiders" className="text-xs gap-1">
              <Star className="w-3.5 h-3.5" />Outsiders
            </TabsTrigger>
            <TabsTrigger value="couples" className="text-xs gap-1">
              <Users className="w-3.5 h-3.5" />Couplés
            </TabsTrigger>
            <TabsTrigger value="classement" className="text-xs gap-1">
              <BarChart3 className="w-3.5 h-3.5" />Classement
            </TabsTrigger>
          </TabsList>

          {/* Pronostics Tab */}
          <TabsContent value="pronostics" className="space-y-4">
            {/* Commentaire expert */}
            <Card className="border-amber-600/30 bg-amber-600/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-amber-500" />
                  Analyse Expert WAGUE-TURF
                </CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed">{result.commentaire}</pre>
              </CardContent>
            </Card>

            {/* Tiercé */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  Tiercé (Top 3 Notes)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {result.tierce.map((h, i) => (
                  <HorseCard key={h.numero} horse={h} rank={i + 1} />
                ))}
              </CardContent>
            </Card>

            {/* Analyse détaillée du Tiercé */}
            <Card className="border-primary/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Search className="w-5 h-5 text-primary" />
                  Analyse détaillée du Tiercé
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {result.tierce.map((h, i) => {
                  const winRate = h.numberOfRaces > 0 ? (h.numberOfWins / h.numberOfRaces) * 100 : 0;
                  const placeRate = h.numberOfRaces > 0 ? (h.numberOfPlaces / h.numberOfRaces) * 100 : 0;
                  const recentTop3 = h.forme.slice(0, 3).filter(p => p >= 1 && p <= 3).length;
                  const hasRecentWin = h.forme.slice(0, 3).some(p => p === 1);
                  const avgNote = result.horses.reduce((s, x) => s + x.note, 0) / result.horses.length;

                  // Verdict logic
                  const points = [
                    h.note >= avgNote * 1.2,       // Note bien au-dessus de la moyenne
                    !h.isFauxFavori,                // Pas un faux favori
                    recentTop3 >= 2,                // Forme récente solide
                    h.valueRatio >= 1.0,            // Cote justifiée
                    winRate >= 15,                   // Bon taux de victoire
                    h.noteDetails.bonusDriver > 0,  // Driver de qualité
                  ];
                  const score = points.filter(Boolean).length;
                  const isCoupSur = score >= 4;
                  const verdict = isCoupSur ? 'COUP SÛR' : 'DOUTEUX';
                  const verdictColor = isCoupSur
                    ? 'bg-green-500/15 border-green-500/40 text-green-400'
                    : 'bg-amber-500/15 border-amber-500/40 text-amber-400';
                  const VerdictIcon = isCoupSur ? ShieldCheck : ShieldAlert;

                  return (
                    <div key={h.numero} className={`rounded-xl border p-4 space-y-3 ${verdictColor}`}>
                      {/* Header with verdict */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                            {i + 1}
                          </div>
                          <div>
                            <span className="font-bold text-foreground">N°{h.numero} {h.name}</span>
                            <div className="text-xs text-muted-foreground">Cote {h.cote.toFixed(1)} • Driver: {h.driver || '?'}</div>
                          </div>
                        </div>
                        <Badge className={`gap-1 text-xs font-bold ${verdictColor}`}>
                          <VerdictIcon className="w-3.5 h-3.5" />
                          {verdict}
                        </Badge>
                      </div>

                      {/* Criteria grid */}
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                        <div className={`rounded-lg p-2 ${points[0] ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                          <div className="text-muted-foreground">Note</div>
                          <div className="font-bold text-foreground">{h.note.toFixed(1)} <span className="font-normal text-muted-foreground">/ moy {avgNote.toFixed(1)}</span></div>
                          <div className="text-[10px]">{points[0] ? '✅ Au-dessus' : '⚠️ En-dessous'}</div>
                        </div>
                        <div className={`rounded-lg p-2 ${points[2] ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                          <div className="text-muted-foreground">Forme récente</div>
                          <div className="font-bold text-foreground font-mono">{h.musique.slice(0, 15) || '-'}</div>
                          <div className="text-[10px]">{hasRecentWin ? '✅ Victoire récente' : recentTop3 >= 2 ? '✅ Régulier Top 3' : '⚠️ Forme moyenne'}</div>
                        </div>
                        <div className={`rounded-lg p-2 ${points[4] ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                          <div className="text-muted-foreground">Stats carrière</div>
                          <div className="font-bold text-foreground">{h.numberOfWins}V/{h.numberOfPlaces}P sur {h.numberOfRaces}</div>
                          <div className="text-[10px]">{winRate >= 15 ? `✅ ${winRate.toFixed(0)}% victoires` : `⚠️ ${winRate.toFixed(0)}% victoires`}</div>
                        </div>
                        <div className={`rounded-lg p-2 ${points[3] ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                          <div className="text-muted-foreground">Value</div>
                          <div className="font-bold text-foreground">Ratio {h.valueRatio.toFixed(2)}</div>
                          <div className="text-[10px]">{h.valueRatio >= 1.3 ? '✅ Excellente value' : h.valueRatio >= 1.0 ? '✅ Cote justifiée' : '⚠️ Sur-coté'}</div>
                        </div>
                        <div className={`rounded-lg p-2 ${points[5] ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                          <div className="text-muted-foreground">Driver</div>
                          <div className="font-bold text-foreground">{h.driver || '?'}</div>
                          <div className="text-[10px]">{points[5] ? '✅ Top driver' : '➖ Driver standard'}</div>
                        </div>
                        <div className={`rounded-lg p-2 ${points[1] ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                          <div className="text-muted-foreground">Fiabilité</div>
                          <div className="font-bold text-foreground">{h.isFauxFavori ? 'Faux favori' : 'Fiable'}</div>
                          <div className="text-[10px]">{points[1] ? '✅ Pas un faux favori' : '❌ Faux favori détecté'}</div>
                        </div>
                      </div>

                      {/* Summary */}
                      <div className="text-xs border-t border-border/50 pt-2">
                        <span className="font-medium">{verdict} — </span>
                        <span className="text-muted-foreground">
                          {isCoupSur
                            ? `${h.name} cumule ${score}/6 critères positifs. Jouable en base solide. Forme, stats et cote convergent.`
                            : `${h.name} ne réunit que ${score}/6 critères. Prudence conseillée, à surveiller mais pas en base unique.`
                          }
                        </span>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Quinté+ */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Award className="w-5 h-5 text-purple-500" />
                  Quinté+ (2 Bases + 3 Outsiders Value)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {result.quinte.map((h, i) => (
                  <HorseCard key={h.numero} horse={h} rank={i + 1} />
                ))}
              </CardContent>
            </Card>

            {/* Value Bets */}
            {result.valueBets.length > 0 && (
              <Card className="border-green-500/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-green-500" />
                    Value Bets (Cote {'>'} 1/Proba)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {result.valueBets.map(h => (
                    <HorseCard key={h.numero} horse={h} />
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Faux Favoris */}
            {result.fauxFavoris.length > 0 && (
              <Card className="border-yellow-500/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-500" />
                    Faux Favoris ({result.fauxFavoris.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {result.fauxFavoris.map(h => (
                    <HorseCard key={h.numero} horse={h} />
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Top 3 Tab */}
          <TabsContent value="top3" className="space-y-4">
            {(() => {
              const top1 = result.tierce[0];
              const top2 = result.tierce[1];
              const top3 = result.tierce[2];
              const outsidersList = result.topOutsiders.slice(0, 4);

              const renderHorseDetail = (h: WagueTurfHorse) => {
                const recentTop3 = h.forme.slice(0, 3).filter(p => p >= 1 && p <= 3).length;
                const hasRecentWin = h.forme.slice(0, 3).some(p => p === 1);
                const formeLabel = hasRecentWin ? 'en grande forme, victoire récente' : recentTop3 >= 2 ? 'très régulière' : 'forme correcte';
                const perfLabel = h.numberOfWins > 0 
                  ? `${h.numberOfWins} victoire${h.numberOfWins > 1 ? 's' : ''} en ${h.numberOfRaces} courses`
                  : 'cherche un premier succès';
                return (
                  <div className="space-y-1.5 text-sm">
                    <p><span className="text-muted-foreground">Forme actuelle :</span> {formeLabel}</p>
                    <p><span className="text-muted-foreground">Performances :</span> {perfLabel}</p>
                    <p><span className="text-muted-foreground">Driver :</span> {h.driver || 'Inconnu'} – {h.noteDetails.bonusDriver > 0 ? 'pilote expérimenté' : 'pilote standard'}</p>
                    <p><span className="text-muted-foreground">Musique :</span> <span className="font-mono">{h.musique || '-'}</span></p>
                    <p><span className="text-muted-foreground">Gains en carrière :</span> {h.gainsCareer.toLocaleString('fr-FR')}</p>
                    <p><span className="text-muted-foreground">Cote attractive :</span> {h.cote.toFixed(1)}</p>
                  </div>
                );
              };

              return (
                <>
                  {/* SIMPLE GAGNANT */}
                  {top1 && (
                    <Card className="border-amber-500/40 bg-amber-500/5">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg font-bold text-amber-400">SIMPLE GAGNANT</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="text-xl font-bold text-foreground">
                          {top1.numero} - {top1.name} <span className="text-muted-foreground text-base">({top1.cote.toFixed(1)})</span>
                        </div>
                        <div className="pl-1">
                          <p className="text-sm font-semibold text-muted-foreground mb-2">Analyse détaillée :</p>
                          {renderHorseDetail(top1)}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* COUPLE / TIERCÉ */}
                  {top1 && top2 && top3 && (
                    <Card className="border-primary/30">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg font-bold text-primary">COUPLE / TIERCÉ</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <p>
                          <span className="text-muted-foreground font-medium">Base :</span>{' '}
                          <span className="font-bold text-foreground">{top1.numero} - {top1.name}</span>
                        </p>
                        <p>
                          <span className="text-muted-foreground font-medium">Associé avec :</span>{' '}
                          <span className="font-bold text-foreground">{top2.numero} - {top2.name}</span>
                          {' et '}
                          <span className="font-bold text-foreground">{top3.numero} - {top3.name}</span>
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  {/* QUARTÉ */}
                  {result.horses.length >= 4 && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg font-bold">QUARTÉ</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-xl font-bold font-mono tracking-wider">
                          {result.horses.slice(0, 4).map(h => h.numero).join(' - ')}
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  {/* QUINTÉ */}
                  {result.quinte.length >= 5 && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg font-bold">QUINTÉ</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-xl font-bold font-mono tracking-wider">
                          {result.quinte.map(h => h.numero).join(' - ')}
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  {/* TOP OUTSIDERS */}
                  {outsidersList.length > 0 && (
                    <Card className="border-blue-500/30 bg-blue-500/5">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg font-bold text-blue-400">TOP OUTSIDERS (Notes)</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {outsidersList.map(h => (
                          <div key={h.numero} className="flex items-center gap-3 text-sm">
                            <span className="font-bold text-foreground">{h.numero} - {h.name}</span>
                            <span className="text-muted-foreground">(cote : {h.cote.toFixed(1)})</span>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}

                  {/* Lien Tickets VIP */}
                  <a
                    href="https://vip-turf.lovable.app/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block mt-4 p-4 rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-amber-500/10 hover:from-amber-500/20 hover:via-yellow-500/20 hover:to-amber-500/20 transition-all duration-300 text-center group"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Trophy className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform" />
                      <span className="font-bold text-amber-400 text-lg">🎫 Accéder aux Tickets VIP</span>
                      <Trophy className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">vip-turf.lovable.app</p>
                  </a>
                </>
              );
            })()}
          </TabsContent>

          {/* Analyse Avancée Tab - Tous les chevaux */}
          <TabsContent value="analyse-avancee" className="space-y-4">
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Search className="w-5 h-5 text-primary" />
                  Analyse Détaillée Avancée — {result.horses.length} partants
                </CardTitle>
                <p className="text-xs text-muted-foreground">Évaluation complète sur 6 critères : Note, Forme, Stats, Value, Driver, Fiabilité</p>
              <div className="flex gap-2 flex-wrap mt-2">
                  {(['all', 'base', 'outsider', 'tocard'] as const).map(cat => {
                    const label = cat === 'all' ? 'Tous' : cat === 'base' ? '🟢 Bases' : cat === 'outsider' ? '🔵 Outsiders' : '🔴 Tocards';
                    const count = cat === 'all' ? result.horses.length : result.horses.filter(h => h.category === cat).length;
                    return (
                      <Button
                        key={cat}
                        size="sm"
                        variant={analyseFilter === cat ? 'default' : 'outline'}
                        onClick={() => setAnalyseFilter(cat)}
                        className="text-xs gap-1"
                      >
                        {label} ({count})
                      </Button>
                    );
                  })}
                </div>
                <div className="flex gap-2 flex-wrap mt-2 border-t border-border/50 pt-2">
                  <span className="text-xs text-muted-foreground self-center mr-1">Trier par :</span>
                  {(['default', 'note', 'cote'] as const).map(s => {
                    const label = s === 'default' ? 'Classement' : s === 'note' ? '⬇ Note' : '⬆ Cote';
                    return (
                      <Button
                        key={s}
                        size="sm"
                        variant={analyseSort === s ? 'default' : 'outline'}
                        onClick={() => setAnalyseSort(s)}
                        className="text-xs"
                      >
                        {label}
                      </Button>
                    );
                  })}
                </div>
              </CardHeader>
            </Card>

            {/* Résumé statistique */}
            {(() => {
              const horses = result.horses;
              const avgNote = horses.reduce((s, h) => s + h.note, 0) / horses.length;
              const avgCote = horses.reduce((s, h) => s + h.cote, 0) / horses.length;
              const coupsSurs = horses.filter(h => {
                const winRate = h.numberOfRaces > 0 ? (h.numberOfWins / h.numberOfRaces) * 100 : 0;
                const recentTop3 = h.forme.slice(0, 3).filter(p => p >= 1 && p <= 3).length;
                const pts = [h.note >= avgNote * 1.2, !h.isFauxFavori, recentTop3 >= 2, h.valueRatio >= 1.0, winRate >= 15, h.noteDetails.bonusDriver > 0];
                return pts.filter(Boolean).length >= 4;
              }).length;
              const valueBets = horses.filter(h => h.valueBet).length;
              const fauxFavoris = horses.filter(h => h.isFauxFavori).length;
              const bestHorse = horses[0];

              return (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  <Card className="border-green-500/30 bg-green-500/5">
                    <CardContent className="p-3 text-center">
                      <div className="text-2xl font-bold text-green-400">{coupsSurs}</div>
                      <div className="text-[10px] text-muted-foreground">COUPS SÛRS</div>
                    </CardContent>
                  </Card>
                  <Card className="border-primary/30 bg-primary/5">
                    <CardContent className="p-3 text-center">
                      <div className="text-2xl font-bold text-primary">{avgNote.toFixed(1)}</div>
                      <div className="text-[10px] text-muted-foreground">NOTE MOYENNE</div>
                    </CardContent>
                  </Card>
                  <Card className="border-amber-500/30 bg-amber-500/5">
                    <CardContent className="p-3 text-center">
                      <div className="text-2xl font-bold text-amber-400">{avgCote.toFixed(1)}</div>
                      <div className="text-[10px] text-muted-foreground">COTE MOYENNE</div>
                    </CardContent>
                  </Card>
                  <Card className="border-green-500/30 bg-green-500/5">
                    <CardContent className="p-3 text-center">
                      <div className="text-2xl font-bold text-green-400">{valueBets}</div>
                      <div className="text-[10px] text-muted-foreground">VALUE BETS</div>
                    </CardContent>
                  </Card>
                  <Card className="border-yellow-500/30 bg-yellow-500/5">
                    <CardContent className="p-3 text-center">
                      <div className="text-2xl font-bold text-yellow-400">{fauxFavoris}</div>
                      <div className="text-[10px] text-muted-foreground">FAUX FAVORIS</div>
                    </CardContent>
                  </Card>
                  <Card className="border-primary/30 bg-primary/5">
                    <CardContent className="p-3 text-center">
                      <div className="text-lg font-bold text-primary">N°{bestHorse?.numero}</div>
                      <div className="text-[10px] text-muted-foreground">MEILLEURE NOTE</div>
                    </CardContent>
                  </Card>
                </div>
              );
            })()}

            {result.horses
              .filter(h => analyseFilter === 'all' || h.category === analyseFilter)
              .sort((a, b) => {
                if (analyseSort === 'note') return b.note - a.note;
                if (analyseSort === 'cote') return a.cote - b.cote;
                return 0;
              })
              .map((h, idx) => {
              const winRate = h.numberOfRaces > 0 ? (h.numberOfWins / h.numberOfRaces) * 100 : 0;
              const placeRate = h.numberOfRaces > 0 ? (h.numberOfPlaces / h.numberOfRaces) * 100 : 0;
              const recentTop3 = h.forme.slice(0, 3).filter(p => p >= 1 && p <= 3).length;
              const hasRecentWin = h.forme.slice(0, 3).some(p => p === 1);
              const avgNote = result.horses.reduce((s, x) => s + x.note, 0) / result.horses.length;

              const points = [
                h.note >= avgNote * 1.2,
                !h.isFauxFavori,
                recentTop3 >= 2,
                h.valueRatio >= 1.0,
                winRate >= 15,
                h.noteDetails.bonusDriver > 0,
              ];
              const score = points.filter(Boolean).length;
              const isCoupSur = score >= 4;
              const verdict = isCoupSur ? 'COUP SÛR' : score >= 2 ? 'À SURVEILLER' : 'RISQUÉ';
              const verdictColor = isCoupSur
                ? 'border-green-500/40 bg-green-500/5'
                : score >= 2
                ? 'border-amber-500/40 bg-amber-500/5'
                : 'border-red-500/40 bg-red-500/5';
              const verdictTextColor = isCoupSur ? 'text-green-400' : score >= 2 ? 'text-amber-400' : 'text-red-400';
              const VerdictIcon = isCoupSur ? ShieldCheck : ShieldAlert;

              return (
                <Card key={h.numero} className={verdictColor}>
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                          {idx + 1}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-foreground">N°{h.numero} {h.name}</span>
                            <Badge className={`text-[10px] ${getCategoryColor(h.category)}`}>
                              {h.category.toUpperCase()}
                            </Badge>
                            {h.isFauxFavori && (
                              <Badge variant="outline" className="text-[10px] border-yellow-500/50 text-yellow-400">
                                <AlertTriangle className="w-3 h-3 mr-1" />FAUX FAVORI
                              </Badge>
                            )}
                            {h.valueBet && (
                              <Badge variant="outline" className="text-[10px] border-green-500/50 text-green-400">
                                <DollarSign className="w-3 h-3 mr-1" />VALUE BET
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            Cote {h.cote.toFixed(1)} • Driver: {h.driver || '?'} • <span className="font-mono">{h.musique.slice(0, 20) || '-'}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={`gap-1 text-xs font-bold ${verdictTextColor} bg-transparent border`}>
                          <VerdictIcon className="w-3.5 h-3.5" />
                          {verdict}
                        </Badge>
                        <div className="text-right">
                          <div className="text-xl font-bold text-primary">{h.note.toFixed(1)}</div>
                          <div className="text-[10px] text-muted-foreground">{score}/6</div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                      <div className={`rounded-lg p-2 ${points[0] ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                        <div className="text-muted-foreground">Note</div>
                        <div className="font-bold text-foreground">{h.note.toFixed(1)} <span className="font-normal text-muted-foreground">/ moy {avgNote.toFixed(1)}</span></div>
                        <div className="text-[10px]">{points[0] ? '✅ Au-dessus' : '⚠️ En-dessous'}</div>
                      </div>
                      <div className={`rounded-lg p-2 ${points[2] ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                        <div className="text-muted-foreground">Forme récente</div>
                        <div className="font-bold text-foreground font-mono">{h.musique.slice(0, 15) || '-'}</div>
                        <div className="text-[10px]">{hasRecentWin ? '✅ Victoire récente' : recentTop3 >= 2 ? '✅ Régulier Top 3' : '⚠️ Forme moyenne'}</div>
                      </div>
                      <div className={`rounded-lg p-2 ${points[4] ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                        <div className="text-muted-foreground">Stats carrière</div>
                        <div className="font-bold text-foreground">{h.numberOfWins}V/{h.numberOfPlaces}P sur {h.numberOfRaces}</div>
                        <div className="text-[10px]">{winRate >= 15 ? `✅ ${winRate.toFixed(0)}% victoires` : `⚠️ ${winRate.toFixed(0)}% victoires`}</div>
                      </div>
                      <div className={`rounded-lg p-2 ${points[3] ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                        <div className="text-muted-foreground">Value Bet</div>
                        <div className="font-bold text-foreground">Ratio {h.valueRatio.toFixed(2)}</div>
                        <div className="text-[10px]">{h.valueRatio >= 1.3 ? '✅ Excellente value' : h.valueRatio >= 1.0 ? '✅ Cote justifiée' : '⚠️ Sur-coté'}</div>
                      </div>
                      <div className={`rounded-lg p-2 ${points[5] ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                        <div className="text-muted-foreground">Driver</div>
                        <div className="font-bold text-foreground">{h.driver || '?'}</div>
                        <div className="text-[10px]">{points[5] ? '✅ Top driver' : '➖ Driver standard'}</div>
                      </div>
                      <div className={`rounded-lg p-2 ${points[1] ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                        <div className="text-muted-foreground">Fiabilité</div>
                        <div className="font-bold text-foreground">{h.isFauxFavori ? 'Faux favori' : 'Fiable'}</div>
                        <div className="text-[10px]">{points[1] ? '✅ Pas un faux favori' : '❌ Faux favori détecté'}</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs border-t border-border/50 pt-2">
                      <div><span className="text-muted-foreground">Gains carrière:</span> <span className="font-bold">{(h.gainsCareer / 100).toLocaleString('fr-FR')}€</span></div>
                      <div><span className="text-muted-foreground">Gains année:</span> <span className="font-bold">{(h.gainsCurrentYear / 100).toLocaleString('fr-FR')}€</span></div>
                      <div><span className="text-muted-foreground">Proba estimée:</span> <span className="font-bold">{(h.estimatedProba * 100).toFixed(1)}%</span></div>
                      <div><span className="text-muted-foreground">Taux placé:</span> <span className="font-bold">{placeRate.toFixed(0)}%</span></div>
                    </div>

                    <div className="text-xs border-t border-border/50 pt-2">
                      <span className="text-muted-foreground font-medium">Détail note: </span>
                      <span className="font-mono">
                        Cote +{h.noteDetails.baseCote.toFixed(1)} | Forme +{h.noteDetails.bonusForme.toFixed(1)} | Gains +{h.noteDetails.bonusGains.toFixed(1)} | Driver +{h.noteDetails.bonusDriver.toFixed(1)} | Victoires +{h.noteDetails.bonusVictoire.toFixed(1)} | <span className="text-red-400">Pénalité -{h.noteDetails.penalitePosition.toFixed(1)}</span>
                      </span>
                    </div>

                    <div className={`text-xs ${verdictTextColor}`}>
                      <span className="font-bold">{verdict}</span> — {score}/6 critères.{' '}
                      {isCoupSur ? 'Profil solide, jouable en base.' : score >= 2 ? 'Profil intéressant, à utiliser en complément.' : 'Profil fragile, à éviter en base.'}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          {/* IA Expert Tab */}
          <TabsContent value="ia">
            <WagueTurfAITab 
              horses={result.horses}
              raceInfo={`R${reunion} C${course} - ${date}`}
              onSave={(aiResponse, horses) => {
                aiHistory.addEntry({
                  raceInfo: `R${reunion} C${course} - ${date}`,
                  aiResponse,
                  horsesSnapshot: horses.map(h => ({ numero: h.numero, name: h.name, cote: h.cote, note: h.note, category: h.category })),
                });
              }}
            />
          </TabsContent>

          {/* Historique IA Tab */}
          <TabsContent value="historique-ia">
            <WagueTurfAIHistoryPanel
              history={aiHistory.history}
              onAddArrival={aiHistory.addArrival}
              onDelete={aiHistory.deleteEntry}
              onClear={aiHistory.clearHistory}
              stats={aiHistory.getStats()}
            />
          </TabsContent>

          {/* Outsiders & Tocards Tab */}
          <TabsContent value="outsiders" className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="w-5 h-5 text-blue-500" />
                  Top 4 Outsiders (Cotes 8-15)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {result.topOutsiders.length > 0 ? (
                  result.topOutsiders.map((h, i) => (
                    <HorseCard key={h.numero} horse={h} rank={i + 1} />
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">Aucun outsider qualifié dans cette course</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="w-5 h-5 text-red-500" />
                  Top 4 Tocards (Cotes {'>'}15, Potentiel Surprise)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {result.topTocards.length > 0 ? (
                  result.topTocards.map((h, i) => (
                    <HorseCard key={h.numero} horse={h} rank={i + 1} />
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">Aucun tocard à potentiel détecté</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Couplés Tab */}
          <TabsContent value="couples" className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  10 Meilleurs Couplés
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {result.couples.map((c, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card/50">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                          {i + 1}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono text-sm">
                            {c.horses[0]} - {c.horses[1]}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={`text-[10px] ${getDifficultyColor(c.difficulty)}`}>
                          {c.difficulty}
                        </Badge>
                        <div className="text-right">
                          <div className="text-xs text-muted-foreground">Σ cotes</div>
                          <div className="text-sm font-bold">{c.sommeCotes.toFixed(1)}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-muted-foreground">Note</div>
                          <div className="text-sm font-bold text-primary">{c.note.toFixed(1)}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Classement Tab */}
          <TabsContent value="classement" className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  Classement Général ({result.horses.length} partants)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {result.horses.map((h, i) => (
                  <HorseCard key={h.numero} horse={h} rank={i + 1} />
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

