
-- =====================================================
-- SECURITY FIX: Remove permissive policies from bet_distributor_history
-- =====================================================
-- The "Anyone can..." policies allow unrestricted access, overriding 
-- the proper user-scoped policies. The secure "Users can..." policies 
-- using auth.uid() = user_id will remain and properly protect the data.

DROP POLICY IF EXISTS "Anyone can read bet history" ON public.bet_distributor_history;
DROP POLICY IF EXISTS "Anyone can insert bet history" ON public.bet_distributor_history;
DROP POLICY IF EXISTS "Anyone can update bet history" ON public.bet_distributor_history;

-- =====================================================
-- SECURITY FIX: Fix forum_messages UPDATE/DELETE policies
-- =====================================================
-- The current policies use "device_id = device_id" which always evaluates to true,
-- allowing ANY user to modify ANY message. Since device_id cannot be verified via RLS
-- (it's not in the auth context), we need to add user_id column and use auth.uid().

-- Step 1: Add user_id column to forum_messages
ALTER TABLE public.forum_messages 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Step 2: Create index for performance
CREATE INDEX IF NOT EXISTS idx_forum_messages_user_id ON public.forum_messages(user_id);

-- Step 3: Drop the broken policies
DROP POLICY IF EXISTS "Users can update own messages" ON public.forum_messages;
DROP POLICY IF EXISTS "Users can delete own messages" ON public.forum_messages;

-- Step 4: Create secure policies using auth.uid()
CREATE POLICY "Users can update own messages" 
ON public.forum_messages 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own messages" 
ON public.forum_messages 
FOR DELETE 
TO authenticated
USING (auth.uid() = user_id);

-- Step 5: Update INSERT policy to require user_id
DROP POLICY IF EXISTS "Anyone can insert forum messages" ON public.forum_messages;

CREATE POLICY "Authenticated users can insert forum messages" 
ON public.forum_messages 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- SECURITY FIX: Fix forum_reactions DELETE policy
-- =====================================================
-- Similar issue: "USING (true)" allows anyone to delete any reaction

-- Step 1: Add user_id column to forum_reactions
ALTER TABLE public.forum_reactions 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Step 2: Create index for performance
CREATE INDEX IF NOT EXISTS idx_forum_reactions_user_id ON public.forum_reactions(user_id);

-- Step 3: Drop the broken policies
DROP POLICY IF EXISTS "Users can delete own reactions" ON public.forum_reactions;
DROP POLICY IF EXISTS "Anyone can insert forum reactions" ON public.forum_reactions;

-- Step 4: Create secure policies
CREATE POLICY "Authenticated users can insert forum reactions" 
ON public.forum_reactions 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own reactions" 
ON public.forum_reactions 
FOR DELETE 
TO authenticated
USING (auth.uid() = user_id);
