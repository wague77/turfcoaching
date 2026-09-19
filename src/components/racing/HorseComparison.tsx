
import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend } from 'recharts';
import { Horse } from '@/types/racing';
import { GitCompare, X, Plus, Trophy, TrendingUp, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface HorseComparisonProps {
  horses: Horse[];
}

const COMPARISON_COLORS = [
  { main: 'hsl(160, 100%, 50%)', light: 'hsl(160, 100%, 50%, 0.2)', name: 'Émeraude' },
  { main: 'hsl(217, 91%, 60%)', light: 'hsl(217, 91%, 60%, 0.2)', name: 'Saphir' },
  { main: 'hsl(35, 92%, 55%)', light: 'hsl(35, 92%, 55%, 0.2)', name: 'Ambre' },
];

export function HorseComparison({ horses }: HorseComparisonProps) {
  const [selectedHorses, setSelectedHorses] = useState<Horse[]>([]);
  const [isSelecting, setIsSelecting] = useState(false);

  const toggleHorseSelection = (horse: Horse) => {
    if (selectedHorses.find(h => h.numero === horse.numero)) {
      setSelectedHorses(selectedHorses.filter(h => h.numero !== horse.numero));
    } else if (selectedHorses.length < 3) {
      setSelectedHorses([...selectedHorses, horse]);
    }
  };

  const removeHorse = (numero: number) => {
    setSelectedHorses(selectedHorses.filter(h => h.numero !== numero));
  };

  const clearSelection = () => {
    setSelectedHorses([]);
    setIsSelecting(false);
  };

  // Prepare radar data for comparison
  const radarData = [
    { subject: 'Score Cote', key: 'scoreCote' },
    { subject: 'Score Musique', key: 'scoreMusique' },
    { subject: 'Score Ajusté', key: 'scoreMusiqueAjuste' },
    { subject: 'Score Total', key: 'scoreTotal' },
  ].map(item => {
    const entry: Record<string, string | number> = { subject: item.subject };
    selectedHorses.forEach(horse => {
      entry[`N°${horse.numero}`] = horse[item.key as keyof Horse] as number;
    });
    return entry;
  });

  // Prepare bar comparison data
  const barData = [
    { name: 'Score Cote', key: 'scoreCote' },
    { name: 'Score Musique', key: 'scoreMusique' },
    { name: 'Score Ajusté', key: 'scoreMusiqueAjuste' },
    { name: 'Score Total', key: 'scoreTotal' },
  ].map(item => {
    const entry: Record<string, string | number> = { name: item.name };
    selectedHorses.forEach(horse => {
      entry[`N°${horse.numero}`] = horse[item.key as keyof Horse] as number;
    });
    return entry;
  });

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="font-semibold text-foreground mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: <span className="font-mono font-bold">{entry.value}</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Selection Header */}
      <div className="cyber-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <GitCompare className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">
              Mode Comparaison
            </h3>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant={isSelecting ? "default" : "outline"}
              size="sm"
              onClick={() => setIsSelecting(!isSelecting)}
              className={isSelecting ? "bg-primary text-primary-foreground" : "border-primary/30 text-primary hover:bg-primary/10"}
            >
              <Plus className="w-4 h-4 mr-2" />
              {isSelecting ? "Sélection active" : "Sélectionner"}
            </Button>
            
            {selectedHorses.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearSelection}
                className="border-destructive/30 text-destructive hover:bg-destructive/10"
              >
                <X className="w-4 h-4 mr-2" />
                Effacer
              </Button>
            )}
          </div>
        </div>

        {/* Selected Horses Display */}
        <div className="flex flex-wrap gap-3 mb-4">
          {selectedHorses.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Sélectionnez 2 à 3 chevaux pour comparer leurs statistiques
            </p>
          ) : (
            selectedHorses.map((horse, idx) => (
              <div
                key={horse.numero}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border-2"
                style={{ 
                  borderColor: COMPARISON_COLORS[idx].main,
                  backgroundColor: COMPARISON_COLORS[idx].light 
                }}
              >
                <span 
                  className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm"
                  style={{ backgroundColor: COMPARISON_COLORS[idx].main, color: 'hsl(240, 15%, 10%)' }}
                >
                  {horse.numero}
                </span>
                <div className="flex flex-col">
                  <span className="font-semibold text-foreground">N°{horse.numero}</span>
                  <span className="text-xs text-muted-foreground">Cote: {horse.cote}</span>
                </div>
                <button
                  onClick={() => removeHorse(horse.numero)}
                  className="ml-2 p-1 rounded-full hover:bg-muted/50 transition-colors"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Horse Selection Grid */}
        {isSelecting && (
          <div className="border-t border-border pt-4 mt-4">
            <p className="text-sm text-muted-foreground mb-3">
              Cliquez sur un cheval pour le sélectionner ({3 - selectedHorses.length} restant{3 - selectedHorses.length > 1 ? 's' : ''})
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {horses.map((horse) => {
                const isSelected = selectedHorses.find(h => h.numero === horse.numero);
                const selectedIdx = selectedHorses.findIndex(h => h.numero === horse.numero);
                const isDisabled = !isSelected && selectedHorses.length >= 3;
                
                return (
                  <button
                    key={horse.numero}
                    onClick={() => !isDisabled && toggleHorseSelection(horse)}
                    disabled={isDisabled}
                    className={cn(
                      "flex flex-col items-center p-3 rounded-lg border-2 transition-all",
                      isSelected 
                        ? "border-primary bg-primary/10" 
                        : isDisabled
                          ? "border-border/50 bg-muted/20 opacity-50 cursor-not-allowed"
                          : "border-border hover:border-primary/50 hover:bg-muted/30 cursor-pointer"
                    )}
                    style={isSelected ? { 
                      borderColor: COMPARISON_COLORS[selectedIdx].main,
                      backgroundColor: COMPARISON_COLORS[selectedIdx].light 
                    } : undefined}
                  >
                    <span className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center font-bold mb-1",
                      isSelected ? "" : "bg-muted"
                    )}
                    style={isSelected ? { 
                      backgroundColor: COMPARISON_COLORS[selectedIdx].main, 
                      color: 'hsl(240, 15%, 10%)' 
                    } : undefined}
                    >
                      {horse.numero}
                    </span>
                    <span className="text-xs text-muted-foreground">{horse.cote}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Comparison Content */}
      {selectedHorses.length >= 2 && (
        <>
          {/* Stats Cards Side by Side */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {selectedHorses.map((horse, idx) => (
              <div 
                key={horse.numero}
                className="cyber-card border-2 animate-slide-up"
                style={{ 
                  borderColor: COMPARISON_COLORS[idx].main,
                  animationDelay: `${idx * 100}ms`
                }}
              >
                {/* Header */}
                <div 
                  className="flex items-center gap-3 pb-4 mb-4 border-b"
                  style={{ borderColor: COMPARISON_COLORS[idx].light }}
                >
                  <div 
                    className="w-14 h-14 rounded-xl flex items-center justify-center font-bold text-xl"
                    style={{ backgroundColor: COMPARISON_COLORS[idx].main, color: 'hsl(240, 15%, 10%)' }}
                  >
                    {horse.numero}
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-foreground">Cheval N°{horse.numero}</h4>
                    <p className="text-sm text-muted-foreground">Cote: {horse.cote.toFixed(1)}</p>
                  </div>
                </div>

                {/* Scores */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" /> Score Cote
                    </span>
                    <span className="font-mono font-bold text-lg" style={{ color: COMPARISON_COLORS[idx].main }}>
                      {horse.scoreCote}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                      <Trophy className="w-4 h-4" /> Score Musique
                    </span>
                    <span className="font-mono font-bold text-lg" style={{ color: COMPARISON_COLORS[idx].main }}>
                      {horse.scoreMusique}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                      <Target className="w-4 h-4" /> Score Ajusté
                    </span>
                    <span className="font-mono font-bold text-lg" style={{ color: COMPARISON_COLORS[idx].main }}>
                      {horse.scoreMusiqueAjuste}
                    </span>
                  </div>
                  
                  <div className="pt-3 mt-3 border-t border-border">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold text-foreground">Score Total</span>
                      <span 
                        className="font-mono font-bold text-2xl"
                        style={{ color: COMPARISON_COLORS[idx].main }}
                      >
                        {horse.scoreTotal}
                      </span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500"
                        style={{ 
                          width: `${horse.scoreTotal}%`,
                          backgroundColor: COMPARISON_COLORS[idx].main 
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Musique */}
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-xs text-muted-foreground mb-1">Musique</p>
                  <p className="font-mono text-sm text-foreground">{horse.musique}</p>
                </div>

                {/* Labels */}
                <div className="mt-3 flex flex-wrap gap-2">
                  {horse.label !== 'NEUTRE' && (
                    <span className={cn(
                      "px-2 py-1 rounded-full text-xs font-semibold",
                      horse.label === 'BASE' && "bg-success/20 text-success",
                      horse.label === 'OUTSIDER' && "bg-secondary/20 text-secondary",
                      horse.label === 'DOUTEUX' && "bg-warning/20 text-warning"
                    )}>
                      {horse.label === 'BASE' && '🧱'} 
                      {horse.label === 'OUTSIDER' && '💎'} 
                      {horse.label === 'DOUTEUX' && '⚠️'} 
                      {horse.label}
                    </span>
                  )}
                  {horse.hasWon && (
                    <span className="px-2 py-1 rounded-full text-xs font-semibold bg-accent/20 text-accent">
                      🏆 Gagnant
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Radar Comparison Chart */}
          <div className="cyber-card">
            <h4 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
              <GitCompare className="w-5 h-5 text-secondary" />
              Profil Comparatif
            </h4>
            
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                  <PolarGrid stroke="hsl(240, 10%, 30%)" />
                  <PolarAngleAxis 
                    dataKey="subject" 
                    tick={{ fill: 'hsl(220, 15%, 70%)', fontSize: 12, fontWeight: 500 }}
                  />
                  <PolarRadiusAxis 
                    angle={90} 
                    domain={[0, 100]} 
                    tick={{ fill: 'hsl(220, 15%, 50%)', fontSize: 10 }}
                    stroke="hsl(240, 10%, 30%)"
                  />
                  {selectedHorses.map((horse, idx) => (
                    <Radar
                      key={horse.numero}
                      name={`N°${horse.numero}`}
                      dataKey={`N°${horse.numero}`}
                      stroke={COMPARISON_COLORS[idx].main}
                      fill={COMPARISON_COLORS[idx].main}
                      fillOpacity={0.2}
                      strokeWidth={2}
                    />
                  ))}
                  <Legend 
                    formatter={(value) => <span className="text-sm text-foreground">{value}</span>}
                  />
                  <Tooltip content={<CustomTooltip />} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bar Comparison Chart */}
          <div className="cyber-card">
            <h4 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-accent" />
              Comparaison par Catégorie
            </h4>
            
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 10%, 25%)" />
                  <XAxis 
                    dataKey="name" 
                    stroke="hsl(220, 15%, 60%)"
                    tick={{ fill: 'hsl(220, 15%, 60%)', fontSize: 11 }}
                  />
                  <YAxis 
                    stroke="hsl(220, 15%, 60%)"
                    tick={{ fill: 'hsl(220, 15%, 60%)', fontSize: 12 }}
                    domain={[0, 100]}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    formatter={(value) => <span className="text-sm text-foreground">{value}</span>}
                  />
                  {selectedHorses.map((horse, idx) => (
                    <Bar 
                      key={horse.numero}
                      dataKey={`N°${horse.numero}`} 
                      fill={COMPARISON_COLORS[idx].main} 
                      radius={[4, 4, 0, 0]} 
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      {/* Empty state when less than 2 selected */}
      {selectedHorses.length < 2 && selectedHorses.length > 0 && (
        <div className="cyber-card text-center py-12">
          <GitCompare className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">
            Sélectionnez au moins un autre cheval pour commencer la comparaison
          </p>
        </div>
      )}
    </div>
  );
}

