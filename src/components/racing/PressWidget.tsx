
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Newspaper } from 'lucide-react';

const PressWidget = () => {
  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Newspaper className="h-5 w-5 text-primary" />
          Presse Hippique - Analyses & Pronostics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <iframe
          src="https://www.boturfers.fr/public/widgets/widget-presse.php?style=default"
          className="w-full min-h-[400px] rounded-lg border-0"
          title="Presse Hippique"
          sandbox="allow-scripts allow-same-origin"
        />
      </CardContent>
    </Card>
  );
};

export default PressWidget;

