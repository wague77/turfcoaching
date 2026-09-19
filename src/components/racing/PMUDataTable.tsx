
import { useState, useRef, useEffect, Fragment } from 'react';
import { ChevronDown, ChevronUp, Trophy, TrendingUp, ListOrdered, ArrowUp, ArrowDown, Ruler, Medal, Download, Settings2, Save } from 'lucide-react';
import { PMUHorse, formatEuros, formatWinRate } from '@/lib/pmu-api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';

interface PMUDataTableProps {
  horses: PMUHorse[];
  arrivee?: number[]; // Optional array of horse numbers in finish order
}

type ViewMode = 'essential' | 'basic' | 'performance' | 'gains' | 'odds' | 'dimensions';
type CategoryFilter = 'all' | 'favori' | 'outsider' | 'tocard';

// Export column configuration
const EXPORT_COLUMNS = [
  { key: 'numero', label: 'N°', default: true },
  { key: 'name', label: 'Nom', default: true },
  { key: 'age', label: 'Âge', default: true },
  { key: 'sex', label: 'Sexe', default: true },
  { key: 'driver', label: 'Driver', default: true },
  { key: 'trainer', label: 'Entraîneur', default: true },
  { key: 'lastDirectRatio', label: 'Ratio Direct', default: true },
  { key: 'lastRefRatio', label: 'Ratio Réf', default: true },
  { key: 'trend', label: 'Tendance', default: true },
  { key: 'cote', label: 'Cote', default: true },
  { key: 'numberOfRaces', label: 'Courses', default: true },
  { key: 'numberOfWins', label: 'Victoires', default: true },
  { key: 'numberOfPlacesSecond', label: '2èmes', default: false },
  { key: 'numberOfPlacesThird', label: '3èmes', default: false },
  { key: 'winRate', label: 'Taux Victoire', default: true },
  { key: 'gainsCareer', label: 'Gains Carrière', default: false },
  { key: 'gainsCurrentYear', label: 'Gains Année', default: false },
  { key: 'musique', label: 'Musique', default: true },
  { key: 'handicapWeight', label: 'Poids', default: false },
  { key: 'handicapDistance', label: 'Distance H.', default: false },
  { key: 'reductionKm', label: 'Réd. km', default: false },
] as const;

// Calculate trend between Direct Ratio and Reference Ratio
function calculateRatioTrend(directRatio: number, refRatio: number): { trend: 'H' | 'B' | null; diff: number } {
  if (directRatio <= 0 || refRatio <= 0) return { trend: null, diff: 0 };
  const diff = directRatio - refRatio;
  if (Math.abs(diff) < 0.1) return { trend: null, diff: 0 }; // No significant difference
  return { trend: diff > 0 ? 'H' : 'B', diff: Math.abs(diff) };
}

const STORAGE_KEY = 'pmu-export-columns';

function loadSavedColumns(): Set<string> {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return new Set(parsed);
      }
    }
  } catch {
    // Ignore parse errors
  }
  return new Set(EXPORT_COLUMNS.filter(c => c.default).map(c => c.key));
}

