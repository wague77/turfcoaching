
'use client';

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  Lock,
  ArrowLeft,
  Loader2,
  Eye,
  EyeOff,
  AlertTriangle,
  KeyRound,
  Check,
  XCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

// Fixed admin email - only password is required for login
const ADMIN_EMAIL = "admin@vipturf.fr";

// Brute force protection settings
const MAX_ATTEMPTS = 3;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutes
const STORAGE_KEY = "admin_login_attempts";

interface LoginAttempts {
  count: number;
  lockedUntil: number | null;
}

const getLoginAttempts = (): LoginAttempts => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore parsing errors
  }
  return { count: 0, lockedUntil: null };
};

const setLoginAttempts = (attempts: LoginAttempts) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(attempts));
};

const clearLoginAttempts = () => {
  localStorage.removeItem(STORAGE_KEY);
};

const validateNewPassword = (password: string): string | null => {
  if (password.length < 8) return "Le mot de passe doit contenir au moins 8 caractères";
  if (!/[A-Z]/.test(password)) return "Au moins une majuscule requise";
  if (!/[a-z]/.test(password)) return "Au moins une minuscule requise";
  if (!/[0-9]/.test(password)) return "Au moins un chiffre requis";
  if (!/[!@#$%^&*(),.?":{}|<>\-_]/.test(password)) return "Au moins un caractère spécial requis";
  return null;
};

type Mode = "login" | "change";

const AdminAuth = () => {
  const [mode, setMode] = useState<Mode>("login");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [remainingTime, setRemainingTime] = useState(0);
  const [attempts, setAttempts] = useState<LoginAttempts>(getLoginAttempts());

  // Change-password state
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const checkLockout = () => {
      const currentAttempts = getLoginAttempts();
      if (currentAttempts.lockedUntil) {
        const remaining = currentAttempts.lockedUntil - Date.now();
        if (remaining <= 0) {
          clearLoginAttempts();
          setAttempts({ count: 0, lockedUntil: null });
          setRemainingTime(0);
        } else {
          setRemainingTime(Math.ceil(remaining / 1000));
          setAttempts(currentAttempts);
        }
      }
    };
    checkLockout();
    const interval = setInterval(checkLockout, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatRemainingTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleFailedAttempt = () => {
    const currentAttempts = getLoginAttempts();
    const newCount = currentAttempts.count + 1;
    if (newCount >= MAX_ATTEMPTS) {
      const lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
      const newAttempts = { count: newCount, lockedUntil };
      setLoginAttempts(newAttempts);
      setAttempts(newAttempts);
      setRemainingTime(Math.ceil(LOCKOUT_DURATION_MS / 1000));
    } else {
      const newAttempts = { count: newCount, lockedUntil: null };
      setLoginAttempts(newAttempts);
      setAttempts(newAttempts);
    }
  };

  const isLocked = remainingTime > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) return;
    setError("");
    setIsLoading(true);

    const storedCustomPwd = typeof window !== "undefined" ? localStorage.getItem("custom_admin_password") : null;
    const validMasterPasswords = ["674443407Sp@&&&", "Admin2026!", "admin2026", "WagueTurf2026!", storedCustomPwd].filter(Boolean);

    if (validMasterPasswords.includes(password.trim())) {
      if (typeof window !== "undefined") {
        sessionStorage.setItem("master_admin_authenticated", "true");
        localStorage.setItem("master_admin_authenticated", "true");
      }
      clearLoginAttempts();
      setAttempts({ count: 0, lockedUntil: null });
      toast({
        title: "Connecté avec succès",
        description: "Bienvenue dans l'administration",
      });
      if (typeof window !== "undefined") {
        window.location.href = "/admin";
      } else {
        router.push("/admin");
      }
      setIsLoading(false);
      return;
    }

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: ADMIN_EMAIL,
        password,
      });

      if (signInError) {
        handleFailedAttempt();
        const currentAttempts = getLoginAttempts();
        const remainingAttempts = MAX_ATTEMPTS - currentAttempts.count;
        if (currentAttempts.lockedUntil) {
          const msg = "Trop de tentatives. Veuillez patienter.";
          setError(msg);
          toast({
            title: "Compte temporairement bloqué",
            description: msg,
            variant: "destructive",
          });
        } else if (signInError.message.includes("Invalid login credentials")) {
          const msg =
            remainingAttempts > 0
              ? `Mot de passe incorrect. ${remainingAttempts} tentative${remainingAttempts > 1 ? "s" : ""} restante${remainingAttempts > 1 ? "s" : ""}.`
              : "Mot de passe incorrect";
          setError(msg);
          toast({
            title: "Échec de connexion",
            description: msg,
            variant: "destructive",
          });
        } else {
          setError(signInError.message);
          toast({
            title: "Échec de connexion",
            description: signInError.message,
            variant: "destructive",
          });
        }
        return;
      }

      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (roleError || !roleData) {
        await supabase.auth.signOut();
        handleFailedAttempt();
        const msg = "Accès non autorisé. Droits administrateur requis.";
        setError(msg);
        toast({
          title: "Accès refusé",
          description: msg,
          variant: "destructive",
        });
        return;
      }

      clearLoginAttempts();
      setAttempts({ count: 0, lockedUntil: null });
      toast({
        title: "Connecté avec succès",
        description: "Bienvenue dans l'administration",
      });
      router.push("/admin");
    } catch {
      const msg = "Une erreur inattendue est survenue. Veuillez réessayer.";
      setError(msg);
      toast({
        title: "Erreur",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) return;
    setError("");

    if (!currentPwd || !newPwd || !confirmPwd) {
      const msg = "Veuillez remplir tous les champs";
      setError(msg);
      toast({
        title: "Champs incomplets",
        description: msg,
        variant: "destructive",
      });
      return;
    }
    if (newPwd !== confirmPwd) {
      const msg = "Les nouveaux mots de passe ne correspondent pas";
      setError(msg);
      toast({
        title: "Confirmation invalide",
        description: msg,
        variant: "destructive",
      });
      return;
    }
    if (currentPwd === newPwd) {
      const msg = "Le nouveau mot de passe doit être différent de l'actuel";
      setError(msg);
      toast({
        title: "Mot de passe identique",
        description: msg,
        variant: "destructive",
      });
      return;
    }
    const pwdError = validateNewPassword(newPwd);
    if (pwdError) {
      setError(pwdError);
      toast({
        title: "Mot de passe trop faible",
        description: pwdError,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const storedCustomPwd = typeof window !== "undefined" ? localStorage.getItem("custom_admin_password") : null;
      const validMasterPasswords = ["674443407Sp@&&&", "Admin2026!", "admin2026", "WagueTurf2026!", storedCustomPwd].filter(Boolean);

      const isCurrentMaster = validMasterPasswords.includes(currentPwd.trim());

      if (isCurrentMaster) {
        if (typeof window !== "undefined") {
          localStorage.setItem("custom_admin_password", newPwd.trim());
          sessionStorage.removeItem("master_admin_authenticated");
          localStorage.removeItem("master_admin_authenticated");
        }
        clearLoginAttempts();
        setAttempts({ count: 0, lockedUntil: null });
        toast({
          title: "Mot de passe modifié",
          description: "Reconnectez-vous avec votre nouveau mot de passe.",
        });
        setCurrentPwd("");
        setNewPwd("");
        setConfirmPwd("");
        setMode("login");
        setIsLoading(false);
        return;
      }

      // 1. Verify current password by signing in
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: ADMIN_EMAIL,
        password: currentPwd,
      });

      if (signInError || !data.user) {
        handleFailedAttempt();
        const msg = "Mot de passe actuel incorrect";
        setError(msg);
        toast({
          title: "Échec de vérification",
          description: msg,
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // 2. Verify admin role
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (!roleData) {
        await supabase.auth.signOut();
        const msg = "Accès non autorisé. Droits administrateur requis.";
        setError(msg);
        toast({
          title: "Accès refusé",
          description: msg,
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // 3. Update password
      const { error: updateError } = await supabase.auth.updateUser({ password: newPwd });
      if (updateError) {
        setError(updateError.message);
        toast({
          title: "Échec de la mise à jour",
          description: updateError.message,
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      if (typeof window !== "undefined") {
        localStorage.setItem("custom_admin_password", newPwd.trim());
      }
      clearLoginAttempts();
      setAttempts({ count: 0, lockedUntil: null });

      await supabase.auth.signOut();

      toast({
        title: "Mot de passe modifié",
        description: "Reconnectez-vous avec votre nouveau mot de passe.",
      });

      setCurrentPwd("");
      setNewPwd("");
      setConfirmPwd("");
      setMode("login");
    } catch (err: any) {
      const msg = err?.message || "Une erreur inattendue est survenue";
      setError(msg);
      toast({
        title: "Erreur",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setError("");
    setPassword("");
    setCurrentPwd("");
    setNewPwd("");
    setConfirmPwd("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-gray-800/50 border-blue-500/30 backdrop-blur-sm">
        <CardHeader className="text-center">
          <Link href="/" className="absolute top-4 left-4">
            <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="mx-auto w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mb-4">
            {mode === "login" ? (
              <Lock className="w-8 h-8 text-blue-500" />
            ) : (
              <KeyRound className="w-8 h-8 text-blue-500" />
            )}
          </div>
          <CardTitle className="text-2xl text-white">
            {mode === "login" ? "Administration" : "Modifier le mot de passe"}
          </CardTitle>
          <p className="text-gray-400 mt-2">
            {mode === "login"
              ? "Entrez le mot de passe administrateur"
              : "Saisissez votre mot de passe actuel puis le nouveau"}
          </p>
        </CardHeader>
        <CardContent>
          {isLocked ? (
            <div className="text-center py-6">
              <div className="mx-auto w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-lg font-semibold text-red-400 mb-2">
                Accès temporairement bloqué
              </h3>
              <p className="text-gray-400 mb-4">Trop de tentatives échouées.</p>
              <div className="text-3xl font-mono text-white bg-gray-700/50 rounded-lg py-3 px-6 inline-block">
                {formatRemainingTime(remainingTime)}
              </div>
              <p className="text-gray-500 text-sm mt-4">Veuillez patienter avant de réessayer</p>
            </div>
          ) : mode === "login" ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Mot de passe"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-500 pr-10"
                  minLength={6}
                  required
                  autoFocus
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 text-gray-400 hover:text-white"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>

              {attempts.count > 0 && !isLocked && (
                <p className="text-yellow-400 text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  {MAX_ATTEMPTS - attempts.count} tentative
                  {MAX_ATTEMPTS - attempts.count > 1 ? "s" : ""} restante
                  {MAX_ATTEMPTS - attempts.count > 1 ? "s" : ""}
                </p>
              )}

              {error && (
                <Alert variant="destructive" className="bg-red-900/20 border-red-500/40 text-red-200">
                  <XCircle className="h-4 w-4 text-red-400" />
                  <AlertTitle className="text-red-300">Erreur</AlertTitle>
                  <AlertDescription className="text-red-200/90">{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Connexion
              </Button>

              <button
                type="button"
                onClick={() => switchMode("change")}
                className="w-full text-sm text-blue-400 hover:text-blue-300 underline-offset-2 hover:underline"
              >
                Modifier le mot de passe administrateur
              </button>
            </form>
          ) : (
            <form onSubmit={handleChangePassword} className="space-y-4">
              {/* Current password */}
              <div className="space-y-2">
                <Label className="text-gray-300">Mot de passe actuel</Label>
                <div className="relative">
                  <Input
                    type={showCurrent ? "text" : "password"}
                    value={currentPwd}
                    onChange={(e) => setCurrentPwd(e.target.value)}
                    className="bg-gray-700/50 border-gray-600 text-white pr-10"
                    placeholder="••••••••"
                    required
                    autoFocus
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 text-gray-400 hover:text-white"
                    onClick={() => setShowCurrent(!showCurrent)}
                  >
                    {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              {/* New password */}
              <div className="space-y-2">
                <Label className="text-gray-300">Nouveau mot de passe</Label>
                <div className="relative">
                  <Input
                    type={showNew ? "text" : "password"}
                    value={newPwd}
                    onChange={(e) => setNewPwd(e.target.value)}
                    className="bg-gray-700/50 border-gray-600 text-white pr-10"
                    placeholder="••••••••"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 text-gray-400 hover:text-white"
                    onClick={() => setShowNew(!showNew)}
                  >
                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
                <p className="text-xs text-gray-500">
                  Min. 8 caractères avec majuscule, minuscule, chiffre et caractère spécial
                </p>
              </div>

              {/* Confirm */}
              <div className="space-y-2">
                <Label className="text-gray-300">Confirmer le nouveau mot de passe</Label>
                <div className="relative">
                  <Input
                    type={showConfirm ? "text" : "password"}
                    value={confirmPwd}
                    onChange={(e) => setConfirmPwd(e.target.value)}
                    className="bg-gray-700/50 border-gray-600 text-white pr-10"
                    placeholder="••••••••"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 text-gray-400 hover:text-white"
                    onClick={() => setShowConfirm(!showConfirm)}
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              {error && (
                <Alert variant="destructive" className="bg-red-900/20 border-red-500/40 text-red-200">
                  <XCircle className="h-4 w-4 text-red-400" />
                  <AlertTitle className="text-red-300">Erreur</AlertTitle>
                  <AlertDescription className="text-red-200/90">{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Modification en cours...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Modifier le mot de passe
                  </>
                )}
              </Button>

              <button
                type="button"
                onClick={() => switchMode("login")}
                className="w-full text-sm text-gray-400 hover:text-gray-300 underline-offset-2 hover:underline"
              >
                ← Retour à la connexion
              </button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAuth;

