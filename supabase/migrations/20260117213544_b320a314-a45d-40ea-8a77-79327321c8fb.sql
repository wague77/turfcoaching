
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Allow insert for archiving" ON public.access_codes_history;

-- Create a more secure policy - only authenticated users can insert
CREATE POLICY "Authenticated users can archive codes"
ON public.access_codes_history
FOR INSERT
TO authenticated
WITH CHECK (true);
