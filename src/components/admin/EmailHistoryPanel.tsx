
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Mail,
  Loader2,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Send,
  Trash2
} from "lucide-react";

interface EmailHistoryItem {
  id: string;
  recipient_email: string;
  subject: string;
  email_type: string;
  status: string;
  resend_id: string | null;
  error_message: string | null;
  sent_at: string;
  delivered_at: string | null;
}

export const EmailHistoryPanel = () => {
  const [history, setHistory] = useState<EmailHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('email_history')
        .select('*')
        .order('sent_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setHistory(data || []);
    } catch (err) {
      console.error("Error loading email history:", err);
      toast({
        title: "Erreur",
        description: "Impossible de charger l'historique des emails",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = async () => {
    if (!confirm("Êtes-vous sûr de vouloir effacer tout l'historique des emails ?")) {
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('email_history')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (error) throw error;

      setHistory([]);
      toast({
        title: "Historique effacé",
        description: "L'historique des emails a été supprimé.",
      });
    } catch (err) {
      console.error("Error clearing history:", err);
      toast({
        title: "Erreur",
        description: "Impossible d'effacer l'historique",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "sent":
        return (
          <Badge className="bg-green-600 text-white">
            <CheckCircle className="w-3 h-3 mr-1" />
            Envoyé
          </Badge>
        );
      case "failed":
        return (
          <Badge className="bg-red-600 text-white">
            <XCircle className="w-3 h-3 mr-1" />
            Échec
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-yellow-600 text-white">
            <Clock className="w-3 h-3 mr-1" />
            En attente
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-gray-400">
            {status}
          </Badge>
        );
    }
  };

  const getTypeBadge = (emailType: string) => {
    switch (emailType) {
      case "approval":
        return (
          <Badge variant="outline" className="border-green-500 text-green-400">
            Approbation
          </Badge>
        );
      case "rejection":
        return (
          <Badge variant="outline" className="border-red-500 text-red-400">
            Rejet
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-gray-400">
            {emailType}
          </Badge>
        );
    }
  };

  const sentCount = history.filter(h => h.status === "sent").length;
  const failedCount = history.filter(h => h.status === "failed").length;

  return (
    <Card className="bg-gray-800/50 border-gray-700 mt-6">
      <CardHeader>
        <CardTitle className="text-white flex items-center justify-between flex-wrap gap-2">
          <span className="flex items-center gap-2">
            <Send className="w-5 h-5 text-blue-500" />
            Historique des emails ({history.length})
          </span>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="border-green-500 text-green-400">
              <CheckCircle className="w-3 h-3 mr-1" />
              Envoyés: {sentCount}
            </Badge>
            <Badge variant="outline" className="border-red-500 text-red-400">
              <XCircle className="w-3 h-3 mr-1" />
              Échecs: {failedCount}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={loadHistory}
              disabled={isLoading}
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearHistory}
              disabled={isLoading || history.length === 0}
              className="border-red-600 text-red-400 hover:bg-red-500/20"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Effacer
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">
            <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin" />
            <p>Chargement de l'historique...</p>
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Mail className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Aucun email envoyé</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {history.map((item) => (
              <div
                key={item.id}
                className={`flex items-center justify-between p-4 rounded-lg border ${
                  item.status === "sent"
                    ? "bg-green-900/10 border-green-500/20"
                    : item.status === "failed"
                      ? "bg-red-900/10 border-red-500/20"
                      : "bg-gray-900/20 border-gray-700"
                }`}
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                    item.status === "sent"
                      ? "bg-green-600/20"
                      : item.status === "failed"
                        ? "bg-red-600/20"
                        : "bg-gray-600/20"
                  }`}>
                    <Mail className={`w-5 h-5 ${
                      item.status === "sent"
                        ? "text-green-400"
                        : item.status === "failed"
                          ? "text-red-400"
                          : "text-gray-400"
                    }`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-white font-medium truncate">{item.recipient_email}</p>
                    <p className="text-gray-400 text-sm truncate">{item.subject}</p>
                    <p className="text-gray-500 text-xs">
                      {new Date(item.sent_at).toLocaleString("fr-FR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </p>
                    {item.error_message && (
                      <p className="text-red-400 text-xs mt-1 truncate">
                        Erreur: {item.error_message}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-4">
                  {getTypeBadge(item.email_type)}
                  {getStatusBadge(item.status)}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

