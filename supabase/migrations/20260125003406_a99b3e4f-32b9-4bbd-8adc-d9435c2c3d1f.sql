
-- Add countdown end date column for the bottom banner
ALTER TABLE public.promo_banner_settings 
ADD COLUMN bottom_banner_countdown_end TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add a comment explaining the column
COMMENT ON COLUMN public.promo_banner_settings.bottom_banner_countdown_end IS 'End date for the countdown timer on the bottom promotion banner. If null, no countdown is displayed.';
