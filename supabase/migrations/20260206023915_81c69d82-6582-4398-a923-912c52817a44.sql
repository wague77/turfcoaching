
-- Add promo video position column to promo_banner_settings
-- Values: 'above' (default) or 'below'
ALTER TABLE public.promo_banner_settings 
ADD COLUMN IF NOT EXISTS promo_video_position text DEFAULT 'above';
