
-- Add parent_id column for thread replies
ALTER TABLE public.forum_messages 
ADD COLUMN parent_id UUID REFERENCES public.forum_messages(id) ON DELETE CASCADE;
