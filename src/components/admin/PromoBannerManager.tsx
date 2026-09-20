
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Megaphone, Save, Loader2, RefreshCw, Eye, Crown, Sparkles, Gift, Clock, Palette, Video } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

// Helper functions to extract video IDs
function extractYouTubeId(url: string): string {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : "";
}

function extractVimeoId(url: string): string {
  const regExp = /vimeo\.com\/(?:video\/)?(\d+)/;
  const match = url.match(regExp);
  return match ? match[1] : "";
}
interface PromoBannerSettings {
  id: string;
  promo_text: string;
  europe_price: string;
  africa_price: string;
  is_active: boolean;
  link_url: string | null;
  bottom_banner_text: string;
  bottom_banner_active: boolean;
  bottom_banner_countdown_end: string | null;
  bottom_banner_gradient_start: string | null;
  bottom_banner_gradient_middle: string | null;
  bottom_banner_gradient_end: string | null;
  bottom_banner_text_color: string | null;
  bottom_banner_accent_color: string | null;
  promo_video_url: string | null;
  promo_video_active: boolean;
  promo_video_position: string | null;
}

export function PromoBannerManager() {
  const [settings, setSettings] = useState<PromoBannerSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // Form state - Top banner
  const [promoText, setPromoText] = useState("");
  const [europePrice, setEuropePrice] = useState("");
  const [africaPrice, setAfricaPrice] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [linkUrl, setLinkUrl] = useState("");
  
  // Form state - Bottom banner
  const [bottomBannerText, setBottomBannerText] = useState("");
  const [bottomBannerActive, setBottomBannerActive] = useState(true);
  const [countdownEnd, setCountdownEnd] = useState("");
  
  // Color state
  const [gradientStart, setGradientStart] = useState("#dc2626");
  const [gradientMiddle, setGradientMiddle] = useState("#f97316");
  const [gradientEnd, setGradientEnd] = useState("#dc2626");
  const [textColor, setTextColor] = useState("#ffffff");
  const [accentColor, setAccentColor] = useState("#fde047");
  
  // Video promo state
  const [promoVideoUrl, setPromoVideoUrl] = useState("");
  const [promoVideoActive, setPromoVideoActive] = useState(false);
  const [promoVideoPosition, setPromoVideoPosition] = useState<"above" | "below">("above");

  const loadSettings = async () => {
    setIsLoading(true);
    // 1. Instant local storage load
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("promo_banner_settings_v1");
        if (stored) {
          const data = JSON.parse(stored);
          setSettings(data);
          setPromoText(data.promo_text || "");
          setEuropePrice(data.europe_price || "");
          setAfricaPrice(data.africa_price || "");
          setIsActive(data.is_active ?? true);
          setLinkUrl(data.link_url || "");
          setBottomBannerText(data.bottom_banner_text || "");
          setBottomBannerActive(data.bottom_banner_active ?? true);
          if (data.bottom_banner_countdown_end) {
            const date = new Date(data.bottom_banner_countdown_end);
            setCountdownEnd(date.toISOString().slice(0, 16));
          } else {
            setCountdownEnd("");
          }
          setGradientStart(data.bottom_banner_gradient_start || "#dc2626");
          setGradientMiddle(data.bottom_banner_gradient_middle || "#f97316");
          setGradientEnd(data.bottom_banner_gradient_end || "#dc2626");
          setTextColor(data.bottom_banner_text_color || "#ffffff");
          setAccentColor(data.bottom_banner_accent_color || "#fde047");
          setPromoVideoUrl(data.promo_video_url || "");
          setPromoVideoActive(data.promo_video_active ?? false);
          setPromoVideoPosition((data.promo_video_position as "above" | "below") || "above");
        }
      } catch {}
    }

    // 2. Async DB check
    try {
      const { data, error } = await supabase
        .from("promo_banner_settings")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        setSettings(data);
        setPromoText(data.promo_text || "");
        setEuropePrice(data.europe_price || "");
        setAfricaPrice(data.africa_price || "");
        setIsActive(data.is_active ?? true);
        setLinkUrl(data.link_url || "");
        setBottomBannerText(data.bottom_banner_text || "");
        setBottomBannerActive(data.bottom_banner_active ?? true);
        if (data.bottom_banner_countdown_end) {
          const date = new Date(data.bottom_banner_countdown_end);
          setCountdownEnd(date.toISOString().slice(0, 16));
        } else {
          setCountdownEnd("");
        }
        setGradientStart(data.bottom_banner_gradient_start || "#dc2626");
        setGradientMiddle(data.bottom_banner_gradient_middle || "#f97316");
        setGradientEnd(data.bottom_banner_gradient_end || "#dc2626");
        setTextColor(data.bottom_banner_text_color || "#ffffff");
        setAccentColor(data.bottom_banner_accent_color || "#fde047");
        setPromoVideoUrl(data.promo_video_url || "");
        setPromoVideoActive(data.promo_video_active ?? false);
        setPromoVideoPosition((data.promo_video_position as "above" | "below") || "above");

        if (typeof window !== "undefined") {
          localStorage.setItem("promo_banner_settings_v1", JSON.stringify(data));
        }
      }
    } catch (error) {
      console.warn("Error loading promo settings from DB:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updateData = {
        id: settings?.id && !settings.id.startsWith("local-") ? settings.id : `local-promo-${Date.now()}`,
        promo_text: promoText,
        europe_price: europePrice,
        africa_price: africaPrice,
        is_active: isActive,
        link_url: linkUrl || null,
        bottom_banner_text: bottomBannerText,
        bottom_banner_active: bottomBannerActive,
        bottom_banner_countdown_end: countdownEnd ? new Date(countdownEnd).toISOString() : null,
        bottom_banner_gradient_start: gradientStart,
        bottom_banner_gradient_middle: gradientMiddle,
        bottom_banner_gradient_end: gradientEnd,
        bottom_banner_text_color: textColor,
        bottom_banner_accent_color: accentColor,
        promo_video_url: promoVideoUrl || null,
        promo_video_active: promoVideoActive,
        promo_video_position: promoVideoPosition,
      };

      // 1. Save locally for instant reactivity and Master Admin compatibility
      if (typeof window !== "undefined") {
        localStorage.setItem("promo_banner_settings_v1", JSON.stringify(updateData));
        window.dispatchEvent(new CustomEvent("promo_banner_updated", { detail: updateData }));
      }
      setSettings(updateData as PromoBannerSettings);

      // 2. DB sync in background
      try {
        const { data: existing } = await supabase
          .from("promo_banner_settings")
          .select("id")
          .limit(1)
          .maybeSingle();

        if (existing?.id) {
          await supabase
            .from("promo_banner_settings")
            .update({ ...updateData, id: existing.id })
            .eq("id", existing.id);
        } else {
          await supabase
            .from("promo_banner_settings")
            .insert([updateData]);
        }
      } catch (dbErr) {
        console.warn("DB promo settings sync skipped or unauthenticated:", dbErr);
      }

      toast({
        title: "Enregistré avec succès !",
        description: "Les paramètres de la vidéo publicitaire et de la bannière ont été enregistrés.",
      });
    } catch (error) {
      console.error("Error saving promo settings:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer les paramètres",
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
          <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-800/50 border-gray-700 mt-6">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Megaphone className="w-5 h-5 text-amber-500" />
          Bannière Promotionnelle
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Active toggle */}
        <div className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg">
          <div>
            <Label className="text-white font-medium">Bannière active</Label>
            <p className="text-gray-400 text-sm">
              Afficher la bannière promotionnelle défilante
            </p>
          </div>
          <Switch
            checked={isActive}
            onCheckedChange={setIsActive}
            className="data-[state=checked]:bg-amber-500"
          />
        </div>

        {/* Prices */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="europe-price" className="text-white">
              Prix Europe
            </Label>
            <Input
              id="europe-price"
              value={europePrice}
              onChange={(e) => setEuropePrice(e.target.value)}
              placeholder="25€"
              className="bg-gray-700/50 border-gray-600 text-white"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="africa-price" className="text-white">
              Prix Afrique
            </Label>
            <Input
              id="africa-price"
              value={africaPrice}
              onChange={(e) => setAfricaPrice(e.target.value)}
              placeholder="35 000 FCFA"
              className="bg-gray-700/50 border-gray-600 text-white"
            />
          </div>
        </div>

        {/* Link URL */}
        <div className="space-y-2">
          <Label htmlFor="link-url" className="text-white">
            Lien de redirection (URL)
          </Label>
          <Input
            id="link-url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://..."
            className="bg-gray-700/50 border-gray-600 text-white"
          />
          <p className="text-gray-500 text-xs">
            L'URL vers laquelle les utilisateurs seront redirigés en cliquant sur la bannière
          </p>
        </div>

        {/* Promo text */}
        <div className="space-y-2">
          <Label htmlFor="promo-text" className="text-white">
            Texte de la bannière
          </Label>
          <Textarea
            id="promo-text"
            value={promoText}
            onChange={(e) => setPromoText(e.target.value)}
            placeholder="🎉 OFFRE SPÉCIALE..."
            className="bg-gray-700/50 border-gray-600 text-white min-h-[100px]"
          />
          <p className="text-gray-500 text-xs">
            Utilisez des emojis pour rendre le texte plus attrayant. Le texte défilera automatiquement.
          </p>
        </div>

        {/* Live Preview */}
        <div className="space-y-2">
          <Label className="text-white flex items-center gap-2">
            <Eye className="w-4 h-4 text-amber-500" />
            Aperçu en temps réel
          </Label>
          <div className="relative overflow-hidden rounded-lg bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 text-white shadow-lg">
            {/* Animated background effect */}
            <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.2),transparent)] animate-[shimmer_2s_infinite]" />
            
            <div className="relative flex items-center">
              {/* Scrolling container */}
              <div className="flex-1 overflow-hidden py-2.5">
                <div className="flex animate-marquee whitespace-nowrap">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3 mx-4">
                      <Crown className="w-5 h-5 text-white flex-shrink-0" />
                      <span className="text-sm font-bold tracking-wide">
                        {promoText || "Votre texte promotionnel apparaîtra ici..."}
                      </span>
                      <Sparkles className="w-5 h-5 text-white flex-shrink-0" />
                      <span className="text-sm font-bold tracking-wide">
                        {promoText || "Votre texte promotionnel apparaîtra ici..."}
                      </span>
                      <Gift className="w-5 h-5 text-white flex-shrink-0" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Decorative borders */}
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-white/50 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-white/50 to-transparent" />
            
            {/* Inactive overlay */}
            {!isActive && (
              <div className="absolute inset-0 bg-gray-900/70 flex items-center justify-center">
                <span className="text-gray-300 font-medium text-sm">Bannière désactivée</span>
              </div>
            )}
          </div>
          <p className="text-gray-500 text-xs">
            Cet aperçu montre exactement comment la bannière apparaîtra aux utilisateurs.
          </p>
        </div>

        {/* Separator */}
        <div className="border-t border-gray-600 my-6" />

        {/* Bottom Banner Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Gift className="w-5 h-5 text-red-500" />
            Bannière "PROMOTION LIMITÉE" (bas de page)
          </h3>
          
          {/* Bottom banner active toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg">
            <div>
              <Label className="text-white font-medium">Bannière du bas active</Label>
              <p className="text-gray-400 text-sm">
                Afficher la bannière fixe en bas pour les non-connectés
              </p>
            </div>
            <Switch
              checked={bottomBannerActive}
              onCheckedChange={setBottomBannerActive}
              className="data-[state=checked]:bg-red-500"
            />
          </div>

          {/* Bottom banner text */}
          <div className="space-y-2">
            <Label htmlFor="bottom-banner-text" className="text-white">
              Texte de la bannière du bas
            </Label>
            <Input
              id="bottom-banner-text"
              value={bottomBannerText}
              onChange={(e) => setBottomBannerText(e.target.value)}
              placeholder="🔥 PROMOTION LIMITÉE — Europe: 25€/semaine • Afrique: 35 000 FCFA 🔥"
              className="bg-gray-700/50 border-gray-600 text-white"
            />
            <p className="text-gray-500 text-xs">
              Ce texte apparaît en bas de l'écran de connexion avec une animation clignotante.
            </p>
          </div>

          {/* Countdown end date */}
          <div className="space-y-2">
            <Label htmlFor="countdown-end" className="text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-yellow-500" />
              Date de fin du compte à rebours
            </Label>
            <Input
              id="countdown-end"
              type="datetime-local"
              value={countdownEnd}
              onChange={(e) => setCountdownEnd(e.target.value)}
              className="bg-gray-700/50 border-gray-600 text-white"
            />
            <p className="text-gray-500 text-xs">
              Laissez vide pour désactiver le compte à rebours. Le compteur disparaît automatiquement une fois la date passée.
            </p>
          </div>

          {/* Color customization */}
          <div className="space-y-4 p-4 bg-gray-700/30 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Palette className="w-5 h-5 text-purple-400" />
              <Label className="text-white font-medium">Personnalisation des couleurs</Label>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {/* Gradient Start */}
              <div className="space-y-2">
                <Label htmlFor="gradient-start" className="text-gray-300 text-sm">
                  Dégradé (gauche)
                </Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    id="gradient-start"
                    value={gradientStart}
                    onChange={(e) => setGradientStart(e.target.value)}
                    className="w-10 h-10 rounded cursor-pointer border-2 border-gray-600"
                  />
                  <Input
                    value={gradientStart}
                    onChange={(e) => setGradientStart(e.target.value)}
                    className="bg-gray-700/50 border-gray-600 text-white text-xs flex-1"
                  />
                </div>
              </div>
              
              {/* Gradient Middle */}
              <div className="space-y-2">
                <Label htmlFor="gradient-middle" className="text-gray-300 text-sm">
                  Dégradé (centre)
                </Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    id="gradient-middle"
                    value={gradientMiddle}
                    onChange={(e) => setGradientMiddle(e.target.value)}
                    className="w-10 h-10 rounded cursor-pointer border-2 border-gray-600"
                  />
                  <Input
                    value={gradientMiddle}
                    onChange={(e) => setGradientMiddle(e.target.value)}
                    className="bg-gray-700/50 border-gray-600 text-white text-xs flex-1"
                  />
                </div>
              </div>
              
              {/* Gradient End */}
              <div className="space-y-2">
                <Label htmlFor="gradient-end" className="text-gray-300 text-sm">
                  Dégradé (droite)
                </Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    id="gradient-end"
                    value={gradientEnd}
                    onChange={(e) => setGradientEnd(e.target.value)}
                    className="w-10 h-10 rounded cursor-pointer border-2 border-gray-600"
                  />
                  <Input
                    value={gradientEnd}
                    onChange={(e) => setGradientEnd(e.target.value)}
                    className="bg-gray-700/50 border-gray-600 text-white text-xs flex-1"
                  />
                </div>
              </div>
              
              {/* Text Color */}
              <div className="space-y-2">
                <Label htmlFor="text-color" className="text-gray-300 text-sm">
                  Couleur du texte
                </Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    id="text-color"
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
                    className="w-10 h-10 rounded cursor-pointer border-2 border-gray-600"
                  />
                  <Input
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
                    className="bg-gray-700/50 border-gray-600 text-white text-xs flex-1"
                  />
                </div>
              </div>
              
              {/* Accent Color */}
              <div className="space-y-2">
                <Label htmlFor="accent-color" className="text-gray-300 text-sm">
                  Couleur des accents
                </Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    id="accent-color"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="w-10 h-10 rounded cursor-pointer border-2 border-gray-600"
                  />
                  <Input
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="bg-gray-700/50 border-gray-600 text-white text-xs flex-1"
                  />
                </div>
              </div>
            </div>
            
            <p className="text-gray-500 text-xs">
              Personnalisez le dégradé de fond, la couleur du texte et des icônes/accents.
            </p>
          </div>

          {/* Bottom banner preview */}
          <div className="space-y-2">
            <Label className="text-white flex items-center gap-2">
              <Eye className="w-4 h-4 text-red-500" />
              Aperçu bannière du bas
            </Label>
            <div 
              className="relative overflow-hidden rounded-lg shadow-lg"
              style={{ 
                background: `linear-gradient(to right, ${gradientStart}, ${gradientMiddle}, ${gradientEnd})`,
                color: textColor 
              }}
            >
              <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.2),transparent)] animate-[shimmer_1.5s_infinite]" />
              <div className="absolute inset-0 bg-white/10 animate-pulse" />
              
              <div className="relative flex flex-col items-center justify-center gap-1 py-3">
                <div className="flex items-center gap-3">
                  <Sparkles className="w-5 h-5 animate-pulse" style={{ color: accentColor }} />
                  <span className="text-sm font-bold tracking-wide uppercase animate-pulse">
                    {bottomBannerText || "Votre texte apparaîtra ici..."}
                  </span>
                  <Gift className="w-5 h-5 animate-bounce" style={{ color: accentColor }} />
                </div>
                
                {/* Preview countdown */}
                {countdownEnd && new Date(countdownEnd) > new Date() && (
                  <div className="flex items-center gap-2 text-xs font-mono bg-black/30 px-3 py-1 rounded-full">
                    <span className="font-bold" style={{ color: accentColor }}>⏱️ Offre expire dans:</span>
                    <div className="flex gap-1">
                      <span className="bg-white/20 px-2 py-0.5 rounded">00<span className="text-xs" style={{ color: accentColor }}>j</span></span>
                      <span className="bg-white/20 px-2 py-0.5 rounded">00<span className="text-xs" style={{ color: accentColor }}>h</span></span>
                      <span className="bg-white/20 px-2 py-0.5 rounded">00<span className="text-xs" style={{ color: accentColor }}>m</span></span>
                      <span className="bg-white/20 px-2 py-0.5 rounded animate-pulse">00<span className="text-xs" style={{ color: accentColor }}>s</span></span>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="relative flex flex-col items-center justify-center gap-1 py-3">
                <div className="flex items-center gap-3">
                  <Sparkles className="w-5 h-5 text-yellow-300 animate-pulse" />
                  <span className="text-sm font-bold tracking-wide uppercase animate-pulse">
                    {bottomBannerText || "Votre texte apparaîtra ici..."}
                  </span>
                  <Gift className="w-5 h-5 text-yellow-300 animate-bounce" />
                </div>
                
                {/* Preview countdown */}
                {countdownEnd && new Date(countdownEnd) > new Date() && (
                  <div className="flex items-center gap-2 text-xs font-mono bg-black/30 px-3 py-1 rounded-full">
                    <span className="text-yellow-300 font-bold">⏱️ Offre expire dans:</span>
                    <div className="flex gap-1">
                      <span className="bg-white/20 px-2 py-0.5 rounded">00<span className="text-yellow-200 text-xs">j</span></span>
                      <span className="bg-white/20 px-2 py-0.5 rounded">00<span className="text-yellow-200 text-xs">h</span></span>
                      <span className="bg-white/20 px-2 py-0.5 rounded">00<span className="text-yellow-200 text-xs">m</span></span>
                      <span className="bg-white/20 px-2 py-0.5 rounded animate-pulse">00<span className="text-yellow-200 text-xs">s</span></span>
                    </div>
                  </div>
                )}
              </div>
              
              <div 
                className="absolute top-0 left-0 right-0 h-1 animate-pulse"
                style={{ background: `linear-gradient(to right, transparent, ${accentColor}, transparent)` }}
              />
              
              {!bottomBannerActive && (
                <div className="absolute inset-0 bg-gray-900/70 flex items-center justify-center">
                  <span className="text-gray-300 font-medium text-sm">Bannière désactivée</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Separator */}
        <div className="border-t border-gray-600 my-6" />

        {/* Video Promo Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Eye className="w-5 h-5 text-blue-500" />
            Vidéo Publicitaire
          </h3>
          
          {/* Video active toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg">
            <div>
              <Label className="text-white font-medium">Vidéo pub active</Label>
              <p className="text-gray-400 text-sm">
                Afficher une vidéo promotionnelle sur la page de connexion
              </p>
            </div>
            <Switch
              checked={promoVideoActive}
              onCheckedChange={setPromoVideoActive}
              className="data-[state=checked]:bg-blue-500"
            />
          </div>

          {/* Video Position */}
          <div className="space-y-2">
            <Label className="text-white">Position de la vidéo</Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="video-position"
                  value="above"
                  checked={promoVideoPosition === "above"}
                  onChange={() => setPromoVideoPosition("above")}
                  className="w-4 h-4 text-blue-500 bg-gray-700 border-gray-600"
                />
                <span className="text-gray-300">Au-dessus du formulaire</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="video-position"
                  value="below"
                  checked={promoVideoPosition === "below"}
                  onChange={() => setPromoVideoPosition("below")}
                  className="w-4 h-4 text-blue-500 bg-gray-700 border-gray-600"
                />
                <span className="text-gray-300">En dessous du formulaire</span>
              </label>
            </div>
          </div>

          {/* Video URL */}
          <div className="space-y-2">
            <Label htmlFor="promo-video-url" className="text-white">
              Lien de la vidéo (YouTube, Vimeo, ou lien direct MP4)
            </Label>
            <Input
              id="promo-video-url"
              value={promoVideoUrl}
              onChange={(e) => setPromoVideoUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=... ou https://example.com/video.mp4"
              className="bg-gray-700/50 border-gray-600 text-white"
            />
            <p className="text-gray-500 text-xs">
              Collez l'URL YouTube, Vimeo, ou un lien direct vers un fichier MP4. La vidéo sera affichée en lecture automatique sur la page de connexion.
            </p>
          </div>

          {/* Video preview */}
          {promoVideoUrl && promoVideoActive && (
            <div className="space-y-2">
              <Label className="text-white flex items-center gap-2">
                <Eye className="w-4 h-4 text-blue-500" />
                Aperçu de la vidéo
              </Label>
              <div className="rounded-lg overflow-hidden bg-black aspect-video max-w-md">
                {promoVideoUrl.includes("youtube.com") || promoVideoUrl.includes("youtu.be") ? (
                  <iframe
                    src={`https://www.youtube.com/embed/${extractYouTubeId(promoVideoUrl)}?autoplay=0`}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : promoVideoUrl.includes("vimeo.com") ? (
                  <iframe
                    src={`https://player.vimeo.com/video/${extractVimeoId(promoVideoUrl)}`}
                    className="w-full h-full"
                    allow="autoplay; fullscreen; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <video
                    src={promoVideoUrl}
                    controls
                    className="w-full h-full"
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Enregistrer
          </Button>
          <Button
            onClick={loadSettings}
            variant="outline"
            className="border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Recharger
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

