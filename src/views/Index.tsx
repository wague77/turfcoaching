
'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Database, Target, BarChart3, Trophy, TrendingUp, GitCompare, Shuffle, Zap, Calculator, Star, Bookmark, Clock, TrendingDown, Loader2, Trash2, Check, Sparkles, Percent } from 'lucide-react';
import { Header } from '@/components/racing/Header';
import { DataInputTab } from '@/components/racing/DataInputTab';
import { ResultsTab } from '@/components/racing/ResultsTab';
import { AnalysisTab } from '@/components/racing/AnalysisTab';
import { HistoryTab } from '@/components/racing/HistoryTab';
import { ScoreCharts } from '@/components/racing/ScoreCharts';
import { HorseComparison } from '@/components/racing/HorseComparison';
import { GeneratorTab } from '@/components/racing/GeneratorTab';
import BetDistributorTab from '@/components/racing/BetDistributorTab';
import PressWidget from '@/components/racing/PressWidget';
import BettingTipsWidget from '@/components/racing/BettingTipsWidget';
import SavedPronosticsPanel from '@/components/racing/SavedPronosticsPanel';
import ComparisonHistoryPanel from '@/components/racing/ComparisonHistoryPanel';
import EasyRacesTab from '@/components/racing/EasyRacesTab';
import TopRacesTab from '@/components/racing/TopRacesTab';
import SavedRacesPanel from '@/components/racing/SavedRacesPanel';
import OddsEvolutionTab from '@/components/racing/OddsEvolutionTab';
import OddsVariationsTab from '@/components/racing/OddsVariationsTab';
import HorseStatsTab from '@/components/racing/HorseStatsTab';
import { NotificationBanner } from '@/components/NotificationBanner';
import { ForumNotificationBanner } from '@/components/ForumNotificationBanner';
import { CarreMagiqueTab } from '@/components/racing/CarreMagiqueTab';
import { MobileTabMenu } from '@/components/racing/MobileTabMenu';
import { PromoScrollBanner } from '@/components/PromoScrollBanner';
import { FloatingExpertButton } from '@/components/racing/FloatingExpertButton';
import { RawHorseData, Discipline, ComparisonResult } from '@/types/racing';
import { analyzeRace } from '@/lib/racing-logic';
import { useSavedPronostics } from '@/hooks/useSavedPronostics';
import { useComparisonHistory } from '@/hooks/useComparisonHistory';
import { usePersistedRaceData } from '@/hooks/usePersistedRaceData';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import Link from 'next/link';

