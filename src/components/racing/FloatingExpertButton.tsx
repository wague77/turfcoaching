
import { useState } from 'react';
import { Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RacingExpertChat } from './RacingExpertChat';
import { RawHorseData, AnalysisResult } from '@/types/racing';

interface FloatingExpertButtonProps {
  raceContext?: string;
  horses?: RawHorseData[];
  analysisResult?: AnalysisResult | null;
  discipline?: string;
}

export function FloatingExpertButton({ raceContext, horses, analysisResult, discipline }: FloatingExpertButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Chat Panel */}
      {isOpen && (
        <RacingExpertChat 
          raceContext={raceContext}
          horses={horses}
          analysisResult={analysisResult}
          discipline={discipline}
          onClose={() => setIsOpen(false)}
          isFloating
        />
      )}

      {/* Floating Button */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-20 right-4 z-50 h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90 transition-all hover:scale-110"
        >
          <Bot className="w-6 h-6" />
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-background animate-pulse" />
        </Button>
      )}
    </>
  );
}

