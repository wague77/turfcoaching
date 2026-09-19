
import { useState, useRef, useCallback, useEffect } from 'react';
import { toast } from 'sonner';

interface TextToSpeechReturn {
  isSpeaking: boolean;
  isLoading: boolean;
  isSupported: boolean;
  speak: (text: string) => void;
  stop: () => void;
}

export function useTextToSpeech(): TextToSpeechReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  
  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  // Load available voices
  useEffect(() => {
    if (!isSupported) return;

    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, [isSupported]);

  // Get the best French voice available
  const getFrenchVoice = useCallback((): SpeechSynthesisVoice | null => {
    if (voices.length === 0) return null;

    // Priority order for French voices
    const frenchVoices = voices.filter(v => v.lang.startsWith('fr'));
    
    // Prefer female voices for better quality
    const femaleVoice = frenchVoices.find(v => 
      v.name.toLowerCase().includes('female') || 
      v.name.toLowerCase().includes('amélie') ||
      v.name.toLowerCase().includes('thomas') ||
      v.name.toLowerCase().includes('aurelie') ||
      v.name.toLowerCase().includes('marie')
    );
    
    if (femaleVoice) return femaleVoice;
    if (frenchVoices.length > 0) return frenchVoices[0];
    
    // Fallback to any available voice
    return voices[0];
  }, [voices]);

  const stop = useCallback(() => {
    if (isSupported) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setIsLoading(false);
    utteranceRef.current = null;
  }, [isSupported]);

  const speak = useCallback((text: string) => {
    if (!isSupported) {
      toast.error("Synthèse vocale non supportée par votre navigateur");
      return;
    }

    if (!text || text.trim().length === 0) return;

    // Stop any current speech
    stop();
    
    setIsLoading(true);

    // Clean text for speech (remove markdown, emojis, etc.)
    const cleanedText = text
      .replace(/#{1,6}\s/g, '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/`(.*?)`/g, '$1')
      .replace(/```[\s\S]*?```/g, '')
      .replace(/\[(.*?)\]\(.*?\)/g, '$1')
      .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')
      .replace(/•/g, '')
      .replace(/\n+/g, '. ')
      .replace(/\s+/g, ' ')
      .trim();

    if (cleanedText.length === 0) {
      setIsLoading(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(cleanedText);
    utteranceRef.current = utterance;

    // Set French voice
    const frenchVoice = getFrenchVoice();
    if (frenchVoice) {
      utterance.voice = frenchVoice;
    }
    
    // Configure speech settings for natural French
    utterance.lang = 'fr-FR';
    utterance.rate = 0.95; // Slightly slower for clarity
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    utterance.onstart = () => {
      setIsSpeaking(true);
      setIsLoading(false);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      utteranceRef.current = null;
    };

    utterance.onerror = (event) => {
      console.error("Speech synthesis error:", event);
      setIsSpeaking(false);
      setIsLoading(false);
      if (event.error !== 'canceled') {
        toast.error("Erreur de synthèse vocale");
      }
    };

    // Small delay to ensure voices are loaded
    setTimeout(() => {
      window.speechSynthesis.speak(utterance);
    }, 50);
  }, [isSupported, stop, getFrenchVoice]);

  return {
    isSpeaking,
    isLoading,
    isSupported,
    speak,
    stop,
  };
}

