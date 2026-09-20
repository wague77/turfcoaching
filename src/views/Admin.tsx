
'use client';

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { 
  Plus, 
  Trash2, 
  Copy, 
  Check,
  KeyRound,
  ArrowLeft,
  CalendarIcon,
  Link2,
  Loader2,
  Pencil,
  Ban,
  CheckCircle,
  Smartphone,
  MonitorOff,
  Monitor
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { NotificationManager } from "@/components/admin/NotificationManager";
import { PasswordChangeSection } from "@/components/admin/PasswordChangeSection";
import { PromoBannerManager } from "@/components/admin/PromoBannerManager";
import { TurfCoachingPasswordManager } from "@/components/admin/TurfCoachingPasswordManager";
import { AIPasswordManager } from "@/components/admin/AIPasswordManager";
import { AISessionsManager } from "@/components/admin/AISessionsManager";
import { AIDiagnosticsPanel } from "@/components/admin/AIDiagnosticsPanel";
import {
  AccessCode,
  getAccessCodes,
  addAccessCode,
  deleteAccessCode,
  updateAccessCodeExpiration,
  toggleAccessCodeBlock,
  isCodeExpired,
} from "@/lib/access-codes";

const Admin = () => {
  const router = useRouter();
  const { user, isAdmin, isLoading: authLoading, signOut } = useAdminAuth();
  const [codes, setCodes] = useState<AccessCode[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [editExpirationDate, setEditExpirationDate] = useState<Date | undefined>();
  const [expirationDate, setExpirationDate] = useState<Date | undefined>(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  );
  const [multiDeviceEnabled, setMultiDeviceEnabled] = useState(false);
  const [multiDeviceLoading, setMultiDeviceLoading] = useState(false);
  const { toast } = useToast();

  const appUrl = typeof window !== "undefined" ? window.location.origin : "";

  const handleCopyAppLink = async () => {
    await navigator.clipboard.writeText(appUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
    toast({
      title: "Copié",
      description: "Lien de l'application copié dans le presse-papiers",
    });
  };

  useEffect(() => {
    if (isAdmin) {
      loadCodes();
      loadMultiDeviceSetting();
    }
  }, [isAdmin]);

  const loadMultiDeviceSetting = async () => {
    try {
      const { data, error } = await supabase
        .from("app_settings")
        .select("multi_device_enabled")
        .limit(1)
        .single();
      if (!error && data) {
        setMultiDeviceEnabled(data.multi_device_enabled);
      }
    } catch (err) {
      console.error("Error loading multi-device setting:", err);
    }
  };

  const handleToggleMultiDevice = async (enabled: boolean) => {
    setMultiDeviceLoading(true);
    try {
      const { error } = await supabase
        .from("app_settings")
        .update({ multi_device_enabled: enabled })
        .not("id", "is", null);
      if (error) throw error;
      setMultiDeviceEnabled(enabled);
      toast({
        title: enabled ? "Multi-appareil activé" : "Multi-appareil désactivé",
        description: enabled
          ? "Chaque code d'accès peut maintenant être utilisé sur 2 appareils maximum"
          : "Chaque code d'accès est limité à 1 seul appareil",
      });
    } catch (err) {
      toast({
        title: "Erreur",
        description: "Impossible de modifier le paramètre",
        variant: "destructive",
      });
    } finally {
      setMultiDeviceLoading(false);
    }
  };

  const handleUnbindDevice = async (code: string, slot: 1 | 2) => {
    const updateData = slot === 1
      ? { device_id: null, device_info: null, is_used: false, used_at: null }
      : { device_id_2: null };

    const { error } = await supabase
      .from("access_codes")
      .update(updateData)
      .eq("code", code);

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de délier l'appareil",
        variant: "destructive",
      });
    } else {
      await loadCodes();
      toast({
        title: "Appareil délié",
        description: `L'appareil ${slot} a été délié du code ${code}`,
      });
    }
  };

  const loadCodes = async () => {
    setIsLoading(true);
    try {
      const fetchedCodes = await getAccessCodes();
      setCodes(fetchedCodes);
    } catch (err) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les codes",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateCode = async () => {
    if (!expirationDate) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner une date d'expiration",
        variant: "destructive",
      });
      return;
    }
    
    setIsGenerating(true);
    try {
      const newCode = await addAccessCode(expirationDate);
      if (newCode) {
        await loadCodes();
        toast({
          title: "Code généré",
          description: `Nouveau code: ${newCode.code}`,
        });
      } else {
        toast({
          title: "Erreur",
          description: "Impossible de générer le code",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Erreur",
        description: "Erreur lors de la génération du code",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteCode = async (code: string) => {
    const success = await deleteAccessCode(code);
    if (success) {
      await loadCodes();
      toast({
        title: "Code supprimé",
        description: "Le code a été supprimé avec succès.",
      });
    } else {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le code",
        variant: "destructive",
      });
    }
  };

  const handleEditExpiration = (item: AccessCode) => {
    setEditingCode(item.code);
    setEditExpirationDate(new Date(item.expires_at));
  };

  const handleSaveExpiration = async (code: string) => {
    if (!editExpirationDate) return;
    
    const success = await updateAccessCodeExpiration(code, editExpirationDate);
    if (success) {
      await loadCodes();
      setEditingCode(null);
      toast({
        title: "Expiration modifiée",
        description: `Nouvelle date: ${format(editExpirationDate, "d MMMM yyyy", { locale: fr })}`,
      });
    } else {
      toast({
        title: "Erreur",
        description: "Impossible de modifier la date d'expiration",
        variant: "destructive",
      });
    }
  };

  const handleToggleBlock = async (item: AccessCode) => {
    const newBlockedState = !item.is_blocked;
    const success = await toggleAccessCodeBlock(item.code, newBlockedState);
    if (success) {
      await loadCodes();
      toast({
        title: newBlockedState ? "Accès bloqué" : "Accès débloqué",
        description: newBlockedState 
          ? `L'utilisateur avec le code ${item.code} ne peut plus accéder à l'application`
          : `L'utilisateur avec le code ${item.code} peut à nouveau accéder à l'application`,
      });
    } else {
      toast({
        title: "Erreur",
        description: "Impossible de modifier le statut de blocage",
        variant: "destructive",
      });
    }
  };

  const handleCopyCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
    toast({
      title: "Copié",
      description: "Code copié dans le presse-papiers",
    });
  };

  const getCodeStatus = (item: AccessCode): { label: string; className: string; isActive: boolean } => {
    if (item.is_blocked) {
      return { label: "Bloqué", className: "bg-red-600 text-white", isActive: false };
    }
    if (item.is_used) {
      return { label: "Utilisé", className: "bg-red-500/80 text-white", isActive: false };
    }
    if (isCodeExpired(item)) {
      return { label: "Expiré", className: "bg-red-600 text-white", isActive: false };
    }
    return { label: "Actif", className: "bg-green-600 text-white", isActive: true };
  };

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.replace("/admin/auth");
    }
  }, [authLoading, isAdmin, router]);

  // Loading state
  if (authLoading || !isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  // Admin dashboard
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <KeyRound className="w-6 h-6 text-blue-500" />
                Générateur de Codes
              </h1>
              <p className="text-gray-400 text-sm">
                Connecté: {user?.email || "Administrateur Master"}
              </p>
            </div>
          </div>
          <Button 
            variant="outline" 
            onClick={signOut}
            className="border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            Déconnexion
          </Button>
        </div>

        {/* Application link */}
        <Card className="bg-gray-800/50 border-gray-700 mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Link2 className="w-5 h-5 text-blue-500" />
                  Lien de l'application
                </h2>
                <p className="text-gray-400 text-sm">
                  Partagez ce lien avec les utilisateurs
                </p>
              </div>
              <div className="flex items-center gap-3">
                <code className="bg-gray-700/50 px-4 py-2 rounded-lg text-blue-400 text-sm font-mono">
                  {appUrl}
                </code>
                <Button 
                  onClick={handleCopyAppLink}
                  variant="outline"
                  className="border-blue-500 text-blue-400 hover:bg-blue-500/20"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-4 h-4 mr-2 text-green-500" />
                      Copié
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      Copier
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Generate button */}
        <Card className="bg-gray-800/50 border-gray-700 mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-white">Nouveau code d'accès</h2>
                <p className="text-gray-400 text-sm">
                  Générez un code unique pour un nouvel utilisateur
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[200px] justify-start text-left font-normal border-gray-600 bg-gray-700/50 text-white hover:bg-gray-700",
                        !expirationDate && "text-gray-500"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {expirationDate ? format(expirationDate, "d MMM yyyy", { locale: fr }) : <span>Date d'expiration</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      mode="single"
                      selected={expirationDate}
                      onSelect={setExpirationDate}
                      disabled={(date) => date < new Date()}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                <Button 
                  onClick={handleGenerateCode}
                  className="bg-green-600 hover:bg-green-700 text-white"
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4 mr-2" />
                  )}
                  Générer
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Multi-device toggle */}
        <Card className="bg-gray-800/50 border-gray-700 mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Monitor className="w-5 h-5 text-blue-400" />
                <div>
                  <h2 className="text-lg font-semibold text-white">Multi-appareil (2 max)</h2>
                  <p className="text-gray-400 text-sm">
                    {multiDeviceEnabled 
                      ? "Chaque code peut être utilisé sur 2 appareils différents" 
                      : "Chaque code est limité à 1 seul appareil"}
                  </p>
                </div>
              </div>
              <Switch
                checked={multiDeviceEnabled}
                onCheckedChange={handleToggleMultiDevice}
                disabled={multiDeviceLoading}
              />
            </div>
          </CardContent>
        </Card>

        {/* Codes list */}
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center justify-between flex-wrap gap-2">
              <span>Codes d'accès ({codes.length})</span>
              <div className="flex gap-2 flex-wrap">
                <Badge variant="outline" className="border-green-500 text-green-400">
                  Actifs: {codes.filter(c => !c.is_used && !isCodeExpired(c) && !c.is_blocked).length}
                </Badge>
                <Badge variant="outline" className="border-red-500 text-red-400">
                  Expirés: {codes.filter(c => !c.is_used && isCodeExpired(c)).length}
                </Badge>
                <Badge variant="outline" className="border-gray-500 text-gray-400">
                  Utilisés: {codes.filter(c => c.is_used).length}
                </Badge>
                <Badge variant="outline" className="border-blue-500 text-blue-400">
                  <Smartphone className="w-3 h-3 mr-1" />
                  Connectés: {codes.filter(c => c.device_id).length}
                </Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-gray-500">
                <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin" />
                <p>Chargement des codes...</p>
              </div>
            ) : codes.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <KeyRound className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Aucun code généré</p>
                <p className="text-sm">Cliquez sur "Générer" pour créer un nouveau code</p>
              </div>
            ) : (
              <div className="space-y-3">
                {codes.map((item) => {
                  const status = getCodeStatus(item);
                  const expired = isCodeExpired(item);
                  return (
                    <div
                      key={item.id}
                      className={`flex items-center justify-between p-4 rounded-lg ${
                        item.is_used 
                          ? "bg-gray-700/30 border border-gray-600/50" 
                          : expired
                            ? "bg-gray-700/30 border border-red-500/30"
                            : "bg-gray-700/50 border border-green-500/30"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <code className={`text-lg font-mono ${
                          item.is_used || expired ? "text-gray-500" : "text-white"
                        }`}>
                          {item.code}
                        </code>
                        <Badge className={status.className}>
                          {status.label}
                        </Badge>
                        {(() => {
                          const deviceCount = (item.device_id ? 1 : 0) + (item.device_id_2 ? 1 : 0);
                          const maxDevices = multiDeviceEnabled ? 2 : 1;
                          if (deviceCount === 0) {
                            return (
                              <Badge className="bg-gray-600 text-gray-300 flex items-center gap-1">
                                <MonitorOff className="w-3 h-3" />
                                0/{maxDevices}
                              </Badge>
                            );
                          }
                          return (
                            <Popover>
                              <PopoverTrigger asChild>
                                <Badge className={`${deviceCount >= maxDevices ? 'bg-orange-600' : 'bg-blue-600'} text-white flex items-center gap-1 cursor-pointer hover:opacity-80`}>
                                  <Smartphone className="w-3 h-3" />
                                  {deviceCount}/{maxDevices}
                                </Badge>
                              </PopoverTrigger>
                              <PopoverContent className="w-72 bg-gray-800 border-gray-700 text-white p-4">
                                <div className="space-y-3">
                                  <h4 className="font-semibold text-blue-400 flex items-center gap-2">
                                    <Smartphone className="w-4 h-4" />
                                    Appareils connectés ({deviceCount}/{maxDevices})
                                  </h4>
                                  {/* Device 1 */}
                                  {item.device_id && (
                                    <div className="space-y-1 text-sm border-b border-gray-600 pb-2">
                                      <p className="text-gray-300 font-medium">📱 Appareil 1</p>
                                      {item.device_info ? (
                                        <>
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
                                          <div className="flex justify-between">
                                            <span className="text-gray-400">Connecté le:</span>
                                            <span className="text-white">
                                              {new Date(item.device_info.connectedAt).toLocaleDateString("fr-FR")}
                                            </span>
                                          </div>
                                        </>
                                      ) : (
                                        <p className="text-xs text-gray-400">Infos non disponibles</p>
                                      )}
                                      <p className="text-xs text-gray-500 truncate" title={item.device_id}>
                                        ID: {item.device_id.slice(0, 16)}...
                                      </p>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-6 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/20 w-full mt-1"
                                        onClick={() => handleUnbindDevice(item.code, 1)}
                                      >
                                        <Trash2 className="w-3 h-3 mr-1" /> Délier
                                      </Button>
                                    </div>
                                  )}
                                  {/* Device 2 */}
                                  {item.device_id_2 && (
                                    <div className="space-y-1 text-sm">
                                      <p className="text-gray-300 font-medium">📱 Appareil 2</p>
                                      <p className="text-xs text-gray-500 truncate" title={item.device_id_2}>
                                        ID: {item.device_id_2.slice(0, 16)}...
                                      </p>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-6 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/20 w-full mt-1"
                                        onClick={() => handleUnbindDevice(item.code, 2)}
                                      >
                                        <Trash2 className="w-3 h-3 mr-1" /> Délier
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              </PopoverContent>
                            </Popover>
                          );
                        })()}
                      </div>
                      <div className="flex items-center gap-4 flex-wrap">
                        <div className="text-right text-sm text-gray-400">
                          <div>Créé: {new Date(item.created_at).toLocaleDateString("fr-FR")}</div>
                          {editingCode === item.code ? (
                            <div className="flex items-center gap-2 mt-1">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs border-gray-600 bg-gray-700/50 text-white hover:bg-gray-700"
                                  >
                                    <CalendarIcon className="mr-1 h-3 w-3" />
                                    {editExpirationDate ? format(editExpirationDate, "d MMM yyyy", { locale: fr }) : "Choisir"}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="end">
                                  <Calendar
                                    mode="single"
                                    selected={editExpirationDate}
                                    onSelect={setEditExpirationDate}
                                    initialFocus
                                    className="p-3 pointer-events-auto"
                                  />
                                </PopoverContent>
                              </Popover>
                              <Button
                                size="sm"
                                className="h-7 text-xs bg-green-600 hover:bg-green-700"
                                onClick={() => handleSaveExpiration(item.code)}
                              >
                                <Check className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs text-gray-400 hover:text-white"
                                onClick={() => setEditingCode(null)}
                              >
                                Annuler
                              </Button>
                            </div>
                          ) : (
                            <>
                              <div className={expired && !item.is_used ? "text-red-400" : ""}>
                                Expire: {new Date(item.expires_at).toLocaleDateString("fr-FR")}
                              </div>
                              {/* Days remaining */}
                              {(() => {
                                const now = new Date();
                                const expDate = new Date(item.expires_at);
                                const diffTime = expDate.getTime() - now.getTime();
                                const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                return (
                                  <div className={`font-semibold ${
                                    daysRemaining <= 0 
                                      ? 'text-red-400' 
                                      : daysRemaining <= 7 
                                        ? 'text-yellow-400' 
                                        : 'text-green-400'
                                  }`}>
                                    {daysRemaining <= 0 
                                      ? 'Expiré' 
                                      : `${daysRemaining} jour${daysRemaining > 1 ? 's' : ''} restant${daysRemaining > 1 ? 's' : ''}`
                                    }
                                  </div>
                                );
                              })()}
                              {/* Code display */}
                              <code className="text-xs text-blue-400 font-mono bg-gray-800 px-2 py-0.5 rounded mt-1 inline-block">
                                {item.code}
                              </code>
                            </>
                          )}
                          {item.used_at && (
                            <div>Utilisé: {new Date(item.used_at).toLocaleDateString("fr-FR")}</div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggleBlock(item)}
                            className={item.is_blocked ? "text-green-400 hover:text-green-300" : "text-gray-400 hover:text-orange-400"}
                            title={item.is_blocked ? "Débloquer l'accès" : "Bloquer l'accès"}
                          >
                            {item.is_blocked ? (
                              <CheckCircle className="w-4 h-4" />
                            ) : (
                              <Ban className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditExpiration(item)}
                            className="text-gray-400 hover:text-blue-400"
                            title="Modifier l'expiration"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleCopyCode(item.code)}
                            className="text-gray-400 hover:text-white"
                          >
                            {copiedCode === item.code ? (
                              <Check className="w-4 h-4 text-green-500" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteCode(item.code)}
                            className="text-gray-400 hover:text-red-500"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Promo Banner Manager */}
        <PromoBannerManager />

        {/* AI Diagnostics */}
        <AIDiagnosticsPanel />

        {/* AI Password Manager */}
        <AIPasswordManager />

        {/* AI Sessions Manager */}
        <AISessionsManager />

        {/* Turf-Coaching Password Manager */}
        <TurfCoachingPasswordManager />

        {/* Password Change Section */}
        <PasswordChangeSection />

        {/* Notification Manager */}
        <NotificationManager />
      </div>
    </div>
  );
};

export default Admin;

