
-- Drop all existing overly permissive policies on access_codes
DROP POLICY IF EXISTS "Anyone can read access codes" ON public.access_codes;
DROP POLICY IF EXISTS "Anyone can update access codes" ON public.access_codes;
DROP POLICY IF EXISTS "Anyone can insert access codes" ON public.access_codes;
DROP POLICY IF EXISTS "Anyone can delete access codes" ON public.access_codes;

-- Create admin-only policies for CRUD operations
CREATE POLICY "Admins can read access codes"
ON public.access_codes
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert access codes"
ON public.access_codes
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update access codes"
ON public.access_codes
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete access codes"
ON public.access_codes
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Allow anonymous users to read codes for validation purposes only
CREATE POLICY "Anonymous can validate codes"
ON public.access_codes
FOR SELECT
TO anon
USING (true);
