
-- Create table for email sending history
CREATE TABLE public.email_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_email text NOT NULL,
  subject text NOT NULL,
  email_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  resend_id text,
  error_message text,
  sent_at timestamp with time zone NOT NULL DEFAULT now(),
  delivered_at timestamp with time zone,
  sent_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.email_history ENABLE ROW LEVEL SECURITY;

-- Only admins can read email history
CREATE POLICY "Admins can read email history"
ON public.email_history
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can insert email history
CREATE POLICY "Admins can insert email history"
ON public.email_history
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster lookups
CREATE INDEX idx_email_history_recipient ON public.email_history(recipient_email);
CREATE INDEX idx_email_history_sent_at ON public.email_history(sent_at DESC);
