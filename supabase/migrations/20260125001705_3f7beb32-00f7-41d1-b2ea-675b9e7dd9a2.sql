
-- Create promo_banner_settings table
CREATE TABLE public.promo_banner_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_text TEXT NOT NULL DEFAULT '🎉 OFFRE SPÉCIALE AutoQuintePro ! 🏇 Europe : 25€/semaine 💶 • Afrique : 35 000 FCFA 💰 • Accès ILLIMITÉ à toutes les fonctionnalités ⚡ • Carré Magique + IA + Analyses détaillées 🧠 • Support WhatsApp VIP 24/7 📱 • Satisfaction garantie ✅ •',
  europe_price TEXT NOT NULL DEFAULT '25€',
  africa_price TEXT NOT NULL DEFAULT '35 000 FCFA',
  is_active BOOLEAN NOT NULL DEFAULT true,
  link_url TEXT DEFAULT 'https://turfsimpoyefzp.comparo.store/service/abonnement-vip-turf-coaching',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.promo_banner_settings ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read active promo settings (for displaying banner)
CREATE POLICY "Anyone can read active promo settings"
ON public.promo_banner_settings
FOR SELECT
USING (true);

-- Only admins can insert/update/delete promo settings
CREATE POLICY "Admins can manage promo settings"
ON public.promo_banner_settings
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create trigger for updating updated_at
CREATE TRIGGER update_promo_banner_settings_updated_at
BEFORE UPDATE ON public.promo_banner_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default settings
INSERT INTO public.promo_banner_settings (promo_text, europe_price, africa_price, is_active, link_url)
VALUES (
  '🎉 OFFRE SPÉCIALE AutoQuintePro ! 🏇 Europe : 25€/semaine 💶 • Afrique : 35 000 FCFA 💰 • Accès ILLIMITÉ à toutes les fonctionnalités ⚡ • Carré Magique + IA + Analyses détaillées 🧠 • Support WhatsApp VIP 24/7 📱 • Satisfaction garantie ✅ •',
  '25€',
  '35 000 FCFA',
  true,
  'https://turfsimpoyefzp.comparo.store/service/abonnement-vip-turf-coaching'
);
