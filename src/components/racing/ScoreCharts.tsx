
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, Cell, LineChart, Line, Area, AreaChart } from 'recharts';
import { Horse } from '@/types/racing';
import { BarChart3, Radar as RadarIcon, TrendingUp } from 'lucide-react';

interface ScoreChartsProps {
  horses: Horse[];
}

const COLORS = {
  primary: 'hsl(160, 100%, 50%)',
  secondary: 'hsl(217, 91%, 60%)',
  accent: 'hsl(35, 92%, 55%)',
  muted: 'hsl(240, 10%, 40%)',
};

const LINE_COLORS = [
  'hsl(160, 100%, 50%)',
  'hsl(217, 91%, 60%)',
  'hsl(35, 92%, 55%)',
  'hsl(280, 80%, 60%)',
  'hsl(0, 72%, 51%)',
  'hsl(180, 90%, 45%)',
  'hsl(320, 70%, 50%)',
  'hsl(45, 95%, 55%)',
];

const BAR_COLORS = [
  'hsl(160, 100%, 50%)',
  'hsl(180, 90%, 45%)',
  'hsl(200, 85%, 50%)',
  'hsl(217, 91%, 60%)',
  'hsl(240, 80%, 55%)',
  'hsl(280, 75%, 55%)',
  'hsl(320, 70%, 50%)',
  'hsl(35, 92%, 55%)',
];

// Convert place to performance score (inverted: 1st place = 100, lower places = lower scores)
function placeToPerformance(place: number): number {
  if (place === 0) return 0; // Disqualified
  if (place === 1) return 100;
  if (place === 2) return 85;
  if (place === 3) return 72;
  if (place === 4) return 60;
  if (place === 5) return 50;
  if (place <= 8) return 35;
  return 20;
}

