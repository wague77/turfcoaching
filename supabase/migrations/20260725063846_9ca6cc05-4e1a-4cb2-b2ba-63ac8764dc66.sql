
-- Fix Realtime broadcast leaks on forum_messages and forum_reactions.
-- The tables are published to supabase_realtime which relays every row change to
-- every subscriber. Restrict the publication to public-safe columns so private
-- fields (device_id, user_id) are never broadcast, matching the *_public views.

ALTER PUBLICATION supabase_realtime DROP TABLE public.forum_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.forum_messages
  (id, author_name, message, created_at, updated_at, parent_id, video_url, image_url, audio_url);

ALTER PUBLICATION supabase_realtime DROP TABLE public.forum_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.forum_reactions
  (id, message_id, emoji, created_at);

