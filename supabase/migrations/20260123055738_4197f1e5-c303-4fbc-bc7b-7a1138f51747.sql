
-- Create storage bucket for forum images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('forum-images', 'forum-images', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

-- Create policies for forum images bucket
CREATE POLICY "Anyone can view forum images"
ON storage.objects FOR SELECT
USING (bucket_id = 'forum-images');

CREATE POLICY "Anyone can upload forum images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'forum-images');

CREATE POLICY "Anyone can delete own forum images"
ON storage.objects FOR DELETE
USING (bucket_id = 'forum-images');

-- Add image_url column to forum_messages
ALTER TABLE public.forum_messages ADD COLUMN image_url TEXT;