export function ScoreCharts({ horses }: ScoreChartsProps) {
  // Prepare data for bar chart (top 10 by total score)
  const barData = horses.slice(0, 10).map((horse, idx) => ({
    name: `N°${horse.numero}`,
    numero: horse.numero,
    'Score Cote': horse.scoreCote,
    'Score Musique': horse.scoreMusique,
    'Score Ajusté': horse.scoreMusiqueAjuste,
    'Total': horse.scoreTotal,
    fill: BAR_COLORS[idx % BAR_COLORS.length],
  }));

  // Prepare data for performance evolution line chart (top 8 horses)
  const top8Horses = horses.slice(0, 8);
  const maxRaces = Math.max(...top8Horses.map(h => h.musicItems.length), 1);
  
  const evolutionData = Array.from({ length: maxRaces }, (_, raceIdx) => {
    const entry: Record<string, string | number> = { 
      race: `Course ${maxRaces - raceIdx}`,
      raceNum: maxRaces - raceIdx,
    };
    top8Horses.forEach((horse) => {
      const place = horse.musicItems[raceIdx];
      entry[`N°${horse.numero}`] = place !== undefined ? placeToPerformance(place) : 0;
      entry[`place_${horse.numero}`] = place !== undefined ? place : '-';
    });
    return entry;
  }).reverse();

  // Prepare data for radar chart (top 5)
  const radarData = [
    { subject: 'Cote', fullMark: 100 },
    { subject: 'Musique', fullMark: 100 },
    { subject: 'Ajusté', fullMark: 100 },
    { subject: 'Total', fullMark: 100 },
  ].map(item => {
    const entry: Record<string, string | number> = { subject: item.subject, fullMark: item.fullMark };
    horses.slice(0, 5).forEach((horse) => {
      if (item.subject === 'Cote') entry[`N°${horse.numero}`] = horse.scoreCote;
      if (item.subject === 'Musique') entry[`N°${horse.numero}`] = horse.scoreMusique;
      if (item.subject === 'Ajusté') entry[`N°${horse.numero}`] = horse.scoreMusiqueAjuste;
      if (item.subject === 'Total') entry[`N°${horse.numero}`] = horse.scoreTotal;
    });
    return entry;
  });

  const radarColors = ['hsl(160, 100%, 50%)', 'hsl(217, 91%, 60%)', 'hsl(35, 92%, 55%)', 'hsl(280, 80%, 60%)', 'hsl(0, 72%, 51%)'];

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string; dataKey?: string }>; label?: string }) => {
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

  const EvolutionTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string; payload?: Record<string, number | string> }>; label?: string }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg min-w-[160px]">
          <p className="font-semibold text-foreground mb-2 border-b border-border pb-2">{label}</p>
          {payload.map((entry, index) => {
            const horseNum = entry.name.replace('N°', '');
            const place = entry.payload?.[`place_${horseNum}`];
            return (
              <div key={index} className="flex justify-between items-center gap-4 text-sm py-0.5" style={{ color: entry.color }}>
                <span>{entry.name}</span>
                <span className="font-mono font-bold">
                  {place === '-' ? '-' : `${place}${place === 1 ? 'er' : 'e'}`}
                </span>
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Performance Evolution Line Chart */}
      <div className="cyber-card">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">
            Évolution des Performances (Top 8)
          </h3>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          Basé sur les 6 dernières courses de chaque cheval (1er = 100pts, 2e = 85pts, etc.)
        </p>
        
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={evolutionData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <defs>
                {top8Horses.map((horse, idx) => (
                  <linearGradient key={horse.numero} id={`gradient-${horse.numero}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={LINE_COLORS[idx]} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={LINE_COLORS[idx]} stopOpacity={0}/>
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 10%, 25%)" />
              <XAxis 
                dataKey="race" 
                stroke="hsl(220, 15%, 60%)"
                tick={{ fill: 'hsl(220, 15%, 60%)', fontSize: 11 }}
              />
              <YAxis 
                stroke="hsl(220, 15%, 60%)"
                tick={{ fill: 'hsl(220, 15%, 60%)', fontSize: 12 }}
                domain={[0, 100]}
                label={{ 
                  value: 'Performance', 
                  angle: -90, 
                  position: 'insideLeft',
                  fill: 'hsl(220, 15%, 50%)',
                  fontSize: 12
                }}
              />
              <Tooltip content={<EvolutionTooltip />} />
              <Legend 
                wrapperStyle={{ paddingTop: '20px' }}
                formatter={(value) => <span className="text-sm text-foreground">{value}</span>}
              />
              {top8Horses.map((horse, idx) => (
                <Area
                  key={horse.numero}
                  type="monotone"
                  dataKey={`N°${horse.numero}`}
                  stroke={LINE_COLORS[idx]}
                  fill={`url(#gradient-${horse.numero})`}
                  strokeWidth={2}
                  dot={{ fill: LINE_COLORS[idx], strokeWidth: 0, r: 4 }}
                  activeDot={{ r: 6, strokeWidth: 2, stroke: 'hsl(240, 15%, 13%)' }}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
        
        {/* Legend with place indicators */}
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground mb-2">Légende des scores:</p>
          <div className="flex flex-wrap gap-4 text-xs">
            <span className="text-success">1er = 100</span>
            <span className="text-secondary">2e = 85</span>
            <span className="text-accent">3e = 72</span>
            <span className="text-muted-foreground">4e = 60 | 5e = 50 | 6-8e = 35 | 9e+ = 20</span>
          </div>
        </div>
      </div>

      {/* Bar Chart - Score Comparison */}
      <div className="cyber-card">
        <div className="flex items-center gap-2 mb-6">
          <BarChart3 className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">
            Comparaison des Scores (Top 10)
          </h3>
        </div>
        
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 10%, 25%)" />
              <XAxis 
                dataKey="name" 
                stroke="hsl(220, 15%, 60%)"
                tick={{ fill: 'hsl(220, 15%, 60%)', fontSize: 12 }}
              />
              <YAxis 
                stroke="hsl(220, 15%, 60%)"
                tick={{ fill: 'hsl(220, 15%, 60%)', fontSize: 12 }}
                domain={[0, 100]}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                wrapperStyle={{ paddingTop: '20px' }}
                formatter={(value) => <span className="text-sm text-foreground">{value}</span>}
              />
              <Bar dataKey="Score Cote" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
              <Bar dataKey="Score Musique" fill={COLORS.secondary} radius={[4, 4, 0, 0]} />
              <Bar dataKey="Score Ajusté" fill={COLORS.accent} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Total Score Bar Chart */}
      <div className="cyber-card">
        <div className="flex items-center gap-2 mb-6">
          <BarChart3 className="w-5 h-5 text-secondary" />
          <h3 className="text-lg font-semibold text-foreground">
            Score Total par Cheval
          </h3>
        </div>
        
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} layout="vertical" margin={{ top: 5, right: 30, left: 50, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 10%, 25%)" />
              <XAxis 
                type="number"
                stroke="hsl(220, 15%, 60%)"
                tick={{ fill: 'hsl(220, 15%, 60%)', fontSize: 12 }}
                domain={[0, 100]}
              />
              <YAxis 
                dataKey="name"
                type="category"
                stroke="hsl(220, 15%, 60%)"
                tick={{ fill: 'hsl(220, 15%, 60%)', fontSize: 12 }}
                width={50}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="Total" radius={[0, 4, 4, 0]}>
                {barData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Radar Chart - Top 5 Profile */}
      <div className="cyber-card">
        <div className="flex items-center gap-2 mb-6">
          <RadarIcon className="w-5 h-5 text-accent" />
          <h3 className="text-lg font-semibold text-foreground">
            Profil Radar des 5 Meilleurs
          </h3>
        </div>
        
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
              <PolarGrid stroke="hsl(240, 10%, 30%)" />
              <PolarAngleAxis 
                dataKey="subject" 
                tick={{ fill: 'hsl(220, 15%, 70%)', fontSize: 13, fontWeight: 500 }}
              />
              <PolarRadiusAxis 
                angle={90} 
                domain={[0, 100]} 
                tick={{ fill: 'hsl(220, 15%, 50%)', fontSize: 10 }}
                stroke="hsl(240, 10%, 30%)"
              />
              {horses.slice(0, 5).map((horse, idx) => (
                <Radar
                  key={horse.numero}
                  name={`N°${horse.numero}`}
                  dataKey={`N°${horse.numero}`}
                  stroke={radarColors[idx]}
                  fill={radarColors[idx]}
                  fillOpacity={0.15}
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
    </div>
  );
}

