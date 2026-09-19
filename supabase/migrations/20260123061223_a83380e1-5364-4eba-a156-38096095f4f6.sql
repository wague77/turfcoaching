
-- Create storage bucket for forum audio messages
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'forum-audio',
  'forum-audio',
  true,
  52428800, -- 50MB limit
  ARRAY['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/ogg', 'audio/wav']
);

-- Create policy to allow public access to audio
CREATE POLICY "Public Access for forum audio"
ON storage.objects FOR SELECT
USING (bucket_id = 'forum-audio');

-- Create policy to allow uploads
CREATE POLICY "Allow uploads for forum audio"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'forum-audio');

-- Create policy to allow deletions
CREATE POLICY "Allow deletions for forum audio"
ON storage.objects FOR DELETE
USING (bucket_id = 'forum-audio');

-- Add audio_url column to forum_messages table
ALTER TABLE public.forum_messages 
ADD COLUMN IF NOT EXISTS audio_url TEXT;
