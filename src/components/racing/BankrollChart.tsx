
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { BankrollSnapshot } from '@/types/betting';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface BankrollChartProps {
  bankrollHistory: BankrollSnapshot[];
  initialBankroll: number;
}

const BankrollChart = ({ bankrollHistory, initialBankroll }: BankrollChartProps) => {
  const chartData = useMemo(() => {
    return bankrollHistory.map((snapshot, index) => ({
      name: format(new Date(snapshot.timestamp), 'dd/MM HH:mm', { locale: fr }),
      bankroll: snapshot.bankroll,
      label: snapshot.label,
      index: index + 1,
    }));
  }, [bankrollHistory]);

  if (bankrollHistory.length < 2) {
    return (
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="w-5 h-5 text-primary" />
            Évolution Bankroll
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
            Minimum 2 résultats nécessaires pour afficher le graphique
          </div>
        </CardContent>
      </Card>
    );
  }

  const minValue = Math.min(...bankrollHistory.map(s => s.bankroll));
  const maxValue = Math.max(...bankrollHistory.map(s => s.bankroll));
  const padding = (maxValue - minValue) * 0.1 || 50;

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="w-5 h-5 text-primary" />
          Évolution Bankroll
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis 
                dataKey="index" 
                tick={{ fontSize: 12 }} 
                className="text-muted-foreground"
                tickLine={false}
              />
              <YAxis 
                domain={[Math.floor(minValue - padding), Math.ceil(maxValue + padding)]}
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
                tickFormatter={(value) => `${value}€`}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
                formatter={(value: number) => [`${value.toFixed(2)}€`, 'Bankroll']}
                labelFormatter={(label, payload) => {
                  if (payload && payload[0]) {
                    return `Course ${label} - ${payload[0].payload.name}`;
                  }
                  return `Course ${label}`;
                }}
              />
              {initialBankroll > 0 && (
                <ReferenceLine 
                  y={initialBankroll} 
                  stroke="hsl(var(--muted-foreground))" 
                  strokeDasharray="5 5"
                  label={{ 
                    value: 'Initial', 
                    position: 'right',
                    fill: 'hsl(var(--muted-foreground))',
                    fontSize: 10,
                  }}
                />
              )}
              <Line 
                type="monotone" 
                dataKey="bankroll" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, fill: 'hsl(var(--primary))' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default BankrollChart;

