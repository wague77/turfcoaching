
-- ================================================
-- FIX 1: Remove permissive email_subscribers policy
-- ================================================
DROP POLICY IF EXISTS "Users can check own email status" ON public.email_subscribers;

-- ================================================
-- FIX 2: Secure forum_messages UPDATE/DELETE policies
-- Replace permissive policies with device_id ownership check
-- ================================================
DROP POLICY IF EXISTS "Users can update own messages by device" ON public.forum_messages;
DROP POLICY IF EXISTS "Users can delete own messages by device" ON public.forum_messages;

-- Create restrictive UPDATE policy - only message owners can update
CREATE POLICY "Users can update own messages by device"
ON public.forum_messages
FOR UPDATE
USING (device_id = current_setting('request.headers', true)::json->>'x-device-id')
WITH CHECK (device_id = current_setting('request.headers', true)::json->>'x-device-id');

-- Create restrictive DELETE policy - only message owners can delete  
CREATE POLICY "Users can delete own messages by device"
ON public.forum_messages
FOR DELETE
USING (device_id = current_setting('request.headers', true)::json->>'x-device-id');

-- ================================================
-- FIX 3: Create public views that hide sensitive identifiers
-- ================================================

-- Drop views if they exist (in case of re-run)
DROP VIEW IF EXISTS public.forum_messages_public;
DROP VIEW IF EXISTS public.forum_reactions_public;

-- Create public view for messages - excludes user_id and device_id
CREATE VIEW public.forum_messages_public
WITH (security_invoker = on) AS
SELECT 
  id,
  author_name,
  message,
  created_at,
  updated_at,
  parent_id,
  video_url,
  image_url,
  audio_url
FROM public.forum_messages;

-- Create public view for reactions - excludes user_id and device_id
CREATE VIEW public.forum_reactions_public
WITH (security_invoker = on) AS
SELECT
  id,
  message_id,
  emoji,
  created_at
FROM public.forum_reactions;

-- Grant access to the views
GRANT SELECT ON public.forum_messages_public TO anon, authenticated;
GRANT SELECT ON public.forum_reactions_public TO anon, authenticated;

-- ================================================
-- FIX 4: Restrict direct SELECT on base forum tables
-- Replace public SELECT with ownership-based access
-- ================================================

-- Remove the public SELECT policy from forum_messages
DROP POLICY IF EXISTS "Anyone can read forum messages" ON public.forum_messages;

-- Allow users to read their own messages (for ownership checks in UI)
CREATE POLICY "Users can read own messages by device"
ON public.forum_messages
FOR SELECT
USING (device_id = current_setting('request.headers', true)::json->>'x-device-id');

-- Remove the public SELECT policy from forum_reactions
DROP POLICY IF EXISTS "Anyone can read forum reactions" ON public.forum_reactions;

-- Allow users to read their own reactions (for toggle functionality)
CREATE POLICY "Users can read own reactions by device"
ON public.forum_reactions
FOR SELECT
USING (device_id = current_setting('request.headers', true)::json->>'x-device-id');
