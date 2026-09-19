
'use client';

import {
  TrendingUp,
  Settings,
  Clock,
  Key,
  User,
  CheckCircle,
  XCircle,
  LogOut,
  MessageCircle,
  MessageSquare,
  CreditCard,
  Menu,
  X,
  FileText,
  Download,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useAccessInfo } from "@/components/AccessGate";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { generateUserGuidePDF } from "@/lib/user-guide-pdf";

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { daysRemaining } = useAccessInfo();
  const { isAdmin } = useAdminAuth();
  const [authState, setAuthState] = useState<{
    hasAccessCode: boolean;
    hasSupabaseAuth: boolean;
    accessCode: string | null;
    userId: string | null;
  }>({
    hasAccessCode: false,
    hasSupabaseAuth: false,
    accessCode: null,
    userId: null,
  });

  useEffect(() => {
    // Check session storage for access code
    const accessCode = sessionStorage.getItem("racing_access_code");

    // Check Supabase auth
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthState({
        hasAccessCode: !!accessCode,
        hasSupabaseAuth: !!session?.user,
        accessCode: accessCode ? `${accessCode.slice(0, 4)}...` : null,
        userId: session?.user?.id?.slice(0, 8) || null,
      });
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, session) => {
      const code = sessionStorage.getItem("racing_access_code");
      setAuthState((prev) => ({
        ...prev,
        hasSupabaseAuth: !!session?.user,
        userId: session?.user?.id?.slice(0, 8) || null,
      }));
    });

    return () => subscription.unsubscribe();
  }, []);

  const isAuthenticated = authState.hasAccessCode || authState.hasSupabaseAuth;

  const handleLogout = async () => {
    // Clear access code from session storage
    if (authState.hasAccessCode) {
      sessionStorage.removeItem("racing_access_code");
    }

    // Sign out from Supabase if authenticated
    if (authState.hasSupabaseAuth) {
      await supabase.auth.signOut();
    }

    // Update state
    setAuthState({
      hasAccessCode: false,
      hasSupabaseAuth: false,
      accessCode: null,
      userId: null,
    });

    toast.success("Déconnexion réussie");

    // Reload the page to reset the app state
    window.location.reload();
  };

  return (
    <header className="relative overflow-hidden border-b border-border bg-card/50 backdrop-blur-sm">
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-secondary/5" />

      <div className="relative container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="relative group cursor-pointer flex items-center gap-3">
              <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-primary/50 shadow-[0_0_15px_rgba(0,255,160,0.4)] transition-all duration-300 group-hover:scale-105 group-hover:border-primary">
                <img
                  src="/logo.jpg"
                  alt="Turf Coaching System Logo"
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-black tracking-tight flex items-center gap-1">
                  <span className="text-foreground">TURF</span>
                  <span className="text-primary text-glow-green">COACHING</span>
                  <span className="text-accent text-xs font-semibold px-1.5 py-0.5 rounded bg-accent/20 border border-accent/30 uppercase">SYSTEM</span>
                </h1>
                <p className="text-xs text-muted-foreground">Assistant d'Analyse Hippique & IA Prédictive</p>
              </div>
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-4">
            {/* Authentication Status Indicator */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
                    isAuthenticated
                      ? "bg-emerald-500/10 border-emerald-500/30"
                      : "bg-destructive/10 border-destructive/30"
                  }`}
                >
                  {isAuthenticated ? (
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-destructive" />
                  )}
                  <div className="flex items-center gap-1.5">
                    {authState.hasAccessCode && (
                      <div className="flex items-center gap-1 text-xs">
                        <Key className="w-3 h-3 text-amber-500" />
                        <span className="text-amber-500 font-mono">{authState.accessCode}</span>
                      </div>
                    )}
                    {authState.hasSupabaseAuth && (
                      <div className="flex items-center gap-1 text-xs">
                        <User className="w-3 h-3 text-blue-500" />
                        <span className="text-blue-500 font-mono">{authState.userId}...</span>
                      </div>
                    )}
                    {!isAuthenticated && <span className="text-xs text-destructive">Non authentifié</span>}
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <div className="text-xs space-y-1">
                  <p>
                    <strong>État de l'authentification:</strong>
                  </p>
                  <p>Code d'accès: {authState.hasAccessCode ? `✓ ${authState.accessCode}` : "✗ Non défini"}</p>
                  <p>Auth Supabase: {authState.hasSupabaseAuth ? `✓ ${authState.userId}...` : "✗ Non connecté"}</p>
                  <p className="text-muted-foreground mt-2">
                    L'un ou l'autre suffit pour accéder aux fonctionnalités IA
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>

            {daysRemaining !== null && (
              <div
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${
                  daysRemaining <= 7
                    ? "bg-destructive/10 border-destructive/30 text-destructive"
                    : daysRemaining <= 30
                      ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-500"
                      : "bg-primary/10 border-primary/30 text-primary"
                }`}
              >
                <Clock className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {daysRemaining === 0
                    ? "Expire aujourd'hui"
                    : daysRemaining === 1
                      ? "1 jour restant"
                      : `${daysRemaining} jours restants`}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted/30 border border-border">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span className="text-sm text-muted-foreground">Algorithme v8.0</span>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    generateUserGuidePDF();
                    toast.success("Guide téléchargé !");
                  }}
                  className="flex items-center gap-2 border-primary/30 hover:bg-primary/10"
                >
                  <Download className="w-4 h-4 text-primary" />
                  <span className="text-sm text-primary">Guide PDF</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">Télécharger le mode d'emploi complet en PDF</p>
              </TooltipContent>
            </Tooltip>
            <Link
              href="/turf-coaching"
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-primary/20 to-primary/10 border border-primary/30 hover:from-primary/30 hover:to-primary/20 transition-colors"
            >
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm text-primary font-medium">Turf-Coaching</span>
            </Link>
            <Link
              href="/forum"
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30 border border-border hover:bg-muted/50 transition-colors"
            >
              <MessageSquare className="w-4 h-4 text-primary" />
              <span className="text-sm text-muted-foreground">Forum</span>
            </Link>
            {isAdmin && (
              <Link
                href="/admin"
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30 border border-border hover:bg-muted/50 transition-colors"
              >
                <Settings className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Admin</span>
              </Link>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <a
                  href="https://my.moneyfusion.net/6981c32afa6969620bb09f4f"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white transition-colors"
                >
                  <CreditCard className="w-5 h-5" />
                  <span className="text-sm font-medium">VIP Coaching</span>
                </a>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">Rejoindre le VIP Turf Coaching</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <a
                  href="https://chat.whatsapp.com/ExGwEiwfRBZ9CT9D15bpsy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 hover:bg-green-500/10 border border-green-500/30 hover:border-green-500/50"
                >
                  <MessageCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-green-500">
                    {isAuthenticated ? "WhatsApp" : "Contactez-moi via WhatsApp"}
                  </span>
                </a>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">
                  {isAuthenticated ? "Rejoindre le groupe WhatsApp" : "Me contacter directement sur WhatsApp"}
                </p>
              </TooltipContent>
            </Tooltip>
            {isAuthenticated && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLogout}
                    className="flex items-center gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="text-sm">Déconnexion</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="text-xs">Se déconnecter de l'application</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>

          {/* Mobile Menu Button */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="w-6 h-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 bg-card border-border">
              <div className="flex flex-col gap-4 mt-8">
                {/* Auth Status */}
                <div
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
                    isAuthenticated
                      ? "bg-emerald-500/10 border-emerald-500/30"
                      : "bg-destructive/10 border-destructive/30"
                  }`}
                >
                  {isAuthenticated ? (
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-destructive" />
                  )}
                  <span className="text-sm">{isAuthenticated ? "Connecté" : "Non authentifié"}</span>
                </div>

                {daysRemaining !== null && (
                  <div
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
                      daysRemaining <= 7
                        ? "bg-destructive/10 border-destructive/30 text-destructive"
                        : daysRemaining <= 30
                          ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-500"
                          : "bg-primary/10 border-primary/30 text-primary"
                    }`}
                  >
                    <Clock className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      {daysRemaining === 0
                        ? "Expire aujourd'hui"
                        : daysRemaining === 1
                          ? "1 jour restant"
                          : `${daysRemaining} jours restants`}
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30 border border-border">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <span className="text-sm text-muted-foreground">Algorithme v8.0</span>
                </div>

                <Button
                  variant="outline"
                  onClick={() => {
                    generateUserGuidePDF();
                    toast.success("Guide téléchargé !");
                    setMobileMenuOpen(false);
                  }}
                  className="flex items-center gap-2 border-primary/30 hover:bg-primary/10"
                >
                  <Download className="w-4 h-4 text-primary" />
                  <span className="text-sm text-primary">Télécharger le Guide PDF</span>
                </Button>

                <Link
                  href="/turf-coaching"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-primary/20 to-primary/10 border border-primary/30 hover:from-primary/30 hover:to-primary/20 transition-colors"
                >
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-sm text-primary font-medium">Turf-Coaching</span>
                </Link>

                <Link
                  href="/forum"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30 border border-border hover:bg-muted/50 transition-colors"
                >
                  <MessageSquare className="w-4 h-4 text-primary" />
                  <span className="text-sm text-muted-foreground">Forum</span>
                </Link>

                {isAdmin && (
                  <Link
                    href="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30 border border-border hover:bg-muted/50 transition-colors"
                  >
                    <Settings className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Admin</span>
                  </Link>
                )}

                <a
                  href="https://my.moneyfusion.net/6981c32afa6969620bb09f4f"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-3 rounded-lg bg-amber-600 hover:bg-amber-700 text-white transition-colors"
                >
                  <CreditCard className="w-5 h-5" />
                  <span className="text-sm font-medium">VIP Coaching</span>
                </a>

                <a
                  href="https://chat.whatsapp.com/ExGwEiwfRBZ9CT9D15bpsy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-green-500/30 hover:bg-green-500/10 transition-colors"
                >
                  <MessageCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-green-500">WhatsApp</span>
                </a>

                {isAuthenticated && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      handleLogout();
                      setMobileMenuOpen(false);
                    }}
                    className="flex items-center gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="text-sm">Déconnexion</span>
                  </Button>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

