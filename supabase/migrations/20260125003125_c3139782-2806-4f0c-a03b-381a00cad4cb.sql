
-- Add bottom banner fields to promo_banner_settings table
ALTER TABLE public.promo_banner_settings
ADD COLUMN bottom_banner_text TEXT NOT NULL DEFAULT '🔥 PROMOTION LIMITÉE — Europe: 25€/semaine • Afrique: 35 000 FCFA 🔥',
ADD COLUMN bottom_banner_active BOOLEAN NOT NULL DEFAULT true;

-- Update the existing row with default values
UPDATE public.promo_banner_settings
SET bottom_banner_text = '🔥 PROMOTION LIMITÉE — Europe: 25€/semaine • Afrique: 35 000 FCFA 🔥',
    bottom_banner_active = true
WHERE bottom_banner_text IS NULL;
