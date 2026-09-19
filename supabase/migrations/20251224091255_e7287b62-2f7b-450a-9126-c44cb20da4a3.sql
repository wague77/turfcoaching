
-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Anyone can delete combination history" ON public.combination_history;
DROP POLICY IF EXISTS "Anyone can insert combination history" ON public.combination_history;
DROP POLICY IF EXISTS "Anyone can read combination history" ON public.combination_history;

-- Create restrictive admin-only policies for combination_history
-- Since this app uses access codes (not user authentication), restrict to admins only
CREATE POLICY "Admins can read combination history"
ON public.combination_history
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert combination history"
ON public.combination_history
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete combination history"
ON public.combination_history
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
