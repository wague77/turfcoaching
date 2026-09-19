
-- Add column to link access code to email subscriber
ALTER TABLE public.email_subscribers 
ADD COLUMN access_code_id uuid REFERENCES public.access_codes(id) ON DELETE SET NULL;

-- Add RLS policy for users to check their own email approval status
CREATE POLICY "Users can check own email status"
ON public.email_subscribers
FOR SELECT
USING (email = lower(current_setting('request.jwt.claims', true)::json->>'email'));
