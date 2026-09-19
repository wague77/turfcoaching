
-- Créer la fonction update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Table pour stocker l'historique du répartiteur de mises par device
CREATE TABLE public.bet_distributor_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id text NOT NULL,
  history_data jsonb NOT NULL DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(device_id)
);

-- Enable RLS
ALTER TABLE public.bet_distributor_history ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read bet history
CREATE POLICY "Anyone can read bet history" 
ON public.bet_distributor_history 
FOR SELECT 
USING (true);

-- Policy: Anyone can insert bet history
CREATE POLICY "Anyone can insert bet history" 
ON public.bet_distributor_history 
FOR INSERT 
WITH CHECK (true);

-- Policy: Anyone can update bet history
CREATE POLICY "Anyone can update bet history" 
ON public.bet_distributor_history 
FOR UPDATE 
USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_bet_distributor_history_updated_at
BEFORE UPDATE ON public.bet_distributor_history
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
