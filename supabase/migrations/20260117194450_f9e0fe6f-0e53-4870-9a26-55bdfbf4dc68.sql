
-- Add approval fields to email_subscribers table
ALTER TABLE public.email_subscribers 
ADD COLUMN IF NOT EXISTS is_approved boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS approved_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS approved_by uuid;

-- Update existing records to be approved by default (grandfathered in)
UPDATE public.email_subscribers SET is_approved = true WHERE is_approved IS NULL;
