
-- Create table for Turf-Coaching settings
CREATE TABLE public.turf_coaching_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  password text NOT NULL DEFAULT '7444Sp@',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.turf_coaching_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read the password (for validation)
CREATE POLICY "Anyone can read turf coaching settings"
ON public.turf_coaching_settings
FOR SELECT
USING (true);

-- Policy: Only admins can update
CREATE POLICY "Admins can update turf coaching settings"
ON public.turf_coaching_settings
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Policy: Only admins can insert
CREATE POLICY "Admins can insert turf coaching settings"
ON public.turf_coaching_settings
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_turf_coaching_settings_updated_at
BEFORE UPDATE ON public.turf_coaching_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default settings
INSERT INTO public.turf_coaching_settings (password) VALUES ('7444Sp@');
