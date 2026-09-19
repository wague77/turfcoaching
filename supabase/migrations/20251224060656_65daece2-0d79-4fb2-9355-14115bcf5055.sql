
-- Create table for saving combination history
CREATE TABLE public.combination_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bet_type TEXT NOT NULL CHECK (bet_type IN ('tierce', 'quarte', 'quinte')),
  combinations JSONB NOT NULL,
  filters JSONB NOT NULL,
  horse_count INTEGER NOT NULL,
  combination_count INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.combination_history ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read and insert (public access for simplicity since no auth)
CREATE POLICY "Anyone can read combination history"
ON public.combination_history
FOR SELECT
USING (true);

CREATE POLICY "Anyone can insert combination history"
ON public.combination_history
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can delete combination history"
ON public.combination_history
FOR DELETE
USING (true);
