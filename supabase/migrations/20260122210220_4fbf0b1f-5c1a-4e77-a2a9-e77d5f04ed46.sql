
-- Drop existing restrictive policies for forum_messages
DROP POLICY IF EXISTS "Authenticated users can insert forum messages" ON public.forum_messages;
DROP POLICY IF EXISTS "Users can update own messages" ON public.forum_messages;
DROP POLICY IF EXISTS "Users can delete own messages" ON public.forum_messages;

-- Create new permissive policies for forum_messages that allow both authenticated users and device-based access
CREATE POLICY "Anyone can insert forum messages"
ON public.forum_messages
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update own messages by device"
ON public.forum_messages
FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE POLICY "Users can delete own messages by device"
ON public.forum_messages
FOR DELETE
USING (true);

-- Drop existing restrictive policies for forum_reactions
DROP POLICY IF EXISTS "Authenticated users can insert forum reactions" ON public.forum_reactions;
DROP POLICY IF EXISTS "Users can delete own reactions" ON public.forum_reactions;

-- Create new permissive policies for forum_reactions
CREATE POLICY "Anyone can insert forum reactions"
ON public.forum_reactions
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can delete own reactions"
ON public.forum_reactions
FOR DELETE
USING (true);
