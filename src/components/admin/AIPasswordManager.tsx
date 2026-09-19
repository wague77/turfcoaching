
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Brain, Save, Loader2, Eye, EyeOff, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export function AIPasswordManager() {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadPassword();
  }, []);

  const loadPassword = async () => {
    // Password is now stored hashed (bcrypt) and cannot be read back.
    setIsLoading(false);
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

    setIsSaving(true);
    try {
      const { error } = await supabase.rpc("set_ai_password", {
        new_password: password.trim(),
      });

      if (error) throw error;

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      toast({
        title: "Succès",
        description: "Le mot de passe AI a été mis à jour (chiffré)",
      });
      setPassword("");
    } catch (error) {
      console.error("Error saving AI password:", error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder le mot de passe AI",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-gray-800/50 border-gray-700 mt-6">
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-800/50 border-gray-700 mt-6">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Brain className="w-5 h-5 text-purple-400" />
          Mot de passe AI
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-gray-400 text-sm">
          Ce mot de passe protège l'accès aux fonctionnalités d'analyse IA (conseils de jeu et analyse avancée).
        </p>
        
        <div className="space-y-2">
          <Label htmlFor="ai-password" className="text-gray-300">
            Mot de passe
          </Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                id="ai-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-gray-700/50 border-gray-600 text-white pr-10"
                placeholder="Nouveau mot de passe (non visible après enregistrement)"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-0 top-0 h-full px-3 text-gray-400 hover:text-white"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : saved ? (
                <Check className="w-4 h-4" />
              ) : (
                <Save className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

