
import { useState, useEffect, createContext, useContext } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Lock, AlertTriangle, Loader2, LogOut, CreditCard, Crown, Sparkles, Gift, MessageCircle, Video } from "lucide-react";
import { validateAccessCode } from "@/lib/access-codes";
import { toast } from "@/hooks/use-toast";
import { NotificationBanner } from "@/components/NotificationBanner";
import { PromoScrollBanner } from "@/components/PromoScrollBanner";
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

// Configuration - Change this value as needed
const DEADLINE = new Date("4000-03-31T23:59:59"); // Deadline after which access is blocked

// Context to share expiration date with children
interface AccessContextType {
  expiresAt: string | null;
  daysRemaining: number | null;
  signOut: () => void;
}

const AccessContext = createContext<AccessContextType>({
  expiresAt: null,
  daysRemaining: null,
  signOut: () => {},
});

export const useAccessInfo = () => useContext(AccessContext);

interface AccessGateProps {
  children: React.ReactNode;
}

export const AccessGate = ({ children }: AccessGateProps) => {
  const [inputCode, setInputCode] = useState("");
  const [error, setError] = useState("");
  const [isExpired, setIsExpired] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [accessCodeValidated, setAccessCodeValidated] = useState(false);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  // Bottom banner settings from database
  const [bottomBannerText, setBottomBannerText] = useState(
    "🔥 PROMOTION LIMITÉE — Europe: 25€/semaine • Afrique: 35 000 FCFA 🔥",
  );
  const [bottomBannerActive, setBottomBannerActive] = useState(true);
  const [bannerLinkUrl, setBannerLinkUrl] = useState("https://my.moneyfusion.net/6981c32afa6969620bb09f4f");
  const [countdownEnd, setCountdownEnd] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(
    null,
  );

  // Color settings
  const [gradientStart, setGradientStart] = useState("#dc2626");
  const [gradientMiddle, setGradientMiddle] = useState("#f97316");
  const [gradientEnd, setGradientEnd] = useState("#dc2626");
  const [textColor, setTextColor] = useState("#ffffff");
  const [accentColor, setAccentColor] = useState("#fde047");
  
  // Video promo settings
  const [promoVideoUrl, setPromoVideoUrl] = useState<string | null>(null);
  const [promoVideoActive, setPromoVideoActive] = useState(false);
  const [promoVideoPosition, setPromoVideoPosition] = useState<"above" | "below">("above");

  const daysRemaining = expiresAt
    ? Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  // Revalidate access code periodically
  const revalidateAccess = async () => {
    const storedCode = sessionStorage.getItem("racing_access_code");
    if (!storedCode) return;

    try {
      const result = await validateAccessCode(storedCode);
      if (!result.valid) {
        console.log("Access code revoked - forcing logout");
        toast({
          variant: "destructive",
          title: "Accès révoqué",
          description: "Votre code d'accès a été désactivé ou supprimé. Vous allez être déconnecté.",
        });
        setTimeout(() => {
          handleSignOut();
        }, 3000);
      } else if (result.expiresAt) {
        setExpiresAt(result.expiresAt);
        sessionStorage.setItem("racing_access_expires_at", result.expiresAt);
      }
    } catch (err) {
      console.error("Error revalidating access:", err);
    }
  };

  // Load bottom banner & promo video settings
  useEffect(() => {
    const applyData = (data: any) => {
      if (!data) return;
      if (data.bottom_banner_text) setBottomBannerText(data.bottom_banner_text);
      if (data.bottom_banner_active !== undefined) setBottomBannerActive(data.bottom_banner_active);
      if (data.link_url) setBannerLinkUrl(data.link_url);
      if (data.bottom_banner_countdown_end !== undefined) setCountdownEnd(data.bottom_banner_countdown_end);
      if (data.bottom_banner_gradient_start) setGradientStart(data.bottom_banner_gradient_start);
      if (data.bottom_banner_gradient_middle) setGradientMiddle(data.bottom_banner_gradient_middle);
      if (data.bottom_banner_gradient_end) setGradientEnd(data.bottom_banner_gradient_end);
      if (data.bottom_banner_text_color) setTextColor(data.bottom_banner_text_color);
      if (data.bottom_banner_accent_color) setAccentColor(data.bottom_banner_accent_color);
      if (data.promo_video_url !== undefined) setPromoVideoUrl(data.promo_video_url || null);
      if (data.promo_video_active !== undefined) setPromoVideoActive(data.promo_video_active);
      if (data.promo_video_position) setPromoVideoPosition(data.promo_video_position as "above" | "below");
    };

    const loadBannerSettings = async () => {
      // 1. Check local storage first
      if (typeof window !== "undefined") {
        try {
          const stored = localStorage.getItem("promo_banner_settings_v1");
          if (stored) {
            applyData(JSON.parse(stored));
          }
        } catch {}
      }

      // 2. Fetch from DB
      try {
        const { data, error } = await supabase
          .from("promo_banner_settings")
          .select(
            "bottom_banner_text, bottom_banner_active, link_url, bottom_banner_countdown_end, bottom_banner_gradient_start, bottom_banner_gradient_middle, bottom_banner_gradient_end, bottom_banner_text_color, bottom_banner_accent_color, promo_video_url, promo_video_active, promo_video_position",
          )
          .limit(1)
          .maybeSingle();

        if (!error && data) {
          applyData(data);
          if (typeof window !== "undefined") {
            localStorage.setItem("promo_banner_settings_v1", JSON.stringify(data));
          }
        }
      } catch (err) {
        console.error("Error loading banner settings:", err);
      }
    };

    loadBannerSettings();

    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        applyData(customEvent.detail);
      } else {
        loadBannerSettings();
      }
    };

    window.addEventListener("promo_banner_updated", handleUpdate);
    return () => {
      window.removeEventListener("promo_banner_updated", handleUpdate);
    };
  }, []);

  // Countdown timer logic
  useEffect(() => {
    if (!countdownEnd) {
      setCountdown(null);
      return;
    }

    const endDate = new Date(countdownEnd);

    const updateCountdown = () => {
      const now = new Date();
      const diff = endDate.getTime() - now.getTime();

      if (diff <= 0) {
        setCountdown(null);
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setCountdown({ days, hours, minutes, seconds });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [countdownEnd]);

  useEffect(() => {
    // Check if deadline has passed
    const now = new Date();
    if (now > DEADLINE) {
      setIsExpired(true);
      setIsLoading(false);
      return;
    }

    // Check if access code is already validated in session
    const storedAuth = sessionStorage.getItem("racing_access_authenticated");
    const storedExpires = sessionStorage.getItem("racing_access_expires_at");
    if (storedAuth === "true" && storedExpires) {
      setAccessCodeValidated(true);
      setExpiresAt(storedExpires);
    }

    setIsLoading(false);
  }, []);

  // Periodic revalidation every 10 seconds when access code is validated
  useEffect(() => {
    if (!accessCodeValidated) return;

    // Revalidate immediately on mount
    revalidateAccess();

    // Then check every 10 seconds for faster access revocation
    const interval = setInterval(revalidateAccess, 10000);

    return () => clearInterval(interval);
  }, [accessCodeValidated]);

  const handleSignOut = () => {
    sessionStorage.removeItem("racing_access_authenticated");
    sessionStorage.removeItem("racing_access_expires_at");
    sessionStorage.removeItem("racing_access_code");
    setAccessCodeValidated(false);
    setExpiresAt(null);
    setInputCode("");
  };

  const handleAccessCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsValidating(true);

    try {
      // Sanitize input: only allow alphanumeric characters
      const sanitizedCode = inputCode.replace(/[^a-zA-Z0-9]/g, '').substring(0, 12);
      const result = await validateAccessCode(sanitizedCode);
      if (result.valid && result.expiresAt) {
        sessionStorage.setItem("racing_access_authenticated", "true");
        sessionStorage.setItem("racing_access_expires_at", result.expiresAt);
        sessionStorage.setItem("racing_access_code", inputCode.toUpperCase().trim());
        setAccessCodeValidated(true);
        setExpiresAt(result.expiresAt);
      } else if (result.deviceMismatch) {
        setError("Ce code d'accès est déjà utilisé sur un autre appareil");
      } else {
        setError("Code d'accès invalide ou expiré");
      }
    } catch (err) {
      setError("Erreur de connexion. Veuillez réessayer.");
    } finally {
      setIsValidating(false);
    }
  };

  // Show loading
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  // Block access if deadline has passed
  if (isExpired) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-gray-800/50 border-red-500/50 backdrop-blur-sm">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <CardTitle className="text-2xl text-red-400">Accès Expiré</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-400 mb-4">
              La période d'accès à cette application a expiré le{" "}
              <span className="text-white font-semibold">
                {DEADLINE.toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </p>
            <p className="text-gray-500 text-sm">Veuillez contacter l'administrateur pour renouveler votre accès.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show access code form if not validated
  if (!accessCodeValidated) {
    const vipCoachingUrl = "https://my.moneyfusion.net/6981c32afa6969620bb09f4f";

    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col">
        {/* Top scrolling promo banner */}
        <PromoScrollBanner />

        <NotificationBanner isAuthenticated={false} />

        {/* WhatsApp floating button - desktop only with attention-grabbing animation */}
        <a
          href="https://chat.whatsapp.com/ExGwEiwfRBZ9CT9D15bpsy"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden md:flex fixed top-24 right-4 z-50 items-center gap-2 px-4 py-3 rounded-full bg-green-500 hover:bg-green-600 text-white transition-all duration-300 hover:scale-110 animate-[bounce_2s_ease-in-out_infinite]"
          style={{
            boxShadow: "0 0 20px rgba(34, 197, 94, 0.6), 0 0 40px rgba(34, 197, 94, 0.3)",
          }}
        >
          <div className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-30" />
          <MessageCircle className="w-5 h-5 relative z-10 animate-pulse" />
          <span className="text-sm font-medium relative z-10">Contactez-moi</span>
        </a>

        {/* Promo Video Section - Above */}
        {promoVideoActive && promoVideoUrl && promoVideoPosition === "above" && (
          <div className="w-full max-w-2xl mx-auto px-4 mb-4">
            <div className="rounded-xl overflow-hidden shadow-2xl border border-amber-500/30 bg-black">
              {promoVideoUrl.includes("youtube.com") || promoVideoUrl.includes("youtu.be") ? (
                <div className="aspect-video">
                  <iframe
                    src={`https://www.youtube.com/embed/${extractYouTubeId(promoVideoUrl)}?autoplay=1&mute=1&loop=1&playlist=${extractYouTubeId(promoVideoUrl)}`}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : promoVideoUrl.includes("vimeo.com") ? (
                <div className="aspect-video">
                  <iframe
                    src={`https://player.vimeo.com/video/${extractVimeoId(promoVideoUrl)}?autoplay=1&muted=1&loop=1`}
                    className="w-full h-full"
                    allow="autoplay; fullscreen; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : (
                <video
                  src={promoVideoUrl}
                  autoPlay
                  muted
                  loop
                  playsInline
                  controls
                  className="w-full aspect-video object-cover"
                />
              )}
            </div>
          </div>
        )}

        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-gray-800/50 border-amber-500/30 backdrop-blur-sm">
            {/* Subscription Banner */}
            <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 p-4 rounded-t-lg">
              <div className="text-center">
                <p className="text-white font-bold text-lg mb-1">🏆 VIP Turf Coaching</p>
                <p className="text-emerald-100 text-sm mb-3">Coaching personnalisé et analyses exclusives</p>
                <a
                  href={vipCoachingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-6 py-2 rounded-md bg-amber-600 hover:bg-amber-700 text-white font-semibold transition-colors"
                >
                  <CreditCard className="w-5 h-5" />
                  Rejoindre le VIP
                </a>
              </div>
            </div>

            <CardHeader className="text-center pt-6">
              <div className="mx-auto w-20 h-20 rounded-2xl overflow-hidden border-2 border-amber-500/60 shadow-[0_0_20px_rgba(245,158,11,0.4)] mb-3">
                <img src="/logo.jpg" alt="Turf Coaching System Emblem" className="w-full h-full object-cover" />
              </div>
              <CardTitle className="text-2xl font-bold text-white">TURF COACHING SYSTEM</CardTitle>
              <p className="text-gray-400 mt-1 text-sm">Entrez votre code d'accès pour continuer</p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAccessCodeSubmit} className="space-y-4">
                <div>
                  <Input
                    type="password"
                    placeholder="Code d'accès"
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value)}
                    className="bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-500"
                    disabled={isValidating}
                  />
                  {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
                </div>
                <Button
                  type="submit"
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                  disabled={isValidating}
                >
                  {isValidating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Vérification...
                    </>
                  ) : (
                    "Accéder"
                  )}
                </Button>
              </form>

              <p className="text-gray-500 text-xs text-center mt-4">
                Accès valide jusqu'au{" "}
                {DEADLINE.toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Promo Video Section - Below */}
        {promoVideoActive && promoVideoUrl && promoVideoPosition === "below" && (
          <div className="w-full max-w-2xl mx-auto px-4 mb-20">
            <div className="rounded-xl overflow-hidden shadow-2xl border border-amber-500/30 bg-black">
              {promoVideoUrl.includes("youtube.com") || promoVideoUrl.includes("youtu.be") ? (
                <div className="aspect-video">
                  <iframe
                    src={`https://www.youtube.com/embed/${extractYouTubeId(promoVideoUrl)}?autoplay=1&mute=1&loop=1&playlist=${extractYouTubeId(promoVideoUrl)}`}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : promoVideoUrl.includes("vimeo.com") ? (
                <div className="aspect-video">
                  <iframe
                    src={`https://player.vimeo.com/video/${extractVimeoId(promoVideoUrl)}?autoplay=1&muted=1&loop=1`}
                    className="w-full h-full"
                    allow="autoplay; fullscreen; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : (
                <video
                  src={promoVideoUrl}
                  autoPlay
                  muted
                  loop
                  playsInline
                  controls
                  className="w-full aspect-video object-cover"
                />
              )}
            </div>
          </div>
        )}

        {/* Bottom fixed "PROMOTION LIMITÉE" banner with blink animation */}
        {bottomBannerActive && (
          <a
            href={bannerLinkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="fixed bottom-0 left-0 right-0 z-50 animate-[blink-glow_1.5s_ease-in-out_infinite]"
          >
            <div
              className="relative overflow-hidden py-3"
              style={{
                background: `linear-gradient(to right, ${gradientStart}, ${gradientMiddle}, ${gradientEnd})`,
                color: textColor,
                boxShadow: `0 -4px 20px ${gradientStart}80`,
              }}
            >
              {/* Animated background effect */}
              <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.3),transparent)] animate-[shimmer_1.5s_infinite]" />

              {/* Pulsing overlay for extra attention */}
              <div className="absolute inset-0 bg-white/10 animate-pulse" />

              <div className="relative flex flex-col items-center justify-center gap-1 py-1">
                <div className="flex items-center gap-3">
                  <Sparkles className="w-5 h-5 animate-[spin_3s_linear_infinite]" style={{ color: accentColor }} />
                  <span className="text-sm md:text-base font-bold tracking-wide uppercase animate-pulse">
                    {bottomBannerText}
                  </span>
                  <Gift className="w-5 h-5 animate-bounce" style={{ color: accentColor }} />
                </div>

                {/* Countdown timer */}
                {countdown && (
                  <div className="flex items-center gap-2 text-xs md:text-sm font-mono bg-black/30 px-3 py-1 rounded-full">
                    <span className="font-bold" style={{ color: accentColor }}>
                      ⏱️ Offre expire dans:
                    </span>
                    <div className="flex gap-1">
                      {countdown.days > 0 && (
                        <span className="bg-white/20 px-2 py-0.5 rounded">
                          {countdown.days}
                          <span className="text-xs" style={{ color: accentColor }}>
                            j
                          </span>
                        </span>
                      )}
                      <span className="bg-white/20 px-2 py-0.5 rounded">
                        {String(countdown.hours).padStart(2, "0")}
                        <span className="text-xs" style={{ color: accentColor }}>
                          h
                        </span>
                      </span>
                      <span className="bg-white/20 px-2 py-0.5 rounded">
                        {String(countdown.minutes).padStart(2, "0")}
                        <span className="text-xs" style={{ color: accentColor }}>
                          m
                        </span>
                      </span>
                      <span className="bg-white/20 px-2 py-0.5 rounded animate-pulse">
                        {String(countdown.seconds).padStart(2, "0")}
                        <span className="text-xs" style={{ color: accentColor }}>
                          s
                        </span>
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Decorative borders with glow */}
              <div
                className="absolute top-0 left-0 right-0 h-1 animate-pulse"
                style={{ background: `linear-gradient(to right, transparent, ${accentColor}, transparent)` }}
              />
              <div
                className="absolute bottom-0 left-0 right-0 h-0.5"
                style={{ background: `linear-gradient(to right, transparent, ${accentColor}80, transparent)` }}
              />
            </div>
          </a>
        )}
      </div>
    );
  }

  // Access code validated - show content
  return (
    <AccessContext.Provider value={{ expiresAt, daysRemaining, signOut: handleSignOut }}>
      {children}
    </AccessContext.Provider>
  );
};

