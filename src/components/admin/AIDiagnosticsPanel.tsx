
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Activity, CheckCircle2, XCircle, Loader2, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface FunctionResult {
  name: string;
  label: string;
  status: "ok" | "error";
  httpStatus?: number;
  latency: number;
  model?: string;
  reply?: string;
  error?: string;
}

interface DiagnosticsResponse {
  success: boolean;
  model: string;
  checkedAt: string;
  results: FunctionResult[];
}

export function AIDiagnosticsPanel() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DiagnosticsResponse | null>(null);
  const [runningName, setRunningName] = useState<string | null>(null);
  const { toast } = useToast();

  const runDiagnostics = async () => {
    setLoading(true);
    setData(null);
    setRunningName("all");
    try {
      const { data: res, error } = await supabase.functions.invoke<DiagnosticsResponse>(
        "ai-health-check",
        { body: {} }
      );
      if (error) throw error;
      setData(res ?? null);
      if (res?.success) {
        toast({ title: "Tous les services IA opérationnels ✅" });
      } else {
        toast({
          title: "Certains services IA sont en erreur",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: "Erreur de diagnostic",
        description: err?.message ?? "Impossible de joindre le service",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRunningName(null);
    }
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Activity className="w-5 h-5 text-primary" />
          Diagnostic IA — Test des 5 services
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Vérifie la connectivité et la réponse de chaque edge function IA.
          </p>
          <Button
            onClick={runDiagnostics}
            disabled={loading}
            className="bg-primary hover:bg-primary/90"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Test en cours...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-2" />
                Tester les IA
              </>
            )}
          </Button>
        </div>

        {data && (
          <div className="text-xs text-muted-foreground">
            Modèle : <span className="font-mono">{data.model}</span> •{" "}
            {new Date(data.checkedAt).toLocaleTimeString("fr-FR")}
          </div>
        )}

        <div className="space-y-2">
          {(data?.results ?? [
            { name: "generate-betting-tips", label: "Conseils de paris" },
            { name: "odds-ai-analysis", label: "Analyse des cotes" },
            { name: "racing-expert-chat", label: "Maître du Turf (chat)" },
            { name: "wague-turf-ai", label: "WAGUE-TURF IA" },
            { name: "ai-analysis", label: "Analyse IA générale" },
          ] as Partial<FunctionResult>[]).map((r) => {
            const isLoading = loading && runningName === "all";
            const ok = r.status === "ok";
            const err = r.status === "error";
            return (
              <div
                key={r.name}
                className="flex items-center justify-between p-3 rounded-md bg-muted/30 border border-border"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground shrink-0" />
                  ) : ok ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                  ) : err ? (
                    <XCircle className="w-4 h-4 text-destructive shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full bg-muted shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">
                      {r.label}
                    </div>
                    <div className="text-xs font-mono text-muted-foreground truncate">
                      {r.name}
                    </div>
                    {err && r.error && (
                      <div className="text-xs text-destructive mt-1 truncate max-w-md">
                        {r.error}
                      </div>
                    )}
                    {ok && r.reply && (
                      <div className="text-xs text-muted-foreground mt-1 italic truncate max-w-md">
                        « {r.reply} »
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  {typeof r.latency === "number" && (
                    <span className="text-xs font-mono text-muted-foreground">
                      {r.latency}ms
                    </span>
                  )}
                  {ok && (
                    <Badge variant="secondary" className="bg-green-500/10 text-green-500 border-green-500/30">
                      OK
                    </Badge>
                  )}
                  {err && (
                    <Badge variant="destructive">
                      {r.httpStatus ?? "ERR"}
                    </Badge>
                  )}
                  {!ok && !err && (
                    <Badge variant="outline">En attente</Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

