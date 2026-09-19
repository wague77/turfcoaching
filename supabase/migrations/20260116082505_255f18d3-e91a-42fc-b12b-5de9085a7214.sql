
-- Add user_id column to bet_distributor_history table
ALTER TABLE public.bet_distributor_history 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_bet_distributor_history_user_id ON public.bet_distributor_history(user_id);

-- Drop existing RLS policies
DROP POLICY IF EXISTS "Device can read own bet history" ON public.bet_distributor_history;
DROP POLICY IF EXISTS "Device can insert own bet history" ON public.bet_distributor_history;
DROP POLICY IF EXISTS "Device can update own bet history" ON public.bet_distributor_history;
DROP POLICY IF EXISTS "Deny anon select on bet_distributor_history" ON public.bet_distributor_history;
DROP POLICY IF EXISTS "Deny anon insert on bet_distributor_history" ON public.bet_distributor_history;
DROP POLICY IF EXISTS "Deny anon update on bet_distributor_history" ON public.bet_distributor_history;
DROP POLICY IF EXISTS "Allow authenticated users to select their own data" ON public.bet_distributor_history;
DROP POLICY IF EXISTS "Allow authenticated users to insert their own data" ON public.bet_distributor_history;
DROP POLICY IF EXISTS "Allow authenticated users to update their own data" ON public.bet_distributor_history;

-- Create new RLS policies for authenticated users
CREATE POLICY "Users can read own bet history"
ON public.bet_distributor_history
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bet history"
ON public.bet_distributor_history
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bet history"
ON public.bet_distributor_history
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own bet history"
ON public.bet_distributor_history
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
