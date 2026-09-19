
-- Fix email_subscribers RLS: Restrict SELECT to admins only and add UPDATE/DELETE policies
-- First drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Anyone can check subscription" ON public.email_subscribers;

-- Create admin-only SELECT policy
CREATE POLICY "Admins can read email subscribers"
ON public.email_subscribers
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to update subscriber records
CREATE POLICY "Admins can update email subscribers"
ON public.email_subscribers
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete subscriber records
CREATE POLICY "Admins can delete email subscribers"
ON public.email_subscribers
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