const Index = () => {
  const [activeTab, setActiveTab] = useState('data');
  const isMobile = useIsMobile();

  // Use persisted race data hook for all data persistence
  const {
    isLoaded,
    inputText,
    setInputText,
    parsedData,
    setParsedData,
    fetchedHorses,
    setFetchedHorses,
    arrivee,
    setArrivee,
    result,
    setResult,
    currentDiscipline,
    setCurrentDiscipline,
    pmuReunion,
    setPmuReunion,
    pmuCourse,
    setPmuCourse,
    clearAllData,
  } = usePersistedRaceData();
  
  const { savedPronostics, savePronostic, deletePronostic, clearAll, updatePronosticResult, getStats } = useSavedPronostics();
  const { history: comparisonHistory, addComparison, deleteComparison, clearHistory, getStats: getComparisonStats } = useComparisonHistory();

  // Callback for saving comparisons from BettingTipsWidget
  const handleSaveComparison = (comparison: Omit<ComparisonResult, 'id' | 'timestamp'>) => {
    addComparison(comparison);
  };

  const handleAnalyze = (data: RawHorseData[], discipline: Discipline) => {
    const analysis = analyzeRace(data, discipline);
    setResult(analysis);
    setCurrentDiscipline(discipline);
  };

  const handleCalculate = (data: RawHorseData[], discipline: Discipline) => {
    const analysis = analyzeRace(data, discipline);
    setResult(analysis);
    setCurrentDiscipline(discipline);
    setActiveTab('results');
  };

  // Show loading state while data is being restored
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Chargement des données...</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'data', label: 'Données & Analyse', icon: Database },
    { id: 'results', label: 'Résultats', icon: Target },
    { id: 'stats', label: 'Statistiques', icon: Percent },
    { id: 'generator', label: 'Générateur', icon: Shuffle },
    { id: 'carreMagique', label: 'Carré Magique', icon: Sparkles },
    { id: 'distributor', label: 'Répartiteur', icon: Calculator },
    { id: 'easyRaces', label: 'Courses Faciles', icon: Zap },
    { id: 'topRaces', label: 'Top Courses', icon: Star },
    { id: 'savedRaces', label: 'Sauvegardées', icon: Bookmark },
    { id: 'oddsEvolution', label: 'Évolution Cotes', icon: Clock },
    { id: 'oddsVariations', label: 'Variations', icon: TrendingDown },
    { id: 'charts', label: 'Graphiques', icon: TrendingUp },
    { id: 'compare', label: 'Comparaison', icon: GitCompare },
    { id: 'analysis', label: 'Analyse détaillée', icon: BarChart3 },
    { id: 'history', label: 'Historique 1ers', icon: Trophy },
  ];

  return (
    <div className="min-h-screen bg-background">
      <PromoScrollBanner />
      <NotificationBanner isAuthenticated={true} />
      <ForumNotificationBanner />
      <Header />
      
      {/* Quick access to WAGUE-TURF */}
      <div className="container mx-auto px-4 pt-4">
        <Link href="/wague-turf" className="block group">
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-amber-600/20 via-yellow-500/15 to-amber-600/20 border border-amber-500/40 p-[2px] hover:border-amber-400/70 transition-all duration-500 hover:shadow-[0_0_25px_rgba(245,158,11,0.3)]">
            <div className="relative flex items-center justify-center gap-3 rounded-[10px] bg-background/90 backdrop-blur-sm px-6 py-4">
              <Trophy className="w-6 h-6 text-amber-400 animate-pulse" />
              <div className="flex flex-col items-center">
                <span className="font-black text-lg tracking-wider text-amber-400 group-hover:text-amber-300 transition-colors">
                  WAGUE-TURF
                </span>
                <span className="text-[10px] uppercase tracking-[0.3em] text-amber-500/70 font-semibold">
                  Expertise PMU Pro
                </span>
              </div>
              <Trophy className="w-6 h-6 text-amber-400 animate-pulse" />
              {/* Shine effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-400/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
            </div>
          </div>
        </Link>
      </div>

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="flex items-center justify-center w-4 h-4 rounded-full bg-green-500/20">
              <Check className="w-3 h-3 text-green-500" />
            </div>
            <span>Sauvegarde automatique activée</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              clearAllData();
              toast({
                title: "Données effacées",
                description: "Toutes les données ont été réinitialisées",
              });
            }}
            className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Effacer toutes les données
          </Button>
        </div>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Mobile: Menu déroulant */}
          {isMobile ? (
            <div className="mb-6">
              <MobileTabMenu 
                tabs={tabs} 
                activeTab={activeTab} 
                onTabChange={setActiveTab}
              />
            </div>
          ) : (
            /* Desktop: TabsList classique */
            <TabsList className="w-full flex flex-wrap justify-start gap-1 bg-card border border-border rounded-xl p-1.5 mb-8">
              {tabs.map(({ id, label, icon: Icon }) => (
                <TabsTrigger
                  key={id}
                  value={id}
                  className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground transition-all data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-glow-green"
                >
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          )}

          <TabsContent value="data" className="mt-0 animate-fade-in">
            <DataInputTab 
              onAnalyze={handleAnalyze} 
              onCalculate={handleCalculate}
              inputText={inputText}
              setInputText={setInputText}
              parsedData={parsedData}
              setParsedData={setParsedData}
              fetchedHorses={fetchedHorses}
              setFetchedHorses={setFetchedHorses}
              arrivee={arrivee}
              setArrivee={setArrivee}
              pmuReunion={pmuReunion}
              setPmuReunion={setPmuReunion}
              pmuCourse={pmuCourse}
              setPmuCourse={setPmuCourse}
            />
          </TabsContent>

          <TabsContent value="results" className="mt-0 animate-fade-in">
            <ResultsTab result={result} arrivee={arrivee} />
          </TabsContent>

          <TabsContent value="stats" className="mt-0 animate-fade-in">
            <HorseStatsTab fetchedHorses={fetchedHorses} arrivee={arrivee} />
          </TabsContent>

          <TabsContent value="generator" className="mt-0 animate-fade-in">
            <GeneratorTab result={result} />
          </TabsContent>

          <TabsContent value="carreMagique" className="mt-0 animate-fade-in">
            <CarreMagiqueTab result={result} />
          </TabsContent>

          <TabsContent value="distributor" className="mt-0 animate-fade-in">
            <BetDistributorTab result={result} />
          </TabsContent>

          <TabsContent value="easyRaces" className="mt-0 animate-fade-in">
            <EasyRacesTab arrivee={arrivee} />
          </TabsContent>

          <TabsContent value="topRaces" className="mt-0 animate-fade-in">
            <TopRacesTab arrivee={arrivee} />
          </TabsContent>

          <TabsContent value="savedRaces" className="mt-0 animate-fade-in">
            <SavedRacesPanel />
          </TabsContent>

          <TabsContent value="oddsEvolution" className="mt-0 animate-fade-in">
            <OddsEvolutionTab />
          </TabsContent>

          <TabsContent value="oddsVariations" className="mt-0 animate-fade-in">
            <OddsVariationsTab />
          </TabsContent>

          <TabsContent value="charts" className="mt-0 animate-fade-in">
            {result ? (
              <ScoreCharts horses={result.horses} />
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <TrendingUp className="w-16 h-16 text-muted-foreground/30 mb-4" />
                <h3 className="text-xl font-semibold text-muted-foreground mb-2">
                  Aucune donnée à visualiser
                </h3>
                <p className="text-sm text-muted-foreground">
                  Lancez une analyse pour voir les graphiques
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="compare" className="mt-0 animate-fade-in">
            {result ? (
              <HorseComparison horses={result.horses} />
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <GitCompare className="w-16 h-16 text-muted-foreground/30 mb-4" />
                <h3 className="text-xl font-semibold text-muted-foreground mb-2">
                  Mode comparaison
                </h3>
                <p className="text-sm text-muted-foreground">
                  Lancez une analyse pour comparer les chevaux
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="analysis" className="mt-0 animate-fade-in">
            <AnalysisTab result={result} discipline={currentDiscipline} arrivee={arrivee} />
          </TabsContent>

          <TabsContent value="history" className="mt-0 animate-fade-in">
            <HistoryTab result={result} arrivee={arrivee} />
          </TabsContent>
        </Tabs>
      </main>
      
      {/* AI Betting Tips, Saved Pronostics & Press Widget */}
      <section className="container mx-auto px-4 py-8 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <BettingTipsWidget 
            horses={fetchedHorses.length > 0 ? fetchedHorses : parsedData} 
            analysisResult={result}
            onSave={savePronostic}
            arrivee={arrivee}
            onSaveComparison={handleSaveComparison}
          />
          <SavedPronosticsPanel
            savedPronostics={savedPronostics}
            onDelete={deletePronostic}
            onClearAll={clearAll}
            onUpdateResult={updatePronosticResult}
            stats={getStats()}
          />
        </div>
        
        {/* Comparison History Panel */}
        <ComparisonHistoryPanel
          history={comparisonHistory}
          stats={getComparisonStats()}
          onDelete={deleteComparison}
          onClearAll={clearHistory}
        />
        
        <PressWidget />
      </section>
      
      {/* Floating AI Expert Button */}
      <FloatingExpertButton 
        raceContext={result ? `${fetchedHorses.length || parsedData.length} chevaux analysés, discipline: ${currentDiscipline}` : undefined}
        horses={fetchedHorses.length > 0 ? fetchedHorses : parsedData}
        analysisResult={result}
        discipline={currentDiscipline}
      />
      
      {/* Footer */}
      <footer className="border-t border-border py-6 mt-12">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            AutoQuintePro v8.0 — Analyse prédictive des courses hippiques
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;

