
-- Create table to track AI sessions
CREATE TABLE public.ai_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id TEXT NOT NULL,
  device_info JSONB,
  session_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  session_expiry TIMESTAMP WITH TIME ZONE NOT NULL,
  last_used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_blocked BOOLEAN NOT NULL DEFAULT false,
  blocked_at TIMESTAMP WITH TIME ZONE,
  blocked_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(device_id)
);

-- Enable RLS
ALTER TABLE public.ai_sessions ENABLE ROW LEVEL SECURITY;

-- Admins can manage all AI sessions
CREATE POLICY "Admins can manage AI sessions"
ON public.ai_sessions
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_ai_sessions_updated_at
BEFORE UPDATE ON public.ai_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_ai_sessions_device_id ON public.ai_sessions(device_id);
CREATE INDEX idx_ai_sessions_is_blocked ON public.ai_sessions(is_blocked);
