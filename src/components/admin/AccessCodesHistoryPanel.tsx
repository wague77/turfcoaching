
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { 
  History, 
  Trash2, 
  Loader2,
  Smartphone,
  RefreshCw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface DeviceInfo {
  browser: string;
  os: string;
  platform: string;
  userAgent: string;
  connectedAt: string;
}

interface AccessCodeHistory {
  id: string;
  original_code_id: string;
  code: string;
  created_at: string;
  expires_at: string;
  was_used: boolean;
  was_blocked: boolean;
  device_id: string | null;
  device_info: DeviceInfo | null;
  deleted_at: string;
  deleted_by: string | null;
  deletion_reason: string | null;
}

export const AccessCodesHistoryPanel = () => {
  const [history, setHistory] = useState<AccessCodeHistory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("access_codes_history")
        .select("*")
        .order("deleted_at", { ascending: false });

      if (error) throw error;

      setHistory((data || []).map(item => ({
        ...item,
        device_info: item.device_info as unknown as DeviceInfo | null
      })));
    } catch (err) {
      console.error("Error loading history:", err);
      toast({
        title: "Erreur",
        description: "Impossible de charger l'historique",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = async () => {
    if (!confirm("Êtes-vous sûr de vouloir effacer tout l'historique des suppressions ?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("access_codes_history")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all

      if (error) throw error;

      setHistory([]);
      toast({
        title: "Historique effacé",
        description: "L'historique des suppressions a été effacé.",
      });
    } catch (err) {
      console.error("Error clearing history:", err);
      toast({
        title: "Erreur",
        description: "Impossible d'effacer l'historique",
        variant: "destructive",
      });
    }
  };

  const handleDeleteEntry = async (id: string) => {
    try {
      const { error } = await supabase
        .from("access_codes_history")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setHistory(prev => prev.filter(h => h.id !== id));
      toast({
        title: "Entrée supprimée",
        description: "L'entrée a été supprimée de l'historique.",
      });
    } catch (err) {
      console.error("Error deleting entry:", err);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'entrée",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="bg-gray-800/50 border-gray-700 mt-6">
      <CardHeader>
        <CardTitle className="text-white flex items-center justify-between flex-wrap gap-2">
          <span className="flex items-center gap-2">
            <History className="w-5 h-5 text-orange-500" />
            Historique des suppressions ({history.length})
          </span>
          <div className="flex gap-2">
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
            {history.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearHistory}
                className="border-red-600 text-red-400 hover:bg-red-600/20"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Effacer
              </Button>
            )}
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
            <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Aucun code supprimé</p>
            <p className="text-sm">L'historique des suppressions apparaîtra ici</p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-4 rounded-lg bg-gray-700/30 border border-gray-600/50"
              >
                <div className="flex items-center gap-4">
                  <code className="text-lg font-mono text-gray-400">
                    {item.code}
                  </code>
                  <div className="flex gap-2 flex-wrap">
                    {item.was_blocked && (
                      <Badge className="bg-red-600 text-white">Était bloqué</Badge>
                    )}
                    {item.was_used && (
                      <Badge className="bg-orange-600 text-white">Était utilisé</Badge>
                    )}
                    {item.device_id ? (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Badge className="bg-blue-600/50 text-blue-300 flex items-center gap-1 cursor-pointer hover:bg-blue-500/50">
                            <Smartphone className="w-3 h-3" />
                            Était connecté
                          </Badge>
                        </PopoverTrigger>
                        <PopoverContent className="w-72 bg-gray-800 border-gray-700 text-white p-4">
                          <div className="space-y-2">
                            <h4 className="font-semibold text-blue-400 flex items-center gap-2">
                              <Smartphone className="w-4 h-4" />
                              Dernier appareil connecté
                            </h4>
                            {item.device_info ? (
                              <div className="space-y-1 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Navigateur:</span>
                                  <span className="text-white">{item.device_info.browser}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Système:</span>
                                  <span className="text-white">{item.device_info.os}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Type:</span>
                                  <span className="text-white">{item.device_info.platform}</span>
                                </div>
                              </div>
                            ) : (
                              <p className="text-sm text-gray-400">Infos non disponibles</p>
                            )}
                          </div>
                        </PopoverContent>
                      </Popover>
                    ) : null}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right text-sm text-gray-400">
                    <div>Créé: {format(new Date(item.created_at), "d MMM yyyy", { locale: fr })}</div>
                    <div className="text-red-400">
                      Supprimé: {format(new Date(item.deleted_at), "d MMM yyyy HH:mm", { locale: fr })}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteEntry(item.id)}
                    className="text-gray-400 hover:text-red-500"
                    title="Supprimer de l'historique"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

