
-- Create access_codes table
CREATE TABLE public.access_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  is_used BOOLEAN NOT NULL DEFAULT false
);

-- Enable Row Level Security
ALTER TABLE public.access_codes ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read codes (needed for validation)
CREATE POLICY "Anyone can read access codes"
ON public.access_codes
FOR SELECT
USING (true);

-- Allow anyone to update codes (for marking as used)
CREATE POLICY "Anyone can update access codes"
ON public.access_codes
FOR UPDATE
USING (true);

-- Allow anyone to insert codes (admin will create them)
CREATE POLICY "Anyone can insert access codes"
ON public.access_codes
FOR INSERT
WITH CHECK (true);

-- Allow anyone to delete codes
CREATE POLICY "Anyone can delete access codes"
ON public.access_codes
FOR DELETE
USING (true);