export function PMUDataTable({ horses, arrivee = [] }: PMUDataTableProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('essential');
  const [expandedHorse, setExpandedHorse] = useState<number | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(loadSavedColumns);

  // Count horses by category based on Direct Ratio
  // Favori: ratio <= 5, Outsider: 5 < ratio <= 15, Tocard: ratio > 15
  const favorisCount = horses.filter(h => h.lastDirectRatio > 0 && h.lastDirectRatio <= 5).length;
  const outsidersCount = horses.filter(h => h.lastDirectRatio > 5 && h.lastDirectRatio <= 15).length;
  const tocardsCount = horses.filter(h => h.lastDirectRatio > 15).length;
  const horsesWithRatio = horses.filter(h => h.lastDirectRatio > 0).length;

  // Filter horses by category based on Direct Ratio
  const filteredHorses = horses.filter(horse => {
    if (categoryFilter === 'all') return true;
    const ratio = horse.lastDirectRatio;
    if (ratio <= 0) return false; // No ratio data, exclude from category filters
    if (categoryFilter === 'favori') return ratio <= 5;
    if (categoryFilter === 'outsider') return ratio > 5 && ratio <= 15;
    if (categoryFilter === 'tocard') return ratio > 15;
    return true;
  });

  // Find the top 3 best direct ratios (lowest positive values)
  const sortedByRatio = horses
    .filter(h => h.lastDirectRatio > 0)
    .sort((a, b) => a.lastDirectRatio - b.lastDirectRatio);
  
  const top3Ratios = sortedByRatio.slice(0, 3).map(h => h.lastDirectRatio);
  
  const getMedalColor = (ratio: number): string | null => {
    if (ratio <= 0) return null;
    const index = top3Ratios.indexOf(ratio);
    if (index === 0) return 'text-amber-400'; // Gold
    if (index === 1) return 'text-gray-400';  // Silver
    if (index === 2) return 'text-amber-700'; // Bronze
    return null;
  };
  
  const getMedalRank = (ratio: number): number | null => {
    if (ratio <= 0) return null;
    const index = top3Ratios.indexOf(ratio);
    return index >= 0 && index < 3 ? index + 1 : null;
  };

  // Build a map of horse number -> finish position from arrivee
  const arriveePositionMap = new Map<number, number>();
  arrivee.forEach((num, idx) => {
    arriveePositionMap.set(num, idx + 1);
  });

  // Get position color classes for finish positions
  const getPositionColor = (position: number): { bgColor: string; borderColor: string; textColor: string } => {
    switch (position) {
      case 1: return { bgColor: 'bg-yellow-500/30', borderColor: 'border-yellow-500', textColor: 'text-yellow-500' };
      case 2: return { bgColor: 'bg-slate-400/30', borderColor: 'border-slate-400', textColor: 'text-slate-300' };
      case 3: return { bgColor: 'bg-amber-700/30', borderColor: 'border-amber-700', textColor: 'text-amber-600' };
      case 4: return { bgColor: 'bg-blue-500/20', borderColor: 'border-blue-500/50', textColor: 'text-blue-400' };
      case 5: return { bgColor: 'bg-purple-500/20', borderColor: 'border-purple-500/50', textColor: 'text-purple-400' };
      default: return { bgColor: 'bg-muted/50', borderColor: 'border-border/50', textColor: 'text-muted-foreground' };
    }
  };

  // Get category based on Direct Ratio (but override with arrivee if present)
  const getHorseCategory = (ratio: number): { category: 'favori' | 'outsider' | 'tocard' | null; bgColor: string; textColor: string } => {
    if (ratio <= 0) return { category: null, bgColor: 'bg-muted', textColor: 'text-muted-foreground' };
    if (ratio <= 5) return { category: 'favori', bgColor: 'bg-green-500/20', textColor: 'text-green-500' };
    if (ratio <= 15) return { category: 'outsider', bgColor: 'bg-amber-500/20', textColor: 'text-amber-500' };
    return { category: 'tocard', bgColor: 'bg-red-500/20', textColor: 'text-red-500' };
  };

  // Get display info for a horse (uses arrivee position if available)
  const getHorseDisplayInfo = (horse: PMUHorse): { bgColor: string; textColor: string; borderColor: string; finishPosition: number | null } => {
    const finishPosition = arriveePositionMap.get(horse.numero);
    if (finishPosition !== undefined) {
      const posColors = getPositionColor(finishPosition);
      return { 
        bgColor: posColors.bgColor, 
        textColor: posColors.textColor, 
        borderColor: posColors.borderColor,
        finishPosition 
      };
    }
    const categoryInfo = getHorseCategory(horse.lastDirectRatio);
    return { 
      bgColor: categoryInfo.bgColor, 
      textColor: categoryInfo.textColor, 
      borderColor: 'border-transparent',
      finishPosition: null 
    };
  };

  const toggleExpand = (numero: number) => {
    setExpandedHorse(expandedHorse === numero ? null : numero);
  };

  const scrollUp = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ top: -150, behavior: 'smooth' });
    }
  };

  const scrollDown = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ top: 150, behavior: 'smooth' });
    }
  };

  const toggleColumn = (key: string) => {
    const newSelected = new Set(selectedColumns);
    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.add(key);
    }
    setSelectedColumns(newSelected);
  };

  const selectAllColumns = () => {
    setSelectedColumns(new Set(EXPORT_COLUMNS.map(c => c.key)));
  };

  const deselectAllColumns = () => {
    setSelectedColumns(new Set());
  };

  const saveColumnPreferences = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(selectedColumns)));
    toast({
      title: "Préférences sauvegardées",
      description: `${selectedColumns.size} colonnes sélectionnées pour les prochains exports.`,
    });
  };

  const resetToDefault = () => {
    const defaults = new Set(EXPORT_COLUMNS.filter(c => c.default).map(c => c.key));
    setSelectedColumns(defaults);
    localStorage.removeItem(STORAGE_KEY);
    toast({
      title: "Préférences réinitialisées",
      description: "Les colonnes par défaut ont été restaurées.",
    });
  };

  const exportToExcel = () => {
    const data = horses.map(horse => {
      const trend = calculateRatioTrend(horse.lastDirectRatio, horse.lastRefRatio);
      const row: Record<string, string | number> = {};
      
      if (selectedColumns.has('numero')) row['N°'] = horse.numero;
      if (selectedColumns.has('name')) row['Nom'] = horse.name;
      if (selectedColumns.has('age')) row['Âge'] = horse.age;
      if (selectedColumns.has('sex')) row['Sexe'] = horse.sex;
      if (selectedColumns.has('driver')) row['Driver'] = horse.driver;
      if (selectedColumns.has('trainer')) row['Entraîneur'] = horse.trainer;
      if (selectedColumns.has('lastDirectRatio')) row['Ratio Direct'] = horse.lastDirectRatio > 0 ? horse.lastDirectRatio : '';
      if (selectedColumns.has('lastRefRatio')) row['Ratio Réf'] = horse.lastRefRatio > 0 ? horse.lastRefRatio : '';
      if (selectedColumns.has('trend')) row['Tendance'] = trend.trend || '';
      if (selectedColumns.has('cote')) row['Cote'] = horse.cote > 0 ? horse.cote : '';
      if (selectedColumns.has('numberOfRaces')) row['Courses'] = horse.numberOfRaces;
      if (selectedColumns.has('numberOfWins')) row['Victoires'] = horse.numberOfWins;
      if (selectedColumns.has('numberOfPlacesSecond')) row['2èmes'] = horse.numberOfPlacesSecond;
      if (selectedColumns.has('numberOfPlacesThird')) row['3èmes'] = horse.numberOfPlacesThird;
      if (selectedColumns.has('winRate')) row['Taux Victoire'] = formatWinRate(horse.numberOfWins, horse.numberOfRaces);
      if (selectedColumns.has('gainsCareer')) row['Gains Carrière'] = horse.gainsCareer;
      if (selectedColumns.has('gainsCurrentYear')) row['Gains Année'] = horse.gainsCurrentYear;
      if (selectedColumns.has('musique')) row['Musique'] = horse.musique;
      if (selectedColumns.has('handicapWeight')) row['Poids'] = horse.handicapWeight > 0 ? horse.handicapWeight : '';
      if (selectedColumns.has('handicapDistance')) row['Distance H.'] = horse.handicapDistance > 0 ? horse.handicapDistance : '';
      if (selectedColumns.has('reductionKm')) row['Réd. km'] = horse.reductionKm > 0 ? horse.reductionKm : '';
      
      return row;
    });

    if (data.length === 0 || Object.keys(data[0]).length === 0) return;

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Chevaux');
    
    // Auto-size columns
    const colWidths = Object.keys(data[0] || {}).map(key => ({
      wch: Math.max(key.length, 12)
    }));
    ws['!cols'] = colWidths;

    XLSX.writeFile(wb, `chevaux_${new Date().toISOString().split('T')[0]}.xlsx`);
    setExportDialogOpen(false);
  };

  return (
    <div className="mt-4 space-y-3">
      {/* View Mode Tabs and Export */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={viewMode === 'essential' ? 'default' : 'outline'}
            onClick={() => setViewMode('essential')}
            className="text-xs"
          >
            <ListOrdered className="w-3 h-3 mr-1" />
            Essentiel
          </Button>
          <Button
            size="sm"
            variant={viewMode === 'basic' ? 'default' : 'outline'}
            onClick={() => setViewMode('basic')}
            className="text-xs"
          >
            Infos de base
          </Button>
          <Button
            size="sm"
            variant={viewMode === 'dimensions' ? 'default' : 'outline'}
            onClick={() => setViewMode('dimensions')}
            className="text-xs"
          >
            <Ruler className="w-3 h-3 mr-1" />
            Dimensions
          </Button>
          <Button
            size="sm"
            variant={viewMode === 'performance' ? 'default' : 'outline'}
            onClick={() => setViewMode('performance')}
            className="text-xs"
          >
            <Trophy className="w-3 h-3 mr-1" />
            Performance
          </Button>
          <Button
            size="sm"
            variant={viewMode === 'gains' ? 'default' : 'outline'}
            onClick={() => setViewMode('gains')}
            className="text-xs"
          >
            <TrendingUp className="w-3 h-3 mr-1" />
            Gains
          </Button>
          <Button
            size="sm"
            variant={viewMode === 'odds' ? 'default' : 'outline'}
            onClick={() => setViewMode('odds')}
            className="text-xs"
          >
            Rapports Direct
          </Button>
        </div>
        
        {/* Category Legend based on Direct Ratio */}
        <div className="flex items-center gap-4 text-xs">
          <span className="text-muted-foreground">Légende (Rapp. Direct) :</span>
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-green-500/20 flex items-center justify-center text-green-500 text-[10px] font-bold">F</span>
            <span className="text-muted-foreground">Favori ≤5 ({favorisCount})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-500 text-[10px] font-bold">O</span>
            <span className="text-muted-foreground">Outsider 5-15 ({outsidersCount})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-red-500/20 flex items-center justify-center text-red-500 text-[10px] font-bold">T</span>
            <span className="text-muted-foreground">Tocard &gt;15 ({tocardsCount})</span>
          </div>
        </div>
        
        {/* Category Filter Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Filtrer :</span>
          <Button
            size="sm"
            variant={categoryFilter === 'all' ? 'default' : 'outline'}
            onClick={() => setCategoryFilter('all')}
            className="text-xs h-7 px-2"
          >
            Tous ({horses.length})
          </Button>
          <Button
            size="sm"
            variant={categoryFilter === 'favori' ? 'default' : 'outline'}
            onClick={() => setCategoryFilter('favori')}
            className={`text-xs h-7 px-2 ${categoryFilter !== 'favori' ? 'border-green-500/50 text-green-500 hover:bg-green-500/10' : 'bg-green-500 hover:bg-green-600 text-white'}`}
            disabled={favorisCount === 0}
          >
            Favoris ({favorisCount})
          </Button>
          <Button
            size="sm"
            variant={categoryFilter === 'outsider' ? 'default' : 'outline'}
            onClick={() => setCategoryFilter('outsider')}
            className={`text-xs h-7 px-2 ${categoryFilter !== 'outsider' ? 'border-amber-500/50 text-amber-500 hover:bg-amber-500/10' : 'bg-amber-500 hover:bg-amber-600 text-white'}`}
            disabled={outsidersCount === 0}
          >
            Outsiders ({outsidersCount})
          </Button>
          <Button
            size="sm"
            variant={categoryFilter === 'tocard' ? 'default' : 'outline'}
            onClick={() => setCategoryFilter('tocard')}
            className={`text-xs h-7 px-2 ${categoryFilter !== 'tocard' ? 'border-red-500/50 text-red-500 hover:bg-red-500/10' : 'bg-red-500 hover:bg-red-600 text-white'}`}
            disabled={tocardsCount === 0}
          >
            Tocards ({tocardsCount})
          </Button>
          {horsesWithRatio === 0 && horses.length > 0 && (
            <span className="text-xs text-muted-foreground italic">(Rapports non disponibles)</span>
          )}
        </div>
        
        {/* Export Button with Column Selection */}
        <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
          <DialogTrigger asChild>
            <Button
              size="sm"
              variant="secondary"
              className="text-xs"
              disabled={horses.length === 0}
            >
              <Download className="w-3 h-3 mr-1" />
              Exporter Excel
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings2 className="w-5 h-5" />
                Colonnes à exporter
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <div className="flex flex-wrap gap-2 mb-4">
                <Button size="sm" variant="outline" onClick={selectAllColumns}>
                  Tout sélectionner
                </Button>
                <Button size="sm" variant="outline" onClick={deselectAllColumns}>
                  Tout désélectionner
                </Button>
                <Button size="sm" variant="outline" onClick={resetToDefault}>
                  Par défaut
                </Button>
                <Button size="sm" variant="secondary" onClick={saveColumnPreferences}>
                  <Save className="w-3 h-3 mr-1" />
                  Sauvegarder
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto">
                {EXPORT_COLUMNS.map((col) => (
                  <div key={col.key} className="flex items-center space-x-2">
                    <Checkbox
                      id={col.key}
                      checked={selectedColumns.has(col.key)}
                      onCheckedChange={() => toggleColumn(col.key)}
                    />
                    <Label htmlFor={col.key} className="text-sm cursor-pointer">
                      {col.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setExportDialogOpen(false)}>
                Annuler
              </Button>
              <Button 
                onClick={exportToExcel} 
                disabled={selectedColumns.size === 0}
              >
                <Download className="w-4 h-4 mr-2" />
                Exporter ({selectedColumns.size} colonnes)
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Data Table with Scroll Arrows */}
      <div className="relative">
        {/* Scroll Up Arrow */}
        <Button
          size="icon"
          variant="secondary"
          onClick={scrollUp}
          className="absolute -top-2 left-1/2 -translate-x-1/2 z-20 w-8 h-8 rounded-full shadow-lg bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <ArrowUp className="w-4 h-4" />
        </Button>

        <div 
          ref={scrollContainerRef}
          className="rounded-lg border border-border overflow-y-auto bg-muted/20 max-h-[500px] mt-4"
        >
          <table className="w-full text-xs">
            <thead className="bg-muted/50 sticky top-0 z-10">
              <tr className="text-muted-foreground border-b border-border">
                <th className="text-left py-2 px-3 font-semibold">N°</th>
                <th className="text-left py-2 px-3 font-semibold">Nom</th>
                {viewMode === 'essential' && (
                  <>
                    <th className="text-center py-2 px-3 font-semibold">Rapp. Direct</th>
                    <th className="text-center py-2 px-3 font-semibold">Rapp. Réf</th>
                    <th className="text-center py-2 px-3 font-semibold">Tendance</th>
                    <th className="text-left py-2 px-3 font-semibold">Musique</th>
                    <th className="text-center py-2 px-3 font-semibold">Victoires</th>
                  </>
                )}
                {viewMode === 'basic' && (
                  <>
                    <th className="text-left py-2 px-3 font-semibold">Âge</th>
                    <th className="text-left py-2 px-3 font-semibold">Sexe</th>
                    <th className="text-left py-2 px-3 font-semibold">Driver</th>
                    <th className="text-left py-2 px-3 font-semibold">Entraîneur</th>
                    <th className="text-left py-2 px-3 font-semibold">Œillères</th>
                    <th className="text-left py-2 px-3 font-semibold">Déferré</th>
                  </>
                )}
                {viewMode === 'dimensions' && (
                  <>
                    <th className="text-center py-2 px-3 font-semibold">Poids</th>
                    <th className="text-center py-2 px-3 font-semibold">Distance H.</th>
                    <th className="text-center py-2 px-3 font-semibold">Valeur H.</th>
                    <th className="text-center py-2 px-3 font-semibold">Rapp. Direct</th>
                    <th className="text-center py-2 px-3 font-semibold">Tendance</th>
                    <th className="text-center py-2 px-3 font-semibold">Réd. km</th>
                  </>
                )}
                {viewMode === 'performance' && (
                  <>
                    <th className="text-center py-2 px-3 font-semibold">Courses</th>
                    <th className="text-center py-2 px-3 font-semibold">1ères</th>
                    <th className="text-center py-2 px-3 font-semibold">2èmes</th>
                    <th className="text-center py-2 px-3 font-semibold">3èmes</th>
                    <th className="text-center py-2 px-3 font-semibold">Places</th>
                    <th className="text-center py-2 px-3 font-semibold">Tx Victoire</th>
                    <th className="text-left py-2 px-3 font-semibold">Musique</th>
                  </>
                )}
                {viewMode === 'gains' && (
                  <>
                    <th className="text-right py-2 px-3 font-semibold">Carrière</th>
                    <th className="text-right py-2 px-3 font-semibold">Victoires</th>
                    <th className="text-right py-2 px-3 font-semibold">Places</th>
                    <th className="text-right py-2 px-3 font-semibold">Année {new Date().getFullYear()}</th>
                    <th className="text-right py-2 px-3 font-semibold">Année {new Date().getFullYear() - 1}</th>
                  </>
                )}
                {viewMode === 'odds' && (
                  <>
                    <th className="text-center py-2 px-3 font-semibold">Rapp. Direct</th>
                    <th className="text-center py-2 px-3 font-semibold">Type</th>
                    <th className="text-center py-2 px-3 font-semibold">Tendance</th>
                    <th className="text-center py-2 px-3 font-semibold">Rapp. Réf</th>
                    <th className="text-center py-2 px-3 font-semibold">Favori</th>
                    <th className="text-center py-2 px-3 font-semibold">Grosse cote</th>
                  </>
                )}
                <th className="text-center py-2 px-3 font-semibold w-8"></th>
              </tr>
            </thead>
            <tbody>
              {[...filteredHorses].sort((a, b) => {
                // Sort by direct ratio (lower = better, 0 means no data = last)
                if (a.lastDirectRatio <= 0 && b.lastDirectRatio <= 0) return 0;
                if (a.lastDirectRatio <= 0) return 1;
                if (b.lastDirectRatio <= 0) return -1;
                return a.lastDirectRatio - b.lastDirectRatio;
              }).map((horse) => (
                <Fragment key={horse.numero}>
                  <tr 
                    className={`border-b hover:bg-muted/30 transition-colors cursor-pointer ${
                      arriveePositionMap.has(horse.numero) 
                        ? `${getHorseDisplayInfo(horse).borderColor} border-l-4` 
                        : 'border-border/50'
                    }`}
                    onClick={() => toggleExpand(horse.numero)}
                  >
                    <td className="py-2 px-3">
                      {(() => {
                        const displayInfo = getHorseDisplayInfo(horse);
                        return (
                          <div className="flex items-center gap-1">
                            <span className={`w-7 h-7 rounded-full ${displayInfo.bgColor} ${displayInfo.textColor} text-sm font-bold flex items-center justify-center border ${displayInfo.borderColor}`}>
                              {horse.numero}
                            </span>
                            {displayInfo.finishPosition !== null && (
                              <Badge className={`${displayInfo.bgColor} ${displayInfo.textColor} border ${displayInfo.borderColor} text-xs px-1`}>
                                {displayInfo.finishPosition === 1 ? '1er' : `${displayInfo.finishPosition}e`}
                              </Badge>
                            )}
                            {displayInfo.finishPosition === null && getMedalRank(horse.lastDirectRatio) && (
                              <div className="flex items-center">
                                <Medal className={`w-4 h-4 ${getMedalColor(horse.lastDirectRatio)}`} />
                                <span className={`text-xs font-bold ${getMedalColor(horse.lastDirectRatio)}`}>
                                  {getMedalRank(horse.lastDirectRatio)}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="py-2 px-3 font-medium text-foreground">{horse.name}</td>
                    {viewMode === 'essential' && (() => {
                      const ratioTrend = calculateRatioTrend(horse.lastDirectRatio, horse.lastRefRatio);
                      return (
                        <>
                          <td className="py-2 px-3 text-center">
                            <span className="font-semibold text-foreground">
                              {horse.lastDirectRatio > 0 ? horse.lastDirectRatio.toFixed(1) : '-'}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span className="text-foreground/80">
                              {horse.lastRefRatio > 0 ? horse.lastRefRatio.toFixed(1) : '-'}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-center">
                            {ratioTrend.trend ? (
                              <span className={`font-bold ${ratioTrend.trend === 'H' ? 'text-red-500' : 'text-green-500'}`}>
                                {ratioTrend.trend}
                                {ratioTrend.diff >= 1 && Math.round(ratioTrend.diff)}
                              </span>
                            ) : '-'}
                          </td>
                          <td className="py-2 px-3">
                            <span className="font-mono text-foreground bg-muted/50 px-2 py-1 rounded text-[11px] block max-w-[200px] truncate">
                              {horse.musique || '-'}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <Badge variant="default" className="bg-primary/20 text-primary">
                              {horse.numberOfWins}/{horse.numberOfRaces || 0}
                            </Badge>
                          </td>
                        </>
                      );
                    })()}
                    {viewMode === 'basic' && (
                      <>
                        <td className="py-2 px-3 text-foreground/80">{horse.age} ans</td>
                        <td className="py-2 px-3 text-foreground/80">{horse.sex}</td>
                        <td className="py-2 px-3 text-foreground/80">{horse.driver}</td>
                        <td className="py-2 px-3 text-foreground/80">{horse.trainer}</td>
                        <td className="py-2 px-3 text-foreground/80">{horse.blinkers || '-'}</td>
                        <td className="py-2 px-3 text-foreground/80">{horse.unshod || '-'}</td>
                      </>
                    )}
                    {viewMode === 'dimensions' && (
                      <>
                        <td className="py-2 px-3 text-center">
                          <span className="font-semibold text-foreground">
                            {horse.handicapWeight > 0 ? `${horse.handicapWeight} kg` : '-'}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center text-foreground/80">
                          {horse.handicapDistance > 0 ? `${horse.handicapDistance}m` : '-'}
                        </td>
                        <td className="py-2 px-3 text-center text-foreground/80">{horse.handicapValue || '-'}</td>
                        <td className="py-2 px-3 text-center">
                          <span className="font-semibold text-foreground">
                            {horse.lastDirectRatio > 0 ? horse.lastDirectRatio.toFixed(1) : '-'}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center">
                          {horse.lastDirectTrend ? (
                            <span className={`font-bold ${horse.lastDirectTrend === 'H' ? 'text-red-500' : 'text-green-500'}`}>
                              {horse.lastDirectTrend}
                              {horse.lastDirectTrendNumber > 0 && horse.lastDirectTrendNumber}
                            </span>
                          ) : '-'}
                        </td>
                        <td className="py-2 px-3 text-center text-foreground/80">{horse.reductionKm > 0 ? horse.reductionKm : '-'}</td>
                      </>
                    )}
                    {viewMode === 'performance' && (
                      <>
                        <td className="py-2 px-3 text-center text-foreground/80">{horse.numberOfRaces || '-'}</td>
                        <td className="py-2 px-3 text-center">
                          <Badge variant="default" className="bg-primary/20 text-primary">
                            {horse.numberOfWins}
                          </Badge>
                        </td>
                        <td className="py-2 px-3 text-center text-foreground/80">{horse.numberOfPlacesSecond}</td>
                        <td className="py-2 px-3 text-center text-foreground/80">{horse.numberOfPlacesThird}</td>
                        <td className="py-2 px-3 text-center text-foreground/80">{horse.numberOfPlaces}</td>
                        <td className="py-2 px-3 text-center">
                          <Badge variant="secondary">{formatWinRate(horse.numberOfWins, horse.numberOfRaces)}</Badge>
                        </td>
                        <td className="py-2 px-3 font-mono text-foreground/70 text-[10px] max-w-[150px] truncate">{horse.musique || '-'}</td>
                      </>
                    )}
                    {viewMode === 'gains' && (
                      <>
                        <td className="py-2 px-3 text-right text-foreground/80">
                          {horse.gainsCareer > 0 ? formatEuros(horse.gainsCareer) : '-'}
                        </td>
                        <td className="py-2 px-3 text-right text-foreground/80">
                          {horse.gainsVictory > 0 ? formatEuros(horse.gainsVictory) : '-'}
                        </td>
                        <td className="py-2 px-3 text-right text-foreground/80">
                          {horse.gainsPlace > 0 ? formatEuros(horse.gainsPlace) : '-'}
                        </td>
                        <td className="py-2 px-3 text-right text-foreground/80">
                          {horse.gainsCurrentYear > 0 ? formatEuros(horse.gainsCurrentYear) : '-'}
                        </td>
                        <td className="py-2 px-3 text-right text-foreground/80">
                          {horse.gainsPreviousYear > 0 ? formatEuros(horse.gainsPreviousYear) : '-'}
                        </td>
                      </>
                    )}
                    {viewMode === 'odds' && (
                      <>
                        <td className="py-2 px-3 text-center">
                          <span className="font-semibold text-foreground">
                            {horse.lastDirectRatio > 0 ? horse.lastDirectRatio.toFixed(1) : '-'}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center text-foreground/80">{horse.lastDirectType || '-'}</td>
                        <td className="py-2 px-3 text-center">
                          {horse.lastDirectTrend ? (
                            <span className={`font-bold ${horse.lastDirectTrend === 'H' ? 'text-red-500' : 'text-green-500'}`}>
                              {horse.lastDirectTrend}
                              {horse.lastDirectTrendNumber > 0 && horse.lastDirectTrendNumber}
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="py-2 px-3 text-center text-foreground/80">
                          {horse.lastRefRatio > 0 ? horse.lastRefRatio.toFixed(1) : '-'}
                        </td>
                        <td className="py-2 px-3 text-center">
                          {horse.lastDirectFavorite ? (
                            <Badge variant="default" className="bg-green-500/20 text-green-500">
                              ★
                            </Badge>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="py-2 px-3 text-center">
                          {horse.lastDirectHighOdds ? (
                            <Badge variant="default" className="bg-red-500/20 text-red-500">
                              ↑
                            </Badge>
                          ) : (
                            '-'
                          )}
                        </td>
                      </>
                    )}
                    <td className="py-2 px-3 text-center">
                      {expandedHorse === horse.numero ? (
                        <ChevronUp className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      )}
                    </td>
                  </tr>
                  {/* Expanded Details Row */}
                  {expandedHorse === horse.numero && (
                    <tr key={`${horse.numero}-details`} className="bg-muted/10">
                      <td colSpan={10} className="py-3 px-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                          <div className="col-span-2">
                            <span className="text-muted-foreground block mb-1">Musique complète:</span>
                            <span className="font-mono text-foreground bg-muted/50 px-2 py-1 rounded block">
                              {horse.musique || '-'}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block">Rapport direct:</span>
                            <span className="text-foreground font-semibold">
                              {horse.lastDirectRatio > 0 ? horse.lastDirectRatio.toFixed(2) : '-'}
                              {horse.lastDirectTrend && (
                                <span className={`ml-1 ${horse.lastDirectTrend === 'H' ? 'text-red-500' : 'text-green-500'}`}>
                                  ({horse.lastDirectTrend}{horse.lastDirectTrendNumber || ''})
                                </span>
                              )}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block">Rapport référence:</span>
                            <span className="text-foreground">
                              {horse.lastRefRatio > 0 ? horse.lastRefRatio.toFixed(2) : '-'}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block">Position:</span>
                            <span className="text-foreground">{horse.position || '-'}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block">Poids handicap:</span>
                            <span className="text-foreground">{horse.handicapWeight > 0 ? `${horse.handicapWeight} kg` : '-'}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block">Distance handicap:</span>
                            <span className="text-foreground">{horse.handicapDistance > 0 ? `${horse.handicapDistance}m` : '-'}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block">Valeur handicap:</span>
                            <span className="text-foreground">{horse.handicapValue || '-'}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block">Allure:</span>
                            <span className="text-foreground">{horse.pace || '-'}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block">Réduction km:</span>
                            <span className="text-foreground">{horse.reductionKm > 0 ? horse.reductionKm : '-'}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block">Temps obtenu:</span>
                            <span className="text-foreground">{horse.timeObtained || '-'}</span>
                          </div>
                          {horse.supplement && (
                            <div>
                              <Badge variant="outline" className="text-amber-500 border-amber-500/50">
                                Supplément
                              </Badge>
                            </div>
                          )}
                          {horse.mareInFoal && (
                            <div>
                              <Badge variant="outline" className="text-pink-500 border-pink-500/50">
                                Jument pleine
                              </Badge>
                            </div>
                          )}
                          {horse.unprecedented && (
                            <div>
                              <Badge variant="outline" className="text-blue-500 border-blue-500/50">
                                Inédit
                              </Badge>
                            </div>
                          )}
                          {horse.incident && (
                            <div>
                              <Badge variant="destructive">{horse.incident}</Badge>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* Scroll Down Arrow */}
        <Button
          size="icon"
          variant="secondary"
          onClick={scrollDown}
          className="absolute -bottom-2 left-1/2 -translate-x-1/2 z-20 w-8 h-8 rounded-full shadow-lg bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <ArrowDown className="w-4 h-4" />
        </Button>
      </div>

      {/* Summary Statistics */}
      <div className="mt-6 p-4 rounded-lg bg-muted/30 border border-border">
        <h4 className="text-sm font-semibold text-foreground mb-3">Statistiques globales</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 text-xs">
          <div className="flex flex-col">
            <span className="text-muted-foreground">Chevaux</span>
            <span className="text-lg font-bold text-foreground">{horses.length}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-muted-foreground">Favoris (≤5)</span>
            <span className="text-lg font-bold text-green-500">{favorisCount}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-muted-foreground">Outsiders (5-15)</span>
            <span className="text-lg font-bold text-amber-500">{outsidersCount}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-muted-foreground">Tocards (&gt;15)</span>
            <span className="text-lg font-bold text-red-500">{tocardsCount}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-muted-foreground">Avec victoires</span>
            <span className="text-lg font-bold text-green-500">{horses.filter(h => h.numberOfWins > 0).length}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-muted-foreground">Moy. ratio direct</span>
            <span className="text-lg font-bold text-foreground">
              {horses.filter(h => h.lastDirectRatio > 0).length > 0
                ? (horses.filter(h => h.lastDirectRatio > 0).reduce((sum, h) => sum + h.lastDirectRatio, 0) / horses.filter(h => h.lastDirectRatio > 0).length).toFixed(1)
                : '-'}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-muted-foreground">Tendance H (monte)</span>
            <span className="text-lg font-bold text-red-500">
              {horses.filter(h => {
                const trend = calculateRatioTrend(h.lastDirectRatio, h.lastRefRatio);
                return trend.trend === 'H';
              }).length}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-muted-foreground">Tendance B (baisse)</span>
            <span className="text-lg font-bold text-green-500">
              {horses.filter(h => {
                const trend = calculateRatioTrend(h.lastDirectRatio, h.lastRefRatio);
                return trend.trend === 'B';
              }).length}
            </span>
          </div>
        </div>
        
        {/* Top 3 Summary */}
        {sortedByRatio.length > 0 && (
          <div className="mt-4 pt-3 border-t border-border">
            <span className="text-muted-foreground text-xs">Top 3 meilleurs ratios : </span>
            <span className="text-xs">
              {sortedByRatio.slice(0, 3).map((h, i) => (
                <span key={h.numero} className="inline-flex items-center gap-1 mr-3">
                  <Medal className={`w-3 h-3 ${i === 0 ? 'text-amber-400' : i === 1 ? 'text-gray-400' : 'text-amber-700'}`} />
                  <span className="font-semibold text-foreground">N°{h.numero}</span>
                  <span className="text-muted-foreground">({h.lastDirectRatio.toFixed(1)})</span>
                </span>
              ))}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

