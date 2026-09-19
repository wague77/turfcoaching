
-- Add session_token column to ai_sessions for token-based authentication
-- This replaces client-side password storage with server-verified tokens

ALTER TABLE public.ai_sessions 
ADD COLUMN IF NOT EXISTS session_token TEXT;

-- Create index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_ai_sessions_token ON public.ai_sessions(session_token);

-- Add unique constraint on session_token to prevent duplicates
ALTER TABLE public.ai_sessions 
ADD CONSTRAINT ai_sessions_token_unique UNIQUE (session_token);
