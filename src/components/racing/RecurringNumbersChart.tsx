
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  ComposedChart,
  Area,
} from 'recharts';
import { TrendingUp, BarChart3 } from 'lucide-react';

interface RaceHistory {
  date: string;
  reunion: number;
  course: number;
  arrivee?: {
    positions: number[];
  };
  snapshots: Array<{
    hour: string;
    horses: Array<{
      numero: number;
      cote: number;
      name: string;
    }>;
  }>;
}

interface RecurringNumbersChartProps {
  oddsHistory: RaceHistory[];
}

interface NumberPerformance {
  numero: number;
  wins: number;
  places: number; // Top 3
  top5: number;
  totalRaces: number;
  avgOddsDrop: number;
  avgOddsRise: number;
  winRate: number;
  placeRate: number;
}

const CHART_COLORS = [
  'hsl(142, 76%, 36%)', // Green
  'hsl(221, 83%, 53%)', // Blue
  'hsl(45, 93%, 47%)',  // Yellow
  'hsl(0, 84%, 60%)',   // Red
  'hsl(280, 65%, 60%)', // Purple
  'hsl(180, 65%, 45%)', // Cyan
  'hsl(30, 80%, 55%)',  // Orange
  'hsl(330, 70%, 55%)', // Pink
];

const RecurringNumbersChart = ({ oddsHistory }: RecurringNumbersChartProps) => {
  // Analyze performance for each horse number across all races
  const numberPerformances = useMemo(() => {
    const performanceMap = new Map<number, NumberPerformance>();
    const racesWithArrivee = oddsHistory.filter(r => r.arrivee && r.snapshots.length > 1);

    racesWithArrivee.forEach(race => {
      if (!race.arrivee || race.snapshots.length < 2) return;
      
      const firstSnapshot = race.snapshots[0];
      const lastSnapshot = race.snapshots[race.snapshots.length - 1];
      const positions = race.arrivee.positions;

      lastSnapshot.horses.forEach(horse => {
        if (!performanceMap.has(horse.numero)) {
          performanceMap.set(horse.numero, {
            numero: horse.numero,
            wins: 0,
            places: 0,
            top5: 0,
            totalRaces: 0,
            avgOddsDrop: 0,
            avgOddsRise: 0,
            winRate: 0,
            placeRate: 0,
          });
        }

        const stats = performanceMap.get(horse.numero)!;
        stats.totalRaces++;

        const firstOdds = firstSnapshot.horses.find(h => h.numero === horse.numero)?.cote || horse.cote;
        const change = horse.cote - firstOdds;

        if (change < 0) {
          stats.avgOddsDrop = (stats.avgOddsDrop * (stats.totalRaces - 1) + Math.abs(change)) / stats.totalRaces;
        } else if (change > 0) {
          stats.avgOddsRise = (stats.avgOddsRise * (stats.totalRaces - 1) + change) / stats.totalRaces;
        }

        const posIdx = positions.indexOf(horse.numero);
        if (posIdx === 0) stats.wins++;
        if (posIdx >= 0 && posIdx < 3) stats.places++;
        if (posIdx >= 0 && posIdx < 5) stats.top5++;
      });
    });

    // Calculate rates
    performanceMap.forEach(stats => {
      stats.winRate = stats.totalRaces > 0 ? (stats.wins / stats.totalRaces) * 100 : 0;
      stats.placeRate = stats.totalRaces > 0 ? (stats.places / stats.totalRaces) * 100 : 0;
    });

    return Array.from(performanceMap.values())
      .filter(p => p.totalRaces >= 2) // Only include numbers with at least 2 appearances
      .sort((a, b) => b.wins - a.wins || b.places - a.places)
      .slice(0, 12); // Top 12 numbers
  }, [oddsHistory]);

  // Build chart data for performance evolution by race
  const evolutionChartData = useMemo(() => {
    const topNumbers = numberPerformances.slice(0, 8).map(p => p.numero);
    const racesWithArrivee = oddsHistory.filter(r => r.arrivee && r.snapshots.length > 1);
    
    // Track cumulative performance for each number
    const cumulativeWins = new Map<number, number>();
    const cumulativePlaces = new Map<number, number>();
    topNumbers.forEach(num => {
      cumulativeWins.set(num, 0);
      cumulativePlaces.set(num, 0);
    });

    return racesWithArrivee.map((race, raceIndex) => {
      if (!race.arrivee) return null;
      
      const positions = race.arrivee.positions;
      
      topNumbers.forEach(num => {
        const posIdx = positions.indexOf(num);
        if (posIdx === 0) {
          cumulativeWins.set(num, (cumulativeWins.get(num) || 0) + 1);
        }
        if (posIdx >= 0 && posIdx < 3) {
          cumulativePlaces.set(num, (cumulativePlaces.get(num) || 0) + 1);
        }
      });

      const dataPoint: Record<string, string | number> = {
        race: `R${race.reunion}C${race.course}`,
        raceLabel: `${race.date.slice(0, 2)}/${race.date.slice(2, 4)} R${race.reunion}C${race.course}`,
        index: raceIndex + 1,
      };

      topNumbers.forEach(num => {
        dataPoint[`N${num}_wins`] = cumulativeWins.get(num) || 0;
        dataPoint[`N${num}_places`] = cumulativePlaces.get(num) || 0;
      });

      return dataPoint;
    }).filter(Boolean) as Record<string, string | number>[];
  }, [oddsHistory, numberPerformances]);

  // Performance bar chart data
  const barChartData = useMemo(() => {
    return numberPerformances.slice(0, 10).map(p => ({
      name: `N°${p.numero}`,
      numero: p.numero,
      'Victoires': p.wins,
      'Placés (Top 3)': p.places - p.wins, // Only Top 2-3
      'Top 5': p.top5 - p.places, // Only Top 4-5
      'Autres': p.totalRaces - p.top5,
      winRate: p.winRate.toFixed(1),
      placeRate: p.placeRate.toFixed(1),
    }));
  }, [numberPerformances]);

  const topNumbers = useMemo(() => {
    return numberPerformances.slice(0, 8).map(p => p.numero);
  }, [numberPerformances]);

  if (numberPerformances.length === 0) {
    return null;
  }

  return (
    <Card className="border-indigo-500/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-indigo-500" />
          Évolution des Performances des Numéros Récurrents
          <Badge variant="secondary" className="ml-2">
            {numberPerformances.length} numéro(s)
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Bar Chart - Performance Summary */}
        <div>
          <h4 className="text-sm font-medium mb-3 text-muted-foreground flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Résumé des Performances (Top 10)
          </h4>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData} layout="vertical" margin={{ top: 5, right: 30, left: 50, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  type="number" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  width={50}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                  formatter={(value: number, name: string, props) => {
                    const payload = props?.payload;
                    if (name === 'Victoires' && payload) {
                      return [`${value} (${payload.winRate}%)`, name];
                    }
                    if (name === 'Placés (Top 3)' && payload) {
                      return [`${value}`, name];
                    }
                    return [value, name];
                  }}
                />
                <Legend />
                <Bar dataKey="Victoires" stackId="a" fill="hsl(142, 76%, 36%)" name="Victoires" />
                <Bar dataKey="Placés (Top 3)" stackId="a" fill="hsl(221, 83%, 53%)" name="Placés (Top 3)" />
                <Bar dataKey="Top 5" stackId="a" fill="hsl(45, 93%, 47%)" name="Top 5" />
                <Bar dataKey="Autres" stackId="a" fill="hsl(var(--muted))" name="Autres" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Line Chart - Cumulative Wins Evolution */}
        {evolutionChartData.length > 1 && (
          <div>
            <h4 className="text-sm font-medium mb-3 text-muted-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Évolution Cumulative des Victoires (Top 8)
            </h4>
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={evolutionChartData} margin={{ top: 5, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="race" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={10}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    label={{ 
                      value: 'Victoires cumulées', 
                      angle: -90, 
                      position: 'insideLeft',
                      style: { fill: 'hsl(var(--muted-foreground))' }
                    }}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                    labelFormatter={(label: string, payload) => {
                      if (payload && payload.length > 0) {
                        return payload[0].payload?.raceLabel || label;
                      }
                      return label;
                    }}
                    formatter={(value: number, name: string) => {
                      const match = name.match(/N(\d+)_wins/);
                      const horseNum = match ? match[1] : name;
                      return [value, `N°${horseNum} victoires`];
                    }}
                  />
                  <Legend 
                    formatter={(value: string) => {
                      const match = value.match(/N(\d+)_wins/);
                      return match ? `N°${match[1]}` : value;
                    }}
                  />
                  {topNumbers.map((num, idx) => (
                    <Line
                      key={num}
                      type="monotone"
                      dataKey={`N${num}_wins`}
                      stroke={CHART_COLORS[idx % CHART_COLORS.length]}
                      strokeWidth={2}
                      dot={{ fill: CHART_COLORS[idx % CHART_COLORS.length], strokeWidth: 2, r: 3 }}
                      activeDot={{ r: 5, strokeWidth: 2 }}
                      name={`N${num}_wins`}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Stats Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {numberPerformances.slice(0, 4).map((perf, idx) => (
            <div 
              key={perf.numero}
              className={`p-3 rounded-lg border ${
                idx === 0 ? 'bg-yellow-500/10 border-yellow-500/30' :
                idx === 1 ? 'bg-gray-200/50 border-gray-400/30 dark:bg-gray-700/30' :
                idx === 2 ? 'bg-amber-600/10 border-amber-600/30' :
                'bg-muted/50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <Badge 
                  className={`${
                    idx === 0 ? 'bg-yellow-500 text-yellow-950' :
                    idx === 1 ? 'bg-gray-400 text-gray-950' :
                    idx === 2 ? 'bg-amber-600 text-amber-50' :
                    'bg-secondary'
                  }`}
                >
                  {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '🏅'} N°{perf.numero}
                </Badge>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Victoires:</span>
                  <span className="font-bold text-green-600">{perf.wins}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Placés:</span>
                  <span className="font-bold text-blue-600">{perf.places}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Courses:</span>
                  <span className="font-medium">{perf.totalRaces}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tx victoire:</span>
                  <span className="font-bold text-purple-600">{perf.winRate.toFixed(0)}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default RecurringNumbersChart;

