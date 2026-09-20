
import { useState, useEffect } from "react";
import { X, Sparkles, Crown, Gift } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

interface PromoBannerSettings {
  id: string;
  promo_text: string;
  europe_price: string;
  africa_price: string;
  is_active: boolean;
  link_url: string | null;
}

interface PromoScrollBannerProps {
  onClose?: () => void;
}

export function PromoScrollBanner({ onClose }: PromoScrollBannerProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);
  const [settings, setSettings] = useState<PromoBannerSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if banner was dismissed recently (within 30 minutes)
    const dismissedAt = localStorage.getItem('promo_banner_dismissed');
    if (dismissedAt) {
      const dismissedTime = parseInt(dismissedAt, 10);
      const thirtyMinutes = 30 * 60 * 1000;
      if (Date.now() - dismissedTime < thirtyMinutes) {
        setIsDismissed(true);
      }
    }
  }, []);

  useEffect(() => {
    const loadSettings = async () => {
      // 1. Check local storage first
      if (typeof window !== "undefined") {
        try {
          const stored = localStorage.getItem("promo_banner_settings_v1");
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed.is_active ?? true) {
              setSettings(parsed);
              setIsLoading(false);
            }
          }
        } catch {}
      }

      // 2. Check DB
      try {
        const { data, error } = await supabase
          .from("promo_banner_settings")
          .select("*")
          .limit(1)
          .maybeSingle();

        if (data && (data.is_active ?? true)) {
          setSettings(data);
          if (typeof window !== "undefined") {
            localStorage.setItem("promo_banner_settings_v1", JSON.stringify(data));
          }
        }
      } catch (error) {
        console.error("Error loading promo settings:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (!isDismissed) {
      loadSettings();
    }

    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && (customEvent.detail.is_active ?? true)) {
        setSettings(customEvent.detail);
        setIsLoading(false);
      } else {
        loadSettings();
      }
    };

    window.addEventListener("promo_banner_updated", handleUpdate);
    return () => {
      window.removeEventListener("promo_banner_updated", handleUpdate);
    };
  }, [isDismissed]);

  const handleClose = () => {
    setIsVisible(false);
    localStorage.setItem('promo_banner_dismissed', Date.now().toString());
    onClose?.();
  };

  // Don't show if dismissed, not visible, loading, or no active settings
  if (isDismissed || !isVisible || isLoading || !settings) return null;

  const promoText = settings.promo_text;
  const linkUrl = settings.link_url || "https://turfsimpoyefzp.comparo.store/service/abonnement-vip-turf-coaching";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: "auto", opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        className="relative overflow-hidden bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 text-white shadow-lg"
      >
        {/* Animated background effect */}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.2),transparent)] animate-[shimmer_2s_infinite]" />
        
        <div className="relative flex items-center">
          {/* Close button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleClose();
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-full bg-black/20 hover:bg-black/40 transition-colors"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Scrolling container - clickable link */}
          <a 
            href={linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 overflow-hidden py-2.5 pr-10 cursor-pointer hover:opacity-90 transition-opacity"
          >
            <div className="flex animate-marquee whitespace-nowrap">
              {/* Duplicate content for seamless loop */}
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 mx-4">
                  <Crown className="w-5 h-5 text-white flex-shrink-0" />
                  <span className="text-sm md:text-base font-bold tracking-wide">
                    {promoText}
                  </span>
                  <Sparkles className="w-5 h-5 text-white flex-shrink-0" />
                  <span className="text-sm md:text-base font-bold tracking-wide">
                    {promoText}
                  </span>
                  <Gift className="w-5 h-5 text-white flex-shrink-0" />
                </div>
              ))}
            </div>
          </a>
        </div>

        {/* Decorative borders */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-white/50 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-white/50 to-transparent" />
      </motion.div>
    </AnimatePresence>
  );
}

