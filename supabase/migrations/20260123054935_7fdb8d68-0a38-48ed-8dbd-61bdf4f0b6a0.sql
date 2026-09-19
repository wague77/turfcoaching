
-- Create storage bucket for forum videos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('forum-videos', 'forum-videos', true, 104857600, ARRAY['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime']);

-- Add video_url column to forum_messages
ALTER TABLE public.forum_messages ADD COLUMN video_url TEXT DEFAULT NULL;

-- Storage policies for forum videos
CREATE POLICY "Forum videos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'forum-videos');

CREATE POLICY "Anyone can upload forum videos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'forum-videos');

CREATE POLICY "Users can delete their own forum videos"
ON storage.objects FOR DELETE
USING (bucket_id = 'forum-videos');
