
-- =====================================================
-- FIX 1: Secure turf_coaching_settings password exposure
-- =====================================================

-- Create a public view that exposes only the session_duration_days (not the password)
CREATE OR REPLACE VIEW public.turf_coaching_settings_public
WITH (security_invoker = on) AS
SELECT 
  id,
  session_duration_days,
  created_at,
  updated_at
FROM public.turf_coaching_settings;

-- Drop the overly permissive SELECT policy that exposes the password
DROP POLICY IF EXISTS "Anyone can read turf coaching settings" ON public.turf_coaching_settings;

-- Add admin-only SELECT policy for base table (to access the password)
CREATE POLICY "Admins can read turf coaching settings" 
ON public.turf_coaching_settings 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- =====================================================
-- FIX 2: Secure forum_messages user_id/device_id exposure
-- =====================================================

-- Drop the overly permissive "Anyone can read" SELECT policy
DROP POLICY IF EXISTS "Anyone can read forum messages" ON public.forum_messages;

-- The existing "Users can read own messages by device" policy remains for ownership-based access
-- Admins already have ALL access via "Admins can manage all forum messages"

-- Note: The forum_messages_public view already exists and excludes user_id and device_id
-- Application code should query the public view for general display
