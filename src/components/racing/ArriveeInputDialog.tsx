
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Trophy, Save, X } from 'lucide-react';

interface ArriveeInputDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  raceInfo: {
    reunionNumber: number;
    raceNumber: number;
    hippodrome?: string;
  };
  top4: Array<{ numero: number; name?: string }>;
  onSave: (arrivee: number[]) => void;
}

export const ArriveeInputDialog = ({
  open,
  onOpenChange,
  raceInfo,
  top4,
  onSave
}: ArriveeInputDialogProps) => {
  const [arriveeInput, setArriveeInput] = useState('');
  const [error, setError] = useState('');

  const parseArrivee = (input: string): number[] => {
    // Parse comma or space separated numbers
    const numbers = input
      .replace(/[,\s]+/g, ' ')
      .split(' ')
      .map(s => parseInt(s.trim(), 10))
      .filter(n => !isNaN(n) && n > 0);
    return numbers;
  };

  const handleSave = () => {
    const arrivee = parseArrivee(arriveeInput);
    if (arrivee.length === 0) {
      // Save without arrivee (empty)
      onSave([]);
      onOpenChange(false);
      setArriveeInput('');
      setError('');
      return;
    }

    if (arrivee.length < 4) {
      setError('Entrez au moins 4 numéros (ou laissez vide)');
      return;
    }

    onSave(arrivee);
    onOpenChange(false);
    setArriveeInput('');
    setError('');
  };

  const handleCancel = () => {
    onOpenChange(false);
    setArriveeInput('');
    setError('');
  };

  const parsedArrivee = parseArrivee(arriveeInput);
  const top4Numbers = top4.map(h => h.numero);
  const matchedCount = parsedArrivee.slice(0, 4).filter(n => top4Numbers.includes(n)).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            Saisir l'arrivée - R{raceInfo.reunionNumber} C{raceInfo.raceNumber}
          </DialogTitle>
          {raceInfo.hippodrome && (
            <p className="text-sm text-muted-foreground">{raceInfo.hippodrome}</p>
          )}
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* TOP 4 reminder */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Votre TOP 4 :</Label>
            <div className="flex flex-wrap gap-2">
              {top4.map((horse, idx) => (
                <Badge 
                  key={horse.numero}
                  variant="outline" 
                  className={`
                    ${idx === 0 ? 'bg-amber-500/20 border-amber-500 text-amber-400' : 
                      idx === 1 ? 'bg-slate-400/20 border-slate-400 text-slate-300' : 
                      idx === 2 ? 'bg-orange-600/20 border-orange-600 text-orange-400' : 
                      'bg-blue-500/20 border-blue-500 text-blue-400'}
                  `}
                >
                  N°{horse.numero} {horse.name && `- ${horse.name.substring(0, 10)}`}
                </Badge>
              ))}
            </div>
          </div>

          {/* Arrivee input */}
          <div className="space-y-2">
            <Label htmlFor="arrivee">Arrivée officielle (4 premiers)</Label>
            <Input
              id="arrivee"
              placeholder="Ex: 5 3 8 12 ou 5,3,8,12"
              value={arriveeInput}
              onChange={(e) => {
                setArriveeInput(e.target.value);
                setError('');
              }}
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              Entrez les numéros séparés par des espaces ou virgules (laissez vide si inconnu)
            </p>
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>

          {/* Preview */}
          {parsedArrivee.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Aperçu :</Label>
              <div className="flex flex-wrap gap-2">
                {parsedArrivee.slice(0, 4).map((num, idx) => {
                  const isInTop4 = top4Numbers.includes(num);
                  return (
                    <Badge 
                      key={`${num}-${idx}`}
                      variant="outline"
                      className={isInTop4 
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' 
                        : 'bg-red-500/20 border-red-500 text-red-400'
                      }
                    >
                      {idx + 1}er: N°{num} {isInTop4 ? '✓' : '✗'}
                    </Badge>
                  );
                })}
              </div>
              <p className="text-sm">
                <span className={matchedCount >= 2 ? 'text-emerald-400' : 'text-muted-foreground'}>
                  {matchedCount}/4 chevaux dans le TOP 4
                </span>
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleCancel}>
            <X className="w-4 h-4 mr-2" />
            Annuler
          </Button>
          <Button onClick={handleSave} className="bg-primary hover:bg-primary/90">
            <Save className="w-4 h-4 mr-2" />
            Sauvegarder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
