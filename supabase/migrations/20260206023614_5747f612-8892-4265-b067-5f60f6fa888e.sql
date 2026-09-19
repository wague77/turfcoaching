
-- Add promo video URL column to promo_banner_settings
ALTER TABLE public.promo_banner_settings 
ADD COLUMN IF NOT EXISTS promo_video_url text DEFAULT NULL;

-- Add promo video active toggle
ALTER TABLE public.promo_banner_settings 
ADD COLUMN IF NOT EXISTS promo_video_active boolean DEFAULT false;
