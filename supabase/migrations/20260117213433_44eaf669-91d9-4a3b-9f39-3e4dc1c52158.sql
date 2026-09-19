
-- Create a table to track deleted access codes history
CREATE TABLE public.access_codes_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  original_code_id UUID NOT NULL,
  code TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  was_used BOOLEAN NOT NULL DEFAULT FALSE,
  was_blocked BOOLEAN NOT NULL DEFAULT FALSE,
  device_id TEXT,
  device_info JSONB,
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_by TEXT,
  deletion_reason TEXT DEFAULT 'manual'
);

-- Enable RLS
ALTER TABLE public.access_codes_history ENABLE ROW LEVEL SECURITY;

-- Allow admins to read history (via authenticated users with admin role)
CREATE POLICY "Admins can view access codes history"
ON public.access_codes_history
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow service role to insert (for archiving)
CREATE POLICY "Allow insert for archiving"
ON public.access_codes_history
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Allow admins to delete history entries
CREATE POLICY "Admins can delete history"
ON public.access_codes_history
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
