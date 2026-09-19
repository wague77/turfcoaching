
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Brain, 
  Shield, 
  ShieldOff, 
  RefreshCw, 
  Loader2, 
  Clock, 
  Smartphone,
  Ban,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import { format, formatDistanceToNow, isPast } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface AISession {
  id: string;
  device_id: string;
  device_info: any;
  session_start: string;
  session_expiry: string;
  last_used_at: string;
  is_blocked: boolean;
  blocked_at: string | null;
  blocked_reason: string | null;
  created_at: string;
}

export function AISessionsManager() {
  const [sessions, setSessions] = useState<AISession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<AISession | null>(null);
  const [blockReason, setBlockReason] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('ai_sessions')
        .select('*')
        .order('last_used_at', { ascending: false });

      if (error) throw error;
      setSessions(data || []);
    } catch (error) {
      console.error('Error fetching AI sessions:', error);
      toast.error('Erreur lors du chargement des sessions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBlockToggle = async (session: AISession) => {
    if (!session.is_blocked) {
      setSelectedSession(session);
      setBlockDialogOpen(true);
      return;
    }

    // Unblock
    setActionLoading(session.id);
    try {
      const { error } = await supabase
        .from('ai_sessions')
        .update({
          is_blocked: false,
          blocked_at: null,
          blocked_reason: null
        })
        .eq('id', session.id);

      if (error) throw error;
      toast.success('Utilisateur débloqué');
      fetchSessions();
    } catch (error) {
      console.error('Error unblocking session:', error);
      toast.error('Erreur lors du déblocage');
    } finally {
      setActionLoading(null);
    }
  };

  const confirmBlock = async () => {
    if (!selectedSession) return;

    setActionLoading(selectedSession.id);
    try {
      const { error } = await supabase
        .from('ai_sessions')
        .update({
          is_blocked: true,
          blocked_at: new Date().toISOString(),
          blocked_reason: blockReason || 'Bloqué par l\'administrateur'
        })
        .eq('id', selectedSession.id);

      if (error) throw error;
      toast.success('Utilisateur bloqué');
      setBlockDialogOpen(false);
      setBlockReason('');
      setSelectedSession(null);
      fetchSessions();
    } catch (error) {
      console.error('Error blocking session:', error);
      toast.error('Erreur lors du blocage');
    } finally {
      setActionLoading(null);
    }
  };

  const deleteSession = async (sessionId: string) => {
    setActionLoading(sessionId);
    try {
      const { error } = await supabase
        .from('ai_sessions')
        .delete()
        .eq('id', sessionId);

      if (error) throw error;
      toast.success('Session supprimée');
      fetchSessions();
    } catch (error) {
      console.error('Error deleting session:', error);
      toast.error('Erreur lors de la suppression');
    } finally {
      setActionLoading(null);
    }
  };

  const getSessionStatus = (session: AISession) => {
    if (session.is_blocked) {
      return { label: 'Bloqué', color: 'destructive', icon: Ban };
    }
    if (isPast(new Date(session.session_expiry))) {
      return { label: 'Expiré', color: 'secondary', icon: Clock };
    }
    return { label: 'Actif', color: 'default', icon: CheckCircle };
  };

  const activeSessions = sessions.filter(s => !s.is_blocked && !isPast(new Date(s.session_expiry)));
  const blockedSessions = sessions.filter(s => s.is_blocked);

  return (
    <Card className="bg-card border-border">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Brain className="w-5 h-5 text-primary" />
          Sessions IA ({sessions.length})
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchSessions}
          disabled={isLoading}
          className="border-border"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Actualiser
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-muted/30 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-green-500">{activeSessions.length}</div>
            <div className="text-xs text-muted-foreground">Actives</div>
          </div>
          <div className="bg-muted/30 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-red-500">{blockedSessions.length}</div>
            <div className="text-xs text-muted-foreground">Bloquées</div>
          </div>
          <div className="bg-muted/30 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-muted-foreground">{sessions.length}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </div>
        </div>

        {/* Sessions List */}
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Brain className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p>Aucune session IA enregistrée</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {sessions.map((session) => {
              const status = getSessionStatus(session);
              const StatusIcon = status.icon;
              
              return (
                <div
                  key={session.id}
                  className={`p-4 rounded-lg border ${
                    session.is_blocked 
                      ? 'bg-red-500/10 border-red-500/30' 
                      : 'bg-muted/20 border-border'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Smartphone className="w-4 h-4 text-muted-foreground" />
                        <code className="text-xs bg-muted px-2 py-0.5 rounded truncate max-w-[200px]">
                          {session.device_id}
                        </code>
                        <Badge variant={status.color as any} className="text-xs">
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {status.label}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                        <div>
                          <span className="text-foreground/70">Début: </span>
                          {format(new Date(session.session_start), 'dd/MM HH:mm', { locale: fr })}
                        </div>
                        <div>
                          <span className="text-foreground/70">Expiration: </span>
                          {format(new Date(session.session_expiry), 'dd/MM HH:mm', { locale: fr })}
                        </div>
                        <div className="col-span-2">
                          <span className="text-foreground/70">Dernière utilisation: </span>
                          {formatDistanceToNow(new Date(session.last_used_at), { 
                            addSuffix: true, 
                            locale: fr 
                          })}
                        </div>
                      </div>

                      {session.is_blocked && session.blocked_reason && (
                        <div className="mt-2 flex items-start gap-1 text-xs text-red-400">
                          <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                          <span>{session.blocked_reason}</span>
                        </div>
                      )}

                      {session.device_info && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          <span className="text-foreground/70">Info: </span>
                          {session.device_info.browser || session.device_info.userAgent?.substring(0, 50) || 'N/A'}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2">
                      <Button
                        size="sm"
                        variant={session.is_blocked ? "outline" : "destructive"}
                        onClick={() => handleBlockToggle(session)}
                        disabled={actionLoading === session.id}
                        className="w-24"
                      >
                        {actionLoading === session.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : session.is_blocked ? (
                          <>
                            <Shield className="w-4 h-4 mr-1" />
                            Débloquer
                          </>
                        ) : (
                          <>
                            <ShieldOff className="w-4 h-4 mr-1" />
                            Bloquer
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Block Dialog */}
        <AlertDialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
          <AlertDialogContent className="bg-card border-border">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-foreground">
                Bloquer cet utilisateur ?
              </AlertDialogTitle>
              <AlertDialogDescription>
                L'utilisateur ne pourra plus utiliser les fonctionnalités IA jusqu'à ce qu'il soit débloqué.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
              <Input
                placeholder="Raison du blocage (optionnel)"
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                className="bg-muted/50 border-border"
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-border">Annuler</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmBlock}
                className="bg-destructive hover:bg-destructive/90"
              >
                <Ban className="w-4 h-4 mr-2" />
                Confirmer le blocage
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}

