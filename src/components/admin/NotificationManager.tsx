
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Bell,
  Plus,
  Trash2,
  CalendarIcon,
  Loader2,
  Info,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Power,
  ExternalLink,
  Eye,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "success" | "error";
  is_active: boolean;
  created_at: string;
  expires_at: string | null;
  link_url: string | null;
  link_text: string | null;
  target_audience: "all" | "authenticated" | "unauthenticated";
  reappear_after_minutes: number | null;
}

const typeConfig = {
  info: { icon: Info, label: "Info", color: "bg-blue-600" },
  warning: { icon: AlertTriangle, label: "Attention", color: "bg-yellow-600" },
  success: { icon: CheckCircle, label: "Succès", color: "bg-green-600" },
  error: { icon: XCircle, label: "Erreur", color: "bg-red-600" },
};

const audienceConfig = {
  all: { label: "Tous", description: "Visible par tous" },
  authenticated: { label: "Connectés", description: "Utilisateurs connectés uniquement" },
  unauthenticated: { label: "Non connectés", description: "Page de connexion uniquement" },
};

const reappearOptions = [
  { value: "null", label: "Ne pas réapparaître", minutes: null },
  { value: "5", label: "5 minutes", minutes: 5 },
  { value: "15", label: "15 minutes", minutes: 15 },
  { value: "30", label: "30 minutes", minutes: 30 },
  { value: "60", label: "1 heure", minutes: 60 },
  { value: "120", label: "2 heures", minutes: 120 },
];

