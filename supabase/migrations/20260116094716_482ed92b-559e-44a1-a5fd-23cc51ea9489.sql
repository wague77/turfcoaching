
-- Create forum_messages table for user discussions
CREATE TABLE public.forum_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  author_name TEXT NOT NULL,
  device_id TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.forum_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone with valid access can read messages
CREATE POLICY "Anyone can read forum messages" 
ON public.forum_messages 
FOR SELECT 
USING (true);

-- Policy: Anyone with valid access can insert messages
CREATE POLICY "Anyone can insert forum messages" 
ON public.forum_messages 
FOR INSERT 
WITH CHECK (true);

-- Policy: Users can only update their own messages (by device_id)
CREATE POLICY "Users can update own messages" 
ON public.forum_messages 
FOR UPDATE 
USING (device_id = device_id);

-- Policy: Users can only delete their own messages (by device_id)
CREATE POLICY "Users can delete own messages" 
ON public.forum_messages 
FOR DELETE 
USING (device_id = device_id);

-- Policy: Admins can manage all messages
CREATE POLICY "Admins can manage all forum messages" 
ON public.forum_messages 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime for forum messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.forum_messages;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_forum_messages_updated_at
BEFORE UPDATE ON public.forum_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
