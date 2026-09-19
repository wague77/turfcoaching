
-- Add a policy to allow all authenticated/anonymous users to read forum messages
-- This enables realtime events to be received by all users
-- The code still uses the public view for actual data display (which hides device_id)
CREATE POLICY "Anyone can read forum messages for realtime"
ON public.forum_messages
FOR SELECT
USING (true);

-- Also ensure forum_reactions can be read by everyone for realtime
-- Drop the redundant "Users can read own reactions by device" policy since "Anyone can read forum reactions" already exists
DROP POLICY IF EXISTS "Users can read own reactions by device" ON public.forum_reactions;