export const NotificationManager = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState<Notification["type"]>("info");
  const [expiresAt, setExpiresAt] = useState<Date | undefined>();
  const [linkUrl, setLinkUrl] = useState("");
  const [linkText, setLinkText] = useState("");
  const [targetAudience, setTargetAudience] = useState<Notification["target_audience"]>("all");
  const [reappearAfter, setReappearAfter] = useState<string>("5");
  const { toast } = useToast();

  const fetchNotifications = async () => {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching notifications:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les notifications",
        variant: "destructive",
      });
      return;
    }

    setNotifications(data as Notification[]);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleCreate = async () => {
    if (!title.trim() || !message.trim()) {
      toast({
        title: "Erreur",
        description: "Le titre et le message sont requis",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);

    const reappearMinutes = reappearAfter === "null" ? null : parseInt(reappearAfter, 10);
    
    const { error } = await supabase.from("notifications").insert({
      title: title.trim(),
      message: message.trim(),
      type,
      expires_at: expiresAt?.toISOString() || null,
      link_url: linkUrl.trim() || null,
      link_text: linkText.trim() || null,
      target_audience: targetAudience,
      reappear_after_minutes: reappearMinutes,
    });

    if (error) {
      console.error("Error creating notification:", error);
      toast({
        title: "Erreur",
        description: "Impossible de créer la notification",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Notification créée",
        description: "La notification a été envoyée à tous les utilisateurs",
      });
      setTitle("");
      setMessage("");
      setType("info");
      setExpiresAt(undefined);
      setLinkUrl("");
      setLinkText("");
      setTargetAudience("all");
      setReappearAfter("5");
      setShowForm(false);
      fetchNotifications();
    }

    setIsCreating(false);
  };

  const handleToggleActive = async (notification: Notification) => {
    const { error } = await supabase
      .from("notifications")
      .update({ is_active: !notification.is_active })
      .eq("id", notification.id);

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de modifier la notification",
        variant: "destructive",
      });
    } else {
      fetchNotifications();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("notifications").delete().eq("id", id);

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la notification",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Notification supprimée",
      });
      fetchNotifications();
    }
  };

  return (
    <Card className="bg-gray-800/50 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-500" />
            Notifications ({notifications.length})
          </span>
          <Button
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 hover:bg-blue-700"
            size="sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nouvelle
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm && (
          <div className="bg-gray-700/50 p-4 rounded-lg space-y-4 border border-gray-600">
            <Input
              placeholder="Titre de la notification"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-gray-800 border-gray-600 text-white"
            />
            <Textarea
              placeholder="Message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="bg-gray-800 border-gray-600 text-white"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input
                placeholder="URL du lien (optionnel)"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                className="bg-gray-800 border-gray-600 text-white"
                type="url"
              />
              <Input
                placeholder="Texte du bouton (ex: Voir l'offre)"
                value={linkText}
                onChange={(e) => setLinkText(e.target.value)}
                className="bg-gray-800 border-gray-600 text-white"
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <Select value={type} onValueChange={(v) => setType(v as Notification["type"])}>
                <SelectTrigger className="w-40 bg-gray-800 border-gray-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(typeConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <span className="flex items-center gap-2">
                        <config.icon className="w-4 h-4" />
                        {config.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={targetAudience} onValueChange={(v) => setTargetAudience(v as Notification["target_audience"])}>
                <SelectTrigger className="w-44 bg-gray-800 border-gray-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(audienceConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={reappearAfter} onValueChange={setReappearAfter}>
                <SelectTrigger className="w-44 bg-gray-800 border-gray-600 text-white">
                  <SelectValue placeholder="Réapparition" />
                </SelectTrigger>
                <SelectContent>
                  {reappearOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-48 justify-start text-left font-normal border-gray-600 bg-gray-800 text-white hover:bg-gray-700",
                      !expiresAt && "text-gray-500"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {expiresAt
                      ? format(expiresAt, "d MMM yyyy", { locale: fr })
                      : "Expiration (optionnel)"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={expiresAt}
                    onSelect={setExpiresAt}
                    disabled={(date) => date < new Date()}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>

              <Button
                onClick={handleCreate}
                disabled={isCreating}
                className="bg-green-600 hover:bg-green-700"
              >
                {isCreating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Bell className="w-4 h-4 mr-2" />
                )}
                Envoyer
              </Button>
            </div>

            {/* Aperçu en temps réel */}
            {(title.trim() || message.trim()) && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Eye className="w-4 h-4" />
                  <span>Aperçu</span>
                </div>
                <div
                  className={cn(
                    "flex items-center justify-between gap-4 px-4 py-3 rounded-lg border shadow-lg",
                    type === "warning" && "bg-yellow-500/90 text-yellow-950 border-yellow-600",
                    type === "success" && "bg-green-500/90 text-green-950 border-green-600",
                    type === "error" && "bg-red-500/90 text-red-950 border-red-600",
                    type === "info" && "bg-blue-500/90 text-blue-950 border-blue-600"
                  )}
                >
                  <div className="flex items-center gap-3 flex-1">
                    {type === "warning" && <AlertTriangle className="w-5 h-5" />}
                    {type === "success" && <CheckCircle className="w-5 h-5" />}
                    {type === "error" && <XCircle className="w-5 h-5" />}
                    {type === "info" && <Info className="w-5 h-5" />}
                    <div className="flex-1">
                      <p className="font-semibold">{title || "Titre de la notification"}</p>
                      <p className="text-sm opacity-90">{message || "Message de la notification..."}</p>
                    </div>
                    {linkUrl.trim() && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white/20 font-medium text-sm shrink-0">
                        {linkText.trim() || "En savoir plus"}
                        <ExternalLink className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>
                  <div className="shrink-0 p-2 rounded-md hover:bg-white/20">
                    <XCircle className="w-4 h-4 opacity-50" />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-8">
            <Loader2 className="w-8 h-8 mx-auto animate-spin text-gray-400" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Aucune notification</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => {
              const config = typeConfig[notification.type];
              const TypeIcon = config.icon;
              const isExpired =
                notification.expires_at && new Date(notification.expires_at) < new Date();

              return (
                <div
                  key={notification.id}
                  className={cn(
                    "flex items-start justify-between p-4 rounded-lg border",
                    notification.is_active && !isExpired
                      ? "bg-gray-700/50 border-gray-600"
                      : "bg-gray-800/30 border-gray-700/50 opacity-60"
                  )}
                >
                  <div className="flex items-start gap-3 flex-wrap">
                    <Badge className={cn(config.color, "text-white")}>
                      <TypeIcon className="w-3 h-3 mr-1" />
                      {config.label}
                    </Badge>
                    <Badge variant="outline" className="text-gray-300 border-gray-500">
                      {audienceConfig[notification.target_audience]?.label || "Tous"}
                    </Badge>
                    {notification.reappear_after_minutes !== null && (
                      <Badge variant="outline" className="text-cyan-300 border-cyan-500">
                        ↻ {notification.reappear_after_minutes >= 60 
                          ? `${notification.reappear_after_minutes / 60}h` 
                          : `${notification.reappear_after_minutes}min`}
                      </Badge>
                    )}
                    <div className="w-full">
                      <p className="font-medium text-white">{notification.title}</p>
                      <p className="text-sm text-gray-400">{notification.message}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Créée le{" "}
                        {format(new Date(notification.created_at), "d MMM yyyy à HH:mm", {
                          locale: fr,
                        })}
                        {notification.expires_at &&
                          ` • Expire le ${format(new Date(notification.expires_at), "d MMM yyyy", {
                            locale: fr,
                          })}`}
                        {isExpired && " (expirée)"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleToggleActive(notification)}
                      className={cn(
                        "text-gray-400 hover:text-white",
                        notification.is_active && "text-green-500"
                      )}
                      title={notification.is_active ? "Désactiver" : "Activer"}
                    >
                      <Power className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(notification.id)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

