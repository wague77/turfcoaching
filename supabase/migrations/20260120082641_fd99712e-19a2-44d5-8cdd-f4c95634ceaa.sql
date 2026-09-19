
-- Add reappear_after_minutes column to notifications table
ALTER TABLE public.notifications 
ADD COLUMN reappear_after_minutes INTEGER DEFAULT NULL;

COMMENT ON COLUMN public.notifications.reappear_after_minutes IS 'Duration in minutes before the notification reappears after being dismissed. NULL means permanent dismissal.';
