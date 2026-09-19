
-- Create forum_reactions table for emoji reactions
CREATE TABLE public.forum_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.forum_messages(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- Unique constraint: one device can only react with each emoji once per message
  UNIQUE(message_id, device_id, emoji)
);

-- Enable Row Level Security
ALTER TABLE public.forum_reactions ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read reactions
CREATE POLICY "Anyone can read forum reactions" 
ON public.forum_reactions 
FOR SELECT 
USING (true);

-- Policy: Anyone can insert reactions
CREATE POLICY "Anyone can insert forum reactions" 
ON public.forum_reactions 
FOR INSERT 
WITH CHECK (true);

-- Policy: Users can delete their own reactions
CREATE POLICY "Users can delete own reactions" 
ON public.forum_reactions 
FOR DELETE 
USING (true);

-- Enable realtime for reactions
ALTER PUBLICATION supabase_realtime ADD TABLE public.forum_reactions;
