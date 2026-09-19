

-- 1. Fix access_codes_history: restrict INSERT to admins only
DROP POLICY IF EXISTS "Authenticated users can archive codes" ON public.access_codes_history;
CREATE POLICY "Admins can archive codes" ON public.access_codes_history
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 2. Fix forum_reactions: restrict DELETE to own reactions by device_id header
DROP POLICY IF EXISTS "Anyone can delete own reactions" ON public.forum_reactions;
CREATE POLICY "Users can delete own reactions by device" ON public.forum_reactions
  FOR DELETE TO public
  USING (device_id = ((current_setting('request.headers'::text, true))::json ->> 'x-device-id'::text));

-- 3. Fix forum_messages INSERT: require device_id match on insert
DROP POLICY IF EXISTS "Anyone can insert forum messages" ON public.forum_messages;
CREATE POLICY "Anyone can insert forum messages with device" ON public.forum_messages
  FOR INSERT TO public
  WITH CHECK (
    device_id IS NOT NULL AND 
    length(device_id) > 0 AND
    author_name IS NOT NULL AND 
    length(author_name) > 0
  );

-- 4. Fix forum_reactions INSERT: require device_id and message_id
DROP POLICY IF EXISTS "Anyone can insert forum reactions" ON public.forum_reactions;
CREATE POLICY "Anyone can insert forum reactions with device" ON public.forum_reactions
  FOR INSERT TO public
  WITH CHECK (
    device_id IS NOT NULL AND 
    length(device_id) > 0 AND
    message_id IS NOT NULL
  );

-- 5. Fix email_subscribers INSERT: add basic validation
DROP POLICY IF EXISTS "Anyone can subscribe" ON public.email_subscribers;
CREATE POLICY "Anyone can subscribe with valid email" ON public.email_subscribers
  FOR INSERT TO public
  WITH CHECK (
    email IS NOT NULL AND 
    length(email) > 5 AND 
    email LIKE '%@%.%'
  );

