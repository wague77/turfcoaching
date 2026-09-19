
-- Add color customization columns for the bottom banner
ALTER TABLE public.promo_banner_settings 
ADD COLUMN bottom_banner_gradient_start TEXT DEFAULT '#dc2626',
ADD COLUMN bottom_banner_gradient_middle TEXT DEFAULT '#f97316',
ADD COLUMN bottom_banner_gradient_end TEXT DEFAULT '#dc2626',
ADD COLUMN bottom_banner_text_color TEXT DEFAULT '#ffffff',
ADD COLUMN bottom_banner_accent_color TEXT DEFAULT '#fde047';

COMMENT ON COLUMN public.promo_banner_settings.bottom_banner_gradient_start IS 'Start color of the gradient (left side)';
COMMENT ON COLUMN public.promo_banner_settings.bottom_banner_gradient_middle IS 'Middle color of the gradient';
COMMENT ON COLUMN public.promo_banner_settings.bottom_banner_gradient_end IS 'End color of the gradient (right side)';
COMMENT ON COLUMN public.promo_banner_settings.bottom_banner_text_color IS 'Main text color';
COMMENT ON COLUMN public.promo_banner_settings.bottom_banner_accent_color IS 'Accent color for icons and highlights';
