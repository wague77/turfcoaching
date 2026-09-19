
-- Add permissive SELECT policy for forum_messages so everyone can read messages
-- (The public view already hides sensitive columns like device_id and user_id)
CREATE POLICY "Anyone can read forum messages"
ON public.forum_messages
FOR SELECT
USING (true);

-- Add permissive SELECT policy for forum_reactions so everyone can see reactions
CREATE POLICY "Anyone can read forum reactions"
ON public.forum_reactions
FOR SELECT
USING (true);
