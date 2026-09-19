
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RaceResult, SavedPronostic, PronosticEvaluation } from '@/types/racing';
import { Trophy, Medal, Award } from 'lucide-react';

interface RaceResultDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pronostic: SavedPronostic;
  onSaveResult: (id: string, result: RaceResult, evaluation: PronosticEvaluation) => void;
}

const RaceResultDialog = ({
  open,
  onOpenChange,
  pronostic,
  onSaveResult,
}: RaceResultDialogProps) => {
  const [first, setFirst] = useState(pronostic.raceResult?.first?.toString() || '');
  const [second, setSecond] = useState(pronostic.raceResult?.second?.toString() || '');
  const [third, setThird] = useState(pronostic.raceResult?.third?.toString() || '');
  const [fourth, setFourth] = useState(pronostic.raceResult?.fourth?.toString() || '');
  const [fifth, setFifth] = useState(pronostic.raceResult?.fifth?.toString() || '');

  const extractNumbersFromTips = (tips: string): number[] => {
    // Extract horse numbers mentioned in the tips
    const numbers: number[] = [];
    
    // Look for patterns like "N°X", "numéro X", or standalone numbers after certain keywords
    const patterns = [
      /N°\s*(\d+)/gi,
      /numéro\s*(\d+)/gi,
      /cheval\s*(\d+)/gi,
      /n°(\d+)/gi,
      /(\d+)\s*[-–]\s*[A-Z]/g, // Pattern like "5 - HORSENAME"
    ];
    
    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(tips)) !== null) {
        const num = parseInt(match[1]);
        if (num > 0 && num <= 20 && !numbers.includes(num)) {
          numbers.push(num);
        }
      }
    });
    
    return numbers.slice(0, 8); // Return first 8 unique numbers
  };

  const calculateEvaluation = (result: RaceResult): PronosticEvaluation => {
    const predictedNumbers = extractNumbersFromTips(pronostic.tips);
    const resultArray = [result.first, result.second, result.third];
    if (result.fourth) resultArray.push(result.fourth);
    if (result.fifth) resultArray.push(result.fifth);
    
    // Check if BASE was successful (first mentioned horses in top 3)
    const baseNumbers = predictedNumbers.slice(0, 2);
    const baseSuccess = baseNumbers.some(n => resultArray.slice(0, 3).includes(n));
    
    // Check if OUTSIDER was successful
    const outsiderNumbers = predictedNumbers.slice(2, 5);
    const outsiderSuccess = outsiderNumbers.some(n => resultArray.slice(0, 5).includes(n));
    
    // Calculate trifecta score (how many of predicted in top 3)
    const trifectaScore = predictedNumbers.filter(n => 
      [result.first, result.second, result.third].includes(n)
    ).length;
    
    // Calculate superfecta score if 4th place available
    let superfectaScore: number | undefined;
    if (result.fourth) {
      superfectaScore = predictedNumbers.filter(n => 
        [result.first, result.second, result.third, result.fourth].includes(n)
      ).length;
    }
    
    // Calculate overall score (percentage)
    let overallScore = 0;
    if (baseSuccess) overallScore += 30;
    if (outsiderSuccess) overallScore += 20;
    overallScore += Math.min(trifectaScore * 15, 45);
    if (superfectaScore && superfectaScore >= 3) overallScore += 5;
    
    return {
      baseSuccess,
      outsiderSuccess,
      trifectaScore: Math.min(trifectaScore, 3),
      superfectaScore,
      overallScore: Math.min(overallScore, 100),
    };
  };

  const handleSubmit = () => {
    const result: RaceResult = {
      first: parseInt(first) || 0,
      second: parseInt(second) || 0,
      third: parseInt(third) || 0,
      fourth: fourth ? parseInt(fourth) : undefined,
      fifth: fifth ? parseInt(fifth) : undefined,
    };

    if (!result.first || !result.second || !result.third) {
      return;
    }

    const evaluation = calculateEvaluation(result);
    onSaveResult(pronostic.id, result, evaluation);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-400" />
            Résultat de la course
            {pronostic.raceName && (
              <span className="text-sm font-normal text-muted-foreground">
                - {pronostic.raceName}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="first" className="flex items-center gap-1">
                <Trophy className="h-4 w-4 text-amber-400" />
                1er
              </Label>
              <Input
                id="first"
                type="number"
                min="1"
                max="20"
                placeholder="N°"
                value={first}
                onChange={(e) => setFirst(e.target.value)}
                className="text-center"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="second" className="flex items-center gap-1">
                <Medal className="h-4 w-4 text-slate-400" />
                2ème
              </Label>
              <Input
                id="second"
                type="number"
                min="1"
                max="20"
                placeholder="N°"
                value={second}
                onChange={(e) => setSecond(e.target.value)}
                className="text-center"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="third" className="flex items-center gap-1">
                <Award className="h-4 w-4 text-amber-600" />
                3ème
              </Label>
              <Input
                id="third"
                type="number"
                min="1"
                max="20"
                placeholder="N°"
                value={third}
                onChange={(e) => setThird(e.target.value)}
                className="text-center"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="fourth">4ème (optionnel)</Label>
              <Input
                id="fourth"
                type="number"
                min="1"
                max="20"
                placeholder="N°"
                value={fourth}
                onChange={(e) => setFourth(e.target.value)}
                className="text-center"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fifth">5ème (optionnel)</Label>
              <Input
                id="fifth"
                type="number"
                min="1"
                max="20"
                placeholder="N°"
                value={fifth}
                onChange={(e) => setFifth(e.target.value)}
                className="text-center"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="flex-shrink-0 border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!first || !second || !third}
          >
            Évaluer le pronostic
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RaceResultDialog;

