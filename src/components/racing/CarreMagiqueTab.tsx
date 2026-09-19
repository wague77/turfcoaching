
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Sparkles, Trophy, Target, Users, Check, X, Crown, Star, Save, History, Trash2, ChevronDown, ChevronUp, BarChart3, Clock } from 'lucide-react';
import { AnalysisResult, Horse } from '@/types/racing';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCarreMagiqueHistory, CarreMagiqueEntry } from '@/hooks/useCarreMagiqueHistory';
import { toast } from '@/hooks/use-toast';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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

interface CarreMagiqueTabProps {
  result: AnalysisResult | null;
}

export const CarreMagiqueTab: React.FC<CarreMagiqueTabProps> = ({ result }) => {
  const [selectedBase, setSelectedBase] = useState<Horse | null>(null);
  const [raceName, setRaceName] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [resultInput, setResultInput] = useState<{ [key: string]: string }>({});
  const [expandedEntries, setExpandedEntries] = useState<{ [key: string]: boolean }>({});

  const { history, addEntry, updateEntryResult, deleteEntry, clearHistory, getStats } = useCarreMagiqueHistory();
  const stats = getStats();

  // Determine if a horse has won at least once in their last 6 races
  // Check if "1" appears in musicItems (positions from last 6 races)
  const hasRecentWin = (horse: Horse): boolean => {
    // musicItems contains parsed positions from musique string
    // e.g., "4-8-6-7-3-1" → [4, 8, 6, 7, 3, 1] → includes(1) = true (gagnant)
    // e.g., "7-8-6-2-4-6" → [7, 8, 6, 2, 4, 6] → includes(1) = false (non gagnant)
    return horse.musicItems.includes(1);
  };

  // Render musique with position 1 highlighted
  const renderMusique = (horse: Horse) => {
    return (
      <div className="flex items-center gap-0.5 flex-wrap">
        {horse.musicItems.map((pos, idx) => (
          <span
            key={idx}
            className={`inline-flex items-center justify-center min-w-5 h-5 px-1 rounded text-xs font-medium ${
              pos === 1
                ? 'bg-yellow-500 text-yellow-950 ring-1 ring-yellow-600'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {pos}
          </span>
        ))}
      </div>
    );
  };

  // Separate horses into winners and non-winners
  const { winners, nonWinners } = useMemo(() => {
    if (!result?.horses) return { winners: [], nonWinners: [] };
    
    const winnersArr: Horse[] = [];
    const nonWinnersArr: Horse[] = [];
    
    result.horses.forEach(horse => {
      if (hasRecentWin(horse)) {
        winnersArr.push(horse);
      } else {
        nonWinnersArr.push(horse);
      }
    });
    
    // Sort by scoreTotal descending
    winnersArr.sort((a, b) => b.scoreTotal - a.scoreTotal);
    nonWinnersArr.sort((a, b) => b.scoreTotal - a.scoreTotal);
    
    return { winners: winnersArr, nonWinners: nonWinnersArr };
  }, [result]);

  // Get associated horses based on the base selection
  const associatedHorses = useMemo(() => {
    if (!selectedBase) return [];
    
    const baseHasWon = hasRecentWin(selectedBase);
    
    if (baseHasWon) {
      // Base has won → associate with top 4 non-winners
      return nonWinners.slice(0, 4);
    } else {
      // Base has not won → associate with all winners
      return winners;
    }
  }, [selectedBase, winners, nonWinners]);

  // Generate couples from base + associated
  const generatedCouples = useMemo(() => {
    if (!selectedBase || associatedHorses.length === 0) return [];
    
    return associatedHorses.map(horse => ({
      base: selectedBase.numero,
      associated: horse.numero,
      label: `${selectedBase.numero}-${horse.numero}`
    }));
  }, [selectedBase, associatedHorses]);

  // Generate tiercés from base + pairs of associated horses
  const generatedTierces = useMemo(() => {
    if (!selectedBase || associatedHorses.length < 2) return [];
    
    const tierces: string[] = [];
    const associated = associatedHorses.slice(0, 4); // Limit to top 4 associated
    
    // Generate all combinations of base + 2 associated horses
    for (let i = 0; i < associated.length; i++) {
      for (let j = i + 1; j < associated.length; j++) {
        tierces.push(`${selectedBase.numero}-${associated[i].numero}-${associated[j].numero}`);
      }
    }
    
    return tierces;
  }, [selectedBase, associatedHorses]);

  const handleSave = () => {
    if (!selectedBase || generatedCouples.length === 0) {
      toast({
        title: "Impossible de sauvegarder",
        description: "Sélectionnez une base et générez des couplés",
        variant: "destructive",
      });
      return;
    }

    addEntry({
      raceName: raceName || undefined,
      baseNumero: selectedBase.numero,
      baseName: selectedBase.name,
      baseHasWon: hasRecentWin(selectedBase),
      associatedHorses: associatedHorses.map(h => ({ numero: h.numero, name: h.name })),
      couples: generatedCouples.map(c => c.label),
      tierces: generatedTierces,
    });

    toast({
      title: "Sélection sauvegardée",
      description: `Base ${selectedBase.numero} avec ${generatedCouples.length} couplés et ${generatedTierces.length} tiercés`,
    });

    setRaceName('');
  };

  const handleAddResult = (entryId: string) => {
    const input = resultInput[entryId];
    if (!input) return;

    const numbers = input.split(/[-,\s]+/).map(n => parseInt(n.trim())).filter(n => !isNaN(n));
    if (numbers.length < 3) {
      toast({
        title: "Format invalide",
        description: "Entrez au moins 3 numéros (ex: 5-3-8-2-1)",
        variant: "destructive",
      });
      return;
    }

    updateEntryResult(entryId, numbers);
    setResultInput(prev => ({ ...prev, [entryId]: '' }));

    toast({
      title: "Résultat ajouté",
      description: "L'évaluation a été calculée",
    });
  };

  const toggleExpanded = (id: string) => {
    setExpandedEntries(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!result) {
    return (
      <div className="space-y-6">
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Sparkles className="w-12 h-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground text-center">
              Importez des données de course pour utiliser le Carré Magique
            </p>
          </CardContent>
        </Card>

        {/* Show history even without data */}
        {history.length > 0 && (
          <HistorySection
            history={history}
            stats={stats}
            showHistory={showHistory}
            setShowHistory={setShowHistory}
            expandedEntries={expandedEntries}
            toggleExpanded={toggleExpanded}
            resultInput={resultInput}
            setResultInput={setResultInput}
            handleAddResult={handleAddResult}
            deleteEntry={deleteEntry}
            clearHistory={clearHistory}
            formatDate={formatDate}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/20">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="w-5 h-5 text-purple-500" />
            Carré Magique
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Sélectionnez une base. Si elle a gagné récemment, elle sera associée aux 4 meilleurs non-gagnants. 
            Sinon, elle sera associée aux chevaux ayant gagné récemment.
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Horse Selection */}
        <div className="space-y-4">
          {/* Winners Section */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Trophy className="w-4 h-4 text-yellow-500" />
                Gagnants récents ({winners.length})
                <Badge variant="outline" className="ml-auto text-xs bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
                  1+ victoire sur 6 courses
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-48">
                <div className="space-y-2">
                  {winners.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Aucun cheval avec victoire récente
                    </p>
                  ) : (
                    winners.map(horse => (
                      <div
                        key={horse.numero}
                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                          selectedBase?.numero === horse.numero
                            ? 'bg-purple-500/20 border-purple-500'
                            : 'hover:bg-muted/50 border-border'
                        }`}
                        onClick={() => setSelectedBase(selectedBase?.numero === horse.numero ? null : horse)}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                            selectedBase?.numero === horse.numero
                              ? 'bg-purple-500 text-white'
                              : 'bg-yellow-500/20 text-yellow-600'
                          }`}>
                            {horse.numero}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">{horse.name || `Cheval ${horse.numero}`}</p>
                            <p className="text-xs text-muted-foreground mb-1">
                              Score: {horse.scoreTotal.toFixed(1)} | Cote: {horse.cote}
                            </p>
                            {renderMusique(horse)}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/30">
                            <Check className="w-3 h-3 mr-1" />
                            Gagnant
                          </Badge>
                          {selectedBase?.numero === horse.numero && (
                            <Crown className="w-4 h-4 text-purple-500" />
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Non-Winners Section */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Target className="w-4 h-4 text-blue-500" />
                Sans victoire récente ({nonWinners.length})
                <Badge variant="outline" className="ml-auto text-xs bg-blue-500/10 text-blue-600 border-blue-500/30">
                  0 victoire sur 6 courses
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-48">
                <div className="space-y-2">
                  {nonWinners.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Tous les chevaux ont gagné récemment
                    </p>
                  ) : (
                    nonWinners.map(horse => (
                      <div
                        key={horse.numero}
                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                          selectedBase?.numero === horse.numero
                            ? 'bg-purple-500/20 border-purple-500'
                            : 'hover:bg-muted/50 border-border'
                        }`}
                        onClick={() => setSelectedBase(selectedBase?.numero === horse.numero ? null : horse)}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                            selectedBase?.numero === horse.numero
                              ? 'bg-purple-500 text-white'
                              : 'bg-blue-500/20 text-blue-600'
                          }`}>
                            {horse.numero}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">{horse.name || `Cheval ${horse.numero}`}</p>
                            <p className="text-xs text-muted-foreground mb-1">
                              Score: {horse.scoreTotal.toFixed(1)} | Cote: {horse.cote}
                            </p>
                            {renderMusique(horse)}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs bg-red-500/10 text-red-600 border-red-500/30">
                            <X className="w-3 h-3 mr-1" />
                            Non-gagnant
                          </Badge>
                          {selectedBase?.numero === horse.numero && (
                            <Crown className="w-4 h-4 text-purple-500" />
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Right: Results */}
        <div className="space-y-4">
          {/* Selected Base Info */}
          {selectedBase && (
            <Card className="bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border-purple-500/20">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Crown className="w-4 h-4 text-purple-500" />
                  Base sélectionnée
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-purple-500 text-white flex items-center justify-center font-bold text-xl">
                    {selectedBase.numero}
                  </div>
                  <div>
                    <p className="font-bold">{selectedBase.name || `Cheval ${selectedBase.numero}`}</p>
                    <p className="text-sm text-muted-foreground">
                      {hasRecentWin(selectedBase) ? (
                        <span className="text-green-600">✓ A gagné récemment → associé aux non-gagnants</span>
                      ) : (
                        <span className="text-blue-600">✗ Pas de victoire récente → associé aux gagnants</span>
                      )}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Associated Horses */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="w-4 h-4 text-indigo-500" />
                Chevaux associés ({associatedHorses.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedBase ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Sélectionnez une base pour voir les associations
                </p>
              ) : associatedHorses.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Aucun cheval disponible pour l'association
                </p>
              ) : (
                <div className="space-y-2">
                  {associatedHorses.map((horse, index) => (
                    <div
                      key={horse.numero}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-600 flex items-center justify-center font-bold text-xs">
                          {index + 1}
                        </div>
                        <div className="w-8 h-8 rounded-full bg-indigo-500 text-white flex items-center justify-center font-bold text-sm">
                          {horse.numero}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{horse.name || `Cheval ${horse.numero}`}</p>
                          <p className="text-xs text-muted-foreground mb-1">
                            Score: {horse.scoreTotal.toFixed(1)} | Cote: {horse.cote}
                          </p>
                          {renderMusique(horse)}
                        </div>
                      </div>
                      {hasRecentWin(horse) ? (
                        <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/30">
                          Gagnant
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600 border-blue-500/30">
                          Non-gagnant
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Generated Couples */}
          {generatedCouples.length > 0 && (
            <Card className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/20">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Star className="w-4 h-4 text-green-500" />
                  Couplés générés ({generatedCouples.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {generatedCouples.map((couple, index) => (
                    <Badge
                      key={index}
                      className="text-base px-4 py-2 bg-green-500/20 text-green-700 border-green-500/30 hover:bg-green-500/30"
                    >
                      {couple.label}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Generated Tiercés */}
          {generatedTierces.length > 0 && (
            <Card className="bg-gradient-to-r from-orange-500/10 to-amber-500/10 border-orange-500/20">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Trophy className="w-4 h-4 text-orange-500" />
                  Tiercés générés ({generatedTierces.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 mb-4">
                  {generatedTierces.map((tierce, index) => (
                    <Badge
                      key={index}
                      className="text-base px-4 py-2 bg-orange-500/20 text-orange-700 border-orange-500/30 hover:bg-orange-500/30"
                    >
                      {tierce}
                    </Badge>
                  ))}
                </div>

                {/* Save Section */}
                <div className="flex gap-2 mt-4 pt-4 border-t border-border">
                  <Input
                    placeholder="Nom de la course (optionnel)"
                    value={raceName}
                    onChange={(e) => setRaceName(e.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={handleSave} className="gap-2">
                    <Save className="w-4 h-4" />
                    Sauvegarder
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Legend */}
      <Card className="bg-muted/30">
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <span>Gagnants récents (1+ victoire)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span>Sans victoire récente</span>
            </div>
            <div className="flex items-center gap-2">
              <Crown className="w-4 h-4 text-purple-500" />
              <span>Base sélectionnée</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* History Section */}
      <HistorySection
        history={history}
        stats={stats}
        showHistory={showHistory}
        setShowHistory={setShowHistory}
        expandedEntries={expandedEntries}
        toggleExpanded={toggleExpanded}
        resultInput={resultInput}
        setResultInput={setResultInput}
        handleAddResult={handleAddResult}
        deleteEntry={deleteEntry}
        clearHistory={clearHistory}
        formatDate={formatDate}
      />
    </div>
  );
};

// Separated History Section Component
interface HistorySectionProps {
  history: CarreMagiqueEntry[];
  stats: ReturnType<ReturnType<typeof useCarreMagiqueHistory>['getStats']>;
  showHistory: boolean;
  setShowHistory: (show: boolean) => void;
  expandedEntries: { [key: string]: boolean };
  toggleExpanded: (id: string) => void;
  resultInput: { [key: string]: string };
  setResultInput: React.Dispatch<React.SetStateAction<{ [key: string]: string }>>;
  handleAddResult: (id: string) => void;
  deleteEntry: (id: string) => void;
  clearHistory: () => void;
  formatDate: (timestamp: number) => string;
}

const HistorySection: React.FC<HistorySectionProps> = ({
  history,
  stats,
  showHistory,
  setShowHistory,
  expandedEntries,
  toggleExpanded,
  resultInput,
  setResultInput,
  handleAddResult,
  deleteEntry,
  clearHistory,
  formatDate,
}) => {
  if (history.length === 0) return null;

  return (
    <Collapsible open={showHistory} onOpenChange={setShowHistory}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
            <CardTitle className="flex items-center justify-between text-base">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-purple-500" />
                Historique ({history.length})
              </div>
              <div className="flex items-center gap-4">
                {stats.evaluated > 0 && (
                  <div className="flex items-center gap-2 text-sm font-normal">
                    <BarChart3 className="w-4 h-4 text-green-500" />
                    <span className="text-muted-foreground">
                      Taux moyen: <span className="text-green-600 font-medium">{stats.avgSuccessRate}%</span>
                    </span>
                  </div>
                )}
                {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0">
            {/* Stats Summary */}
            {stats.evaluated > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 p-3 rounded-lg bg-muted/30">
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Sélections</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{stats.baseInTop3Rate}%</p>
                  <p className="text-xs text-muted-foreground">Base Top 3</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{stats.baseInTop5Rate}%</p>
                  <p className="text-xs text-muted-foreground">Base Top 5</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-600">{stats.winningCouplesRate}%</p>
                  <p className="text-xs text-muted-foreground">Couplés gagnants</p>
                </div>
              </div>
            )}

            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {history.map((entry) => (
                  <Card key={entry.id} className="bg-muted/20">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-lg">Base {entry.baseNumero}</span>
                            {entry.baseName && (
                              <span className="text-sm text-muted-foreground">({entry.baseName})</span>
                            )}
                            <Badge variant="outline" className={entry.baseHasWon 
                              ? 'bg-green-500/10 text-green-600 border-green-500/30' 
                              : 'bg-blue-500/10 text-blue-600 border-blue-500/30'
                            }>
                              {entry.baseHasWon ? 'Gagnant' : 'Non-gagnant'}
                            </Badge>
                          </div>
                          {entry.raceName && (
                            <p className="text-sm text-muted-foreground">{entry.raceName}</p>
                          )}
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <Clock className="w-3 h-3" />
                            {formatDate(entry.timestamp)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {entry.evaluation && (
                            <Badge className={`${
                              entry.evaluation.successRate >= 60 ? 'bg-green-500' :
                              entry.evaluation.successRate >= 30 ? 'bg-yellow-500' :
                              'bg-red-500'
                            } text-white`}>
                              {entry.evaluation.successRate}%
                            </Badge>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleExpanded(entry.id)}
                          >
                            {expandedEntries[entry.id] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteEntry(entry.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Couples */}
                      <div className="flex flex-wrap gap-1 mb-2">
                        {entry.couples.map((couple, idx) => {
                          const isWinner = entry.evaluation?.winningCouples?.includes(couple);
                          return (
                            <Badge
                              key={idx}
                              variant="outline"
                              className={isWinner 
                                ? 'bg-green-500/20 text-green-700 border-green-500/30' 
                                : 'bg-muted/50'
                              }
                            >
                              {couple}
                              {isWinner && <Check className="w-3 h-3 ml-1" />}
                            </Badge>
                          );
                        })}
                      </div>

                      {/* Expanded Details */}
                      {expandedEntries[entry.id] && (
                        <div className="mt-4 pt-4 border-t border-border space-y-3">
                          {/* Associated horses */}
                          <div>
                            <p className="text-sm font-medium mb-2">Associés:</p>
                            <div className="flex flex-wrap gap-2">
                              {entry.associatedHorses.map((h, idx) => {
                                const inTop3 = entry.evaluation?.associatedInTop3?.includes(h.numero);
                                const inTop5 = entry.evaluation?.associatedInTop5?.includes(h.numero);
                                return (
                                  <Badge
                                    key={idx}
                                    variant="outline"
                                    className={
                                      inTop3 ? 'bg-green-500/20 text-green-700 border-green-500/30' :
                                      inTop5 ? 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30' :
                                      'bg-muted/50'
                                    }
                                  >
                                    N°{h.numero} {h.name && `- ${h.name}`}
                                    {inTop3 && <span className="ml-1">🥉</span>}
                                    {inTop5 && !inTop3 && <span className="ml-1">✓</span>}
                                  </Badge>
                                );
                              })}
                            </div>
                          </div>

                          {/* Result input or display */}
                          {entry.raceResult ? (
                            <div>
                              <p className="text-sm font-medium mb-2">Arrivée officielle:</p>
                              <div className="flex flex-wrap gap-2">
                                {entry.raceResult.slice(0, 5).map((num, idx) => (
                                  <Badge key={idx} className={
                                    idx === 0 ? 'bg-yellow-500 text-white' :
                                    idx === 1 ? 'bg-gray-400 text-white' :
                                    idx === 2 ? 'bg-amber-600 text-white' :
                                    'bg-muted'
                                  }>
                                    {idx + 1}. N°{num}
                                  </Badge>
                                ))}
                              </div>
                              {entry.evaluation && (
                                <div className="mt-3 p-3 rounded-lg bg-muted/30">
                                  <p className="text-sm">
                                    Base {entry.baseNumero}: {' '}
                                    {entry.evaluation.baseInTop3 ? (
                                      <span className="text-green-600 font-medium">✓ Top 3</span>
                                    ) : entry.evaluation.baseInTop5 ? (
                                      <span className="text-yellow-600 font-medium">✓ Top 5</span>
                                    ) : (
                                      <span className="text-red-600 font-medium">✗ Non placé</span>
                                    )}
                                  </p>
                                  {entry.evaluation.winningCouples.length > 0 && (
                                    <p className="text-sm mt-1 text-green-600">
                                      Couplés gagnants: {entry.evaluation.winningCouples.join(', ')}
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              <Input
                                placeholder="Arrivée (ex: 5-3-8-2-1)"
                                value={resultInput[entry.id] || ''}
                                onChange={(e) => setResultInput(prev => ({ ...prev, [entry.id]: e.target.value }))}
                                className="flex-1"
                              />
                              <Button size="sm" onClick={() => handleAddResult(entry.id)}>
                                Ajouter résultat
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>

            {/* Clear All */}
            <div className="mt-4 pt-4 border-t border-border flex justify-end">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Effacer tout l'historique
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Effacer l'historique ?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Cette action est irréversible. Toutes les sélections sauvegardées seront supprimées.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction onClick={clearHistory} className="bg-destructive hover:bg-destructive/90">
                      Effacer
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};

