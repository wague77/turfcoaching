
-- Add target_audience column to notifications table
ALTER TABLE public.notifications 
ADD COLUMN target_audience TEXT NOT NULL DEFAULT 'all' 
CHECK (target_audience IN ('all', 'authenticated', 'unauthenticated'));
