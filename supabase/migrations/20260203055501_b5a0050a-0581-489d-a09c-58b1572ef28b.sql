
-- Fix forum storage deletion policies to admin-only
-- This prevents unauthorized deletion of forum media files

-- Fix forum-videos deletion policy (admin-only)
DROP POLICY IF EXISTS "Users can delete their own forum videos" ON storage.objects;
CREATE POLICY "Only admins can delete forum videos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'forum-videos' AND
  public.has_role(auth.uid(), 'admin')
);

-- Fix forum-images deletion policy (admin-only)
DROP POLICY IF EXISTS "Anyone can delete own forum images" ON storage.objects;
CREATE POLICY "Only admins can delete forum images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'forum-images' AND
  public.has_role(auth.uid(), 'admin')
);

-- Fix forum-audio deletion policy (admin-only)
DROP POLICY IF EXISTS "Allow deletions for forum audio" ON storage.objects;
CREATE POLICY "Only admins can delete forum audio"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'forum-audio' AND
  public.has_role(auth.uid(), 'admin')
);
