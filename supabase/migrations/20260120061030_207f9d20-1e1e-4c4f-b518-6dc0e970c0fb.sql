
-- Add link_url column to notifications table for clickable announcement banners
ALTER TABLE public.notifications 
ADD COLUMN link_url TEXT DEFAULT NULL;

-- Add link_text column for custom button text
ALTER TABLE public.notifications 
ADD COLUMN link_text TEXT DEFAULT NULL;
