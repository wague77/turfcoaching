
import { useState, useRef, useEffect } from 'react';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/env';
import { generateGeminiContent } from '@/lib/gemini';
import { Bot, Send, Loader2, Sparkles, X, Maximize2, Minimize2, Trash2, Lock, Zap, History, Plus, ChevronLeft, Mic, Square, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import { useAIPassword } from '@/hooks/useAIPassword';
import { AIPasswordDialog } from './AIPasswordDialog';
import { useExpertChatHistory } from '@/hooks/useExpertChatHistory';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';
import { RawHorseData, AnalysisResult } from '@/types/racing';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface RacingExpertChatProps {
  raceContext?: string;
  horses?: RawHorseData[];
  analysisResult?: AnalysisResult | null;
  discipline?: string;
  onClose?: () => void;
  isFloating?: boolean;
}

const getChatUrl = () => `${SUPABASE_URL}/functions/v1/racing-expert-chat`;

const SUGGESTED_QUESTIONS = [
  "🏇 Comment analyser la musique d'un cheval ?",
  "📊 Comment repérer un faux favori ?",
  "💎 Comment trouver un bon outsider ?",
  "🎯 Quelle stratégie pour le Quinté+ ?",
  "🌧️ Impact du terrain sur les performances ?",
];

export function RacingExpertChat({ raceContext, horses, analysisResult, discipline, onClose, isFloating = false }: RacingExpertChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);
  const lastMessageCountRef = useRef(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { isAuthenticated, getSessionToken, getDeviceId } = useAIPassword();
  
  const {
    isListening,
    transcript,
    interimTranscript,
    error: speechError,
    isSupported: isSpeechSupported,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition();

  const {
    isSpeaking,
    isLoading: isTTSLoading,
    isSupported: isTTSSupported,
    speak,
    stop: stopSpeaking,
  } = useTextToSpeech();
  
  const {
    conversations,
    activeConversationId,
    isLoaded: historyLoaded,
    createConversation,
    updateConversation,
    deleteConversation,
    clearAllConversations,
    getActiveConversation,
    selectConversation,
  } = useExpertChatHistory();

  // Load messages from active conversation
  useEffect(() => {
    const activeConv = getActiveConversation();
    if (activeConv) {
      setMessages(activeConv.messages);
    }
  }, [activeConversationId, getActiveConversation]);

  // Save messages to conversation when they change
  useEffect(() => {
    if (activeConversationId && messages.length > 0) {
      updateConversation(activeConversationId, messages);
    }
  }, [messages, activeConversationId, updateConversation]);

  // Auto-scroll only when new messages are added and user hasn't scrolled up
  useEffect(() => {
    if (scrollRef.current && messages.length > lastMessageCountRef.current) {
      // Only auto-scroll if we're near the bottom or it's a new message
      if (shouldAutoScrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }
    lastMessageCountRef.current = messages.length;
  }, [messages]);

  // Track user scroll position to disable auto-scroll when scrolled up
  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      shouldAutoScrollRef.current = isNearBottom;
    }
  };

  // Handle voice transcript - update input when listening ends
  useEffect(() => {
    if (transcript && !isListening) {
      setInput(prev => prev + (prev ? ' ' : '') + transcript);
      resetTranscript();
    }
  }, [transcript, isListening, resetTranscript]);

  // Show speech errors
  useEffect(() => {
    if (speechError) {
      toast.error(speechError);
    }
  }, [speechError]);

  // Generate detailed race context from horse data
  const generateRaceDataContext = () => {
    if (!horses || horses.length === 0) return null;

    let context = `📊 **DONNÉES DE LA COURSE ACTUELLE** (${horses.length} partants)\n`;
    context += `🏇 Discipline: ${discipline || 'Non spécifiée'}\n\n`;
    
    context += `**Liste des chevaux:**\n`;
    horses.forEach((horse) => {
      context += `• N°${horse.numero} ${horse.name || ''} - Cote: ${horse.cote} - Musique: ${horse.musique}\n`;
    });

    if (analysisResult) {
      context += `\n**🎯 Analyse algorithmique:**\n`;
      context += `- Difficulté: ${analysisResult.difficulty === 'easy' ? '🟢 Facile' : analysisResult.difficulty === 'medium' ? '🟡 Moyenne' : '🔴 Difficile'}\n`;
      
      if (analysisResult.horses.length > 0) {
        const bases = analysisResult.horses.filter(h => h.label === 'BASE');
        const outsiders = analysisResult.horses.filter(h => h.label === 'OUTSIDER');
        
        if (bases.length > 0) {
          context += `- BASES: ${bases.map(h => `N°${h.numero}`).join(', ')}\n`;
        }
        if (outsiders.length > 0) {
          context += `- OUTSIDERS: ${outsiders.map(h => `N°${h.numero}`).join(', ')}\n`;
        }
        
        context += `\n**Top 5 par score total:**\n`;
        const top5 = [...analysisResult.horses].sort((a, b) => b.scoreTotal - a.scoreTotal).slice(0, 5);
        top5.forEach((h, i) => {
          context += `${i + 1}. N°${h.numero} ${h.name || ''} (Score: ${h.scoreTotal.toFixed(1)}, Label: ${h.label})\n`;
        });
      }
    }

    return context;
  };

  const sendRaceDataToExpert = () => {
    const context = generateRaceDataContext();
    if (!context) {
      toast.error('Aucune donnée de course disponible. Importez d\'abord les chevaux.');
      return;
    }
    
    const message = `Voici les données de ma course, donne-moi ton analyse experte et tes pronostics:\n\n${context}`;
    streamChat(message);
  };

  const hasRaceData = horses && horses.length > 0;

  const streamChat = async (userMessage: string) => {
    // Check password authentication first
    if (!isAuthenticated) {
      setPendingMessage(userMessage);
      setShowPasswordDialog(true);
      return;
    }
    
    // Create a new conversation if none is active
    if (!activeConversationId) {
      createConversation();
    }
    
    performStreamChat(userMessage);
  };

  const performStreamChat = async (userMessage: string) => {
    const userMsg: Message = { role: 'user', content: userMessage };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInput('');
    setIsLoading(true);

    let assistantContent = '';
    const sessionToken = getSessionToken();
    const deviceId = getDeviceId();

    try {
      let text = '';
      try {
        const resp = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: allMessages,
            raceContext,
            discipline,
          }),
        });
        if (resp.ok) {
          const data = await resp.json();
          text = data.reply || data.content || '';
        }
      } catch (err) {
        console.warn('API route failed, falling back to direct Gemini client generation', err);
      }

      if (!text) {
        try {
          const systemPrompt = `Tu es un Expert Hippique d'Elite et Assistant virtuel IA pour Turf Coaching System. Discipline: ${discipline || 'Toutes'}. Contexte: ${raceContext || 'Général'}`;
          const userPrompt = allMessages.map(m => `${m.role}: ${m.content}`).join('\n\n');
          text = await generateGeminiContent(userPrompt, systemPrompt);
        } catch (geminiErr) {
          console.warn('Direct Gemini client failed:', geminiErr);
        }
      }

      if (!text) {
        text = `💡 **Conseil Expert Turf Coaching** :\n\nPour optimiser vos jeux PMU :\n- **Bases Solides** : Analysez la musique récente (victoires et podiums).\n- **Outsiders** : Repérez les chevaux déferrés (D4) avec de bonnes cotes.\n- **Stratégie** : Privilégiez le jeu simple gagnant/placé et les champs réduits au Quinté+.\n\n*Rechargez les partants de la course pour une analyse cheval par cheval.*`;
      }

      setMessages(prev => [...prev, { role: 'assistant', content: text }]);
      if (autoSpeak && text) {
        speak(text);
      }
    } catch (err: any) {
      console.warn("Chat error, using fallback answer:", err);
      const fallbackText = `💡 **Conseil Expert Turf Coaching** :\n\n- Analysez les musiques récentes et les cotes directes.\n- Combinez 2 bases solides avec 3 associés outsiders.`;
      setMessages(prev => [...prev, { role: 'assistant', content: fallbackText }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    
    let message = input.trim();
    if (raceContext && messages.length === 0) {
      message = `${message}\n\n[Contexte de la course: ${raceContext}]`;
    }
    streamChat(message);
  };

  const handleSuggestedQuestion = (question: string) => {
    if (isLoading) return;
    streamChat(question);
  };

  const clearChat = () => {
    if (activeConversationId) {
      deleteConversation(activeConversationId);
    }
    setMessages([]);
    toast.success('Conversation effacée');
  };

  const startNewConversation = () => {
    selectConversation(null);
    setMessages([]);
    setShowHistory(false);
  };

  const loadConversation = (id: string) => {
    selectConversation(id);
    setShowHistory(false);
  };

  const handlePasswordSuccess = () => {
    if (pendingMessage) {
      performStreamChat(pendingMessage);
      setPendingMessage(null);
    }
  };

  const containerClass = isFloating 
    ? `fixed bottom-20 right-4 z-50 w-[380px] max-h-[600px] shadow-2xl ${isExpanded ? 'w-[600px] max-h-[800px]' : ''}`
    : 'w-full';

  // Show locked state if not authenticated
  if (!isAuthenticated) {
    return (
      <>
        <AIPasswordDialog 
          open={showPasswordDialog} 
          onOpenChange={setShowPasswordDialog}
          onSuccess={handlePasswordSuccess}
        />
        <Card className={`${containerClass} bg-gradient-to-br from-background via-background to-primary/5 border-primary/30 flex flex-col`}>
          <CardHeader className="pb-2 border-b border-border/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                    <Bot className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-amber-500 rounded-full border-2 border-background flex items-center justify-center">
                    <Lock className="w-2.5 h-2.5 text-amber-950" />
                  </span>
                </div>
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    Le Maître du Turf
                    <Sparkles className="w-4 h-4 text-amber-400" />
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">Expert Hippique IA</p>
                </div>
              </div>
              {isFloating && (
                <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <Lock className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Accès Protégé</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Entrez le mot de passe IA pour accéder au Maître du Turf
            </p>
            <Button onClick={() => setShowPasswordDialog(true)} className="bg-primary hover:bg-primary/90">
              <Lock className="w-4 h-4 mr-2" />
              Déverrouiller
            </Button>
          </CardContent>
        </Card>
      </>
    );
  }

  // History panel view
  if (showHistory) {
    return (
      <Card className={`${containerClass} bg-gradient-to-br from-background via-background to-primary/5 border-primary/30 flex flex-col`}>
        <CardHeader className="pb-2 border-b border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => setShowHistory(false)} className="h-8 w-8">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <History className="w-4 h-4" />
                  Historique
                </CardTitle>
                <p className="text-xs text-muted-foreground">{conversations.length} conversation(s)</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {conversations.length > 0 && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => {
                    clearAllConversations();
                    toast.success('Historique effacé');
                  }} 
                  className="h-8 w-8 text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
              {isFloating && (
                <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
          <ScrollArea className={`flex-1 ${isFloating ? (isExpanded ? 'h-[550px]' : 'h-[400px]') : 'h-[450px]'}`}>
            <div className="p-4 space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start gap-2 border-dashed"
                onClick={startNewConversation}
              >
                <Plus className="w-4 h-4" />
                Nouvelle conversation
              </Button>

              {conversations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Aucune conversation sauvegardée</p>
                </div>
              ) : (
                conversations.map((conv) => (
                  <div
                    key={conv.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50 ${
                      activeConversationId === conv.id ? 'border-primary bg-primary/10' : 'border-border'
                    }`}
                    onClick={() => loadConversation(conv.id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{conv.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(conv.updatedAt, "d MMM yyyy 'à' HH:mm", { locale: fr })}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {conv.messages.length} message(s)
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0 text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteConversation(conv.id);
                          toast.success('Conversation supprimée');
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`${containerClass} bg-gradient-to-br from-background via-background to-primary/5 border-primary/30 flex flex-col`}>
      <CardHeader className="pb-2 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                <Bot className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-background animate-pulse" />
            </div>
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                Le Maître du Turf
                <Sparkles className="w-4 h-4 text-amber-400" />
              </CardTitle>
              <p className="text-xs text-muted-foreground">Expert Hippique IA</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {/* TTS Toggle */}
            {isTTSSupported && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => {
                  if (isSpeaking) {
                    stopSpeaking();
                  }
                  setAutoSpeak(!autoSpeak);
                  toast.success(autoSpeak ? 'Réponses vocales désactivées' : 'Réponses vocales activées');
                }}
                className={`h-8 w-8 ${autoSpeak ? 'text-primary bg-primary/10' : ''}`}
                title={autoSpeak ? "Désactiver les réponses vocales" : "Activer les réponses vocales"}
              >
                {autoSpeak ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setShowHistory(true)} 
              className="h-8 w-8"
              title="Historique des conversations"
            >
              <History className="w-4 h-4" />
            </Button>
            {messages.length > 0 && (
              <Button variant="ghost" size="icon" onClick={clearChat} className="h-8 w-8">
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
            {isFloating && (
              <>
                <Button variant="ghost" size="icon" onClick={() => setIsExpanded(!isExpanded)} className="h-8 w-8">
                  {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </Button>
                <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
                  <X className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        {/* Messages area */}
        <div 
          ref={scrollRef}
          onScroll={handleScroll}
          className={`flex-1 p-4 overflow-y-auto scrollbar-cyber ${isFloating ? (isExpanded ? 'h-[500px]' : 'h-[350px]') : 'h-[400px]'}`}
        >
          {messages.length === 0 ? (
            <div className="space-y-4">
              <div className="text-center py-4">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full mb-3">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Bienvenue !</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Je suis votre expert hippique personnel. Posez-moi vos questions sur les courses !
                </p>
              </div>

              {/* Quick analyze button for current race */}
              {hasRaceData && (
                <div className="p-3 bg-primary/10 border border-primary/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                      <Zap className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">Course en cours d'analyse</p>
                      <p className="text-xs text-muted-foreground">{horses?.length} chevaux • {discipline || 'Discipline non spécifiée'}</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={sendRaceDataToExpert}
                      disabled={isLoading}
                      className="shrink-0 bg-primary hover:bg-primary/90"
                    >
                      <Zap className="w-4 h-4 mr-1" />
                      Analyser
                    </Button>
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                  Suggestions
                </p>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTED_QUESTIONS.map((q, i) => (
                    <Badge
                      key={i}
                      variant="outline"
                      className="cursor-pointer hover:bg-primary/10 transition-colors text-xs py-1.5"
                      onClick={() => handleSuggestedQuestion(q)}
                    >
                      {q}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} group`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-br-md'
                        : 'bg-muted/50 border border-border/50 rounded-bl-md'
                    }`}
                  >
                    {msg.role === 'assistant' ? (
                      <>
                        <div className="prose prose-sm prose-invert max-w-none">
                          <ReactMarkdown
                            components={{
                              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                              ul: ({ children }) => <ul className="list-disc pl-4 mb-2">{children}</ul>,
                              ol: ({ children }) => <ol className="list-decimal pl-4 mb-2">{children}</ol>,
                              li: ({ children }) => <li className="mb-1">{children}</li>,
                              strong: ({ children }) => <strong className="font-bold text-primary">{children}</strong>,
                              h1: ({ children }) => <h3 className="text-lg font-bold mb-2 text-primary">{children}</h3>,
                              h2: ({ children }) => <h4 className="text-base font-bold mb-2 text-primary">{children}</h4>,
                              h3: ({ children }) => <h5 className="text-sm font-bold mb-1">{children}</h5>,
                            }}
                          >
                            {msg.content || '▊'}
                          </ReactMarkdown>
                        </div>
                        {/* TTS button for assistant messages */}
                        {isTTSSupported && msg.content && (
                          <div className="flex justify-end mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs"
                              disabled={isTTSLoading}
                              onClick={() => {
                                if (isSpeaking) {
                                  stopSpeaking();
                                } else {
                                  speak(msg.content);
                                }
                              }}
                            >
                              {isTTSLoading ? (
                                <>
                                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                  Chargement...
                                </>
                              ) : isSpeaking ? (
                                <>
                                  <Square className="w-3 h-3 mr-1" />
                                  Arrêter
                                </>
                              ) : (
                                <>
                                  <Volume2 className="w-3 h-3 mr-1" />
                                  Écouter
                                </>
                              )}
                            </Button>
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && messages[messages.length - 1]?.role === 'user' && (
                <div className="flex justify-start">
                  <div className="bg-muted/50 border border-border/50 rounded-2xl rounded-bl-md px-4 py-3">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input area */}
        <form onSubmit={handleSubmit} className="p-4 border-t border-border/50 bg-background/50">
          {/* Voice recording indicator */}
          {isListening && (
            <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-destructive/10 border border-destructive/30 rounded-lg">
              <span className="w-2 h-2 bg-destructive rounded-full animate-pulse" />
              <span className="text-sm text-destructive font-medium">Écoute en cours...</span>
              {interimTranscript && (
                <span className="text-xs text-muted-foreground truncate flex-1">
                  "{interimTranscript}"
                </span>
              )}
            </div>
          )}
          
          <div className="flex gap-2">
            <Textarea
              ref={textareaRef}
              value={isListening ? (input + (input ? ' ' : '') + interimTranscript) : input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder={isListening ? "Parlez maintenant..." : "Posez votre question au Maître du Turf..."}
              className="min-h-[44px] max-h-[120px] resize-none bg-muted/30 border-border/50"
              disabled={isLoading || isListening}
            />
            
            {/* Voice button */}
            {isSpeechSupported && (
              <Button
                type="button"
                size="icon"
                variant={isListening ? "destructive" : "outline"}
                onClick={isListening ? stopListening : startListening}
                disabled={isLoading}
                className={`shrink-0 ${isListening ? 'animate-pulse' : ''}`}
                title={isListening ? "Arrêter l'écoute" : "Parler au Maître du Turf"}
              >
                {isListening ? (
                  <Square className="w-4 h-4" />
                ) : (
                  <Mic className="w-4 h-4" />
                )}
              </Button>
            )}
            
            <Button 
              type="submit" 
              size="icon" 
              disabled={(!input.trim() && !isListening) || isLoading}
              className="shrink-0 bg-primary hover:bg-primary/90"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

