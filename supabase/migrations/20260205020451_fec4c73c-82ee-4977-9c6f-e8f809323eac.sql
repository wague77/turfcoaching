
-- Fix: Remove permissive SELECT policies from forum_messages and forum_reactions base tables
-- This addresses forum_messages_user_ids_exposed and forum_device_id_exposure issues
-- The public views (forum_messages_public, forum_reactions_public) will still be readable

-- Drop the permissive SELECT policies that expose device_id and user_id
DROP POLICY IF EXISTS "Anyone can read forum messages" ON public.forum_messages;
DROP POLICY IF EXISTS "Anyone can read forum messages for realtime" ON public.forum_messages;
DROP POLICY IF EXISTS "Anyone can read forum reactions" ON public.forum_reactions;

-- Keep the device-specific policies for ownership operations (already exist)
-- "Users can read own messages by device" - allows users to edit their own messages
-- "Users can update own messages by device" - allows users to update their own messages
-- "Users can delete own messages by device" - allows users to delete their own messages
-- "Admins can manage all forum messages" - allows admins full control

-- Note: The forum_messages_public and forum_reactions_public views 
-- (created in earlier migrations) correctly exclude device_id and user_id columns
-- and will still be accessible for reading forum content
