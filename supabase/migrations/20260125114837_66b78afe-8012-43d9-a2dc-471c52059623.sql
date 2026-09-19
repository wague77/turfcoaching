
-- Add session duration column to turf_coaching_settings
ALTER TABLE public.turf_coaching_settings 
ADD COLUMN session_duration_days integer NOT NULL DEFAULT 1;
