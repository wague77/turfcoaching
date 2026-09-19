
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, Eye, EyeOff, Save, Loader2, RefreshCw, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export const TurfCoachingPasswordManager = () => {
  const [password, setPassword] = useState("");
  const [sessionDurationDays, setSessionDurationDays] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("turf_coaching_settings")
        .select("id, session_duration_days")
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSessionDurationDays(data.session_duration_days || 1);
        setSettingsId(data.id);
      }
    } catch (err) {
      console.error("Error loading settings:", err);
      toast({
        title: "Erreur",
        description: "Impossible de charger les paramètres",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!password.trim() || password.trim().length < 4) {
      toast({
        title: "Erreur",
        description: "Le mot de passe doit contenir au moins 4 caractères",
        variant: "destructive",
      });
      return;
    }

    if (sessionDurationDays < 1 || sessionDurationDays > 365) {
      toast({
        title: "Erreur",
        description: "La durée doit être entre 1 et 365 jours",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.rpc("set_turf_password", {
        new_password: password.trim(),
        new_duration_days: sessionDurationDays,
      });

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Paramètres Turf-Coaching mis à jour (mot de passe chiffré)",
      });
      setPassword("");
    } catch (err) {
      console.error("Error saving settings:", err);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder les paramètres",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const generateRandomPassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$!";
    let newPassword = "";
    for (let i = 0; i < 8; i++) {
      newPassword += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(newPassword);
  };

  const generateRandomDays = () => {
    const days = Math.floor(Math.random() * 30) + 1; // 1-30 days
    setSessionDurationDays(days);
  };

  if (isLoading) {
    return (
      <Card className="bg-gray-800/50 border-gray-700 mt-6">
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-800/50 border-gray-700 mt-6">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-400" />
          Paramètres Turf-Coaching
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-gray-400 text-sm">
          Configurez le mot de passe et la durée de session pour l'accès à Turf-Coaching.
        </p>
        
        {/* Password Section */}
        <div className="space-y-2">
          <Label htmlFor="turf-password" className="text-gray-300">
            Mot de passe d'accès
          </Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                id="turf-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-gray-700/50 border-gray-600 text-white pr-10"
                placeholder="Entrez le mot de passe"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <Button
              variant="outline"
              onClick={generateRandomPassword}
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
              title="Générer un mot de passe aléatoire"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Session Duration Section */}
        <div className="space-y-2">
          <Label htmlFor="session-duration" className="text-gray-300 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-purple-400" />
            Durée de session (jours)
          </Label>
          <div className="flex gap-2">
            <Input
              id="session-duration"
              type="number"
              min={1}
              max={365}
              value={sessionDurationDays}
              onChange={(e) => setSessionDurationDays(Math.max(1, Math.min(365, parseInt(e.target.value) || 1)))}
              className="bg-gray-700/50 border-gray-600 text-white flex-1"
              placeholder="Nombre de jours"
            />
            <Button
              variant="outline"
              onClick={generateRandomDays}
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
              title="Générer un nombre de jours aléatoire"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-gray-500">
            Les utilisateurs seront automatiquement déconnectés après cette durée.
          </p>
        </div>

        {/* Save Button */}
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Enregistrer les paramètres
        </Button>

        <p className="text-xs text-gray-500">
          Les utilisateurs devront entrer ce mot de passe pour accéder à Turf-Coaching. 
          Leur session expirera après {sessionDurationDays} jour{sessionDurationDays > 1 ? 's' : ''}.
        </p>
      </CardContent>
    </Card>
  );
};

