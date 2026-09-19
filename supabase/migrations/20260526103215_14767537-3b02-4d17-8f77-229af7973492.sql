
-- 1) AI settings
ALTER TABLE public.ai_settings ADD COLUMN IF NOT EXISTS password_hash text;
UPDATE public.ai_settings SET password_hash = extensions.crypt(password, extensions.gen_salt('bf')) WHERE password_hash IS NULL AND password IS NOT NULL;
ALTER TABLE public.ai_settings ALTER COLUMN password_hash SET NOT NULL;
ALTER TABLE public.ai_settings DROP COLUMN password;

-- 2) Turf coaching settings
ALTER TABLE public.turf_coaching_settings ADD COLUMN IF NOT EXISTS password_hash text;
UPDATE public.turf_coaching_settings SET password_hash = extensions.crypt(password, extensions.gen_salt('bf')) WHERE password_hash IS NULL AND password IS NOT NULL;
ALTER TABLE public.turf_coaching_settings ALTER COLUMN password_hash SET NOT NULL;
ALTER TABLE public.turf_coaching_settings DROP COLUMN password;

-- 3) Verifiers
CREATE OR REPLACE FUNCTION public.verify_ai_password(input_password text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.ai_settings
    WHERE password_hash = extensions.crypt(input_password, password_hash)
  );
$$;

CREATE OR REPLACE FUNCTION public.verify_turf_password(input_password text)
RETURNS TABLE(valid boolean, session_duration_days integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT
    (s.password_hash = extensions.crypt(input_password, s.password_hash)) AS valid,
    s.session_duration_days
  FROM public.turf_coaching_settings s
  LIMIT 1;
$$;

-- 4) Admin-only setters
CREATE OR REPLACE FUNCTION public.set_ai_password(new_password text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Forbidden: admin role required';
  END IF;
  IF new_password IS NULL OR length(trim(new_password)) < 4 THEN
    RAISE EXCEPTION 'Password too short';
  END IF;

  IF EXISTS (SELECT 1 FROM public.ai_settings) THEN
    UPDATE public.ai_settings
      SET password_hash = extensions.crypt(new_password, extensions.gen_salt('bf')),
          updated_at = now();
  ELSE
    INSERT INTO public.ai_settings (password_hash) VALUES (extensions.crypt(new_password, extensions.gen_salt('bf')));
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_turf_password(new_password text, new_duration_days integer DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Forbidden: admin role required';
  END IF;
  IF new_password IS NULL OR length(trim(new_password)) < 4 THEN
    RAISE EXCEPTION 'Password too short';
  END IF;

  IF EXISTS (SELECT 1 FROM public.turf_coaching_settings) THEN
    UPDATE public.turf_coaching_settings
      SET password_hash = extensions.crypt(new_password, extensions.gen_salt('bf')),
          session_duration_days = COALESCE(new_duration_days, session_duration_days),
          updated_at = now();
  ELSE
    INSERT INTO public.turf_coaching_settings (password_hash, session_duration_days)
      VALUES (extensions.crypt(new_password, extensions.gen_salt('bf')), COALESCE(new_duration_days, 1));
  END IF;
END;
$$;

-- 5) Grants
REVOKE ALL ON FUNCTION public.set_ai_password(text) FROM public, anon;
REVOKE ALL ON FUNCTION public.set_turf_password(text, integer) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.set_ai_password(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_turf_password(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_ai_password(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_turf_password(text) TO anon, authenticated;

-- 6) Hide has_role from API (still used by RLS as SECURITY DEFINER)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM public, anon, authenticated;

-- 7) Restrict storage object listing for public forum buckets (public URLs unaffected)
DROP POLICY IF EXISTS "Anyone can view forum images" ON storage.objects;
DROP POLICY IF EXISTS "Forum videos are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Public Access for forum audio" ON storage.objects;

CREATE POLICY "Admins can list forum images"
ON storage.objects FOR SELECT
USING (bucket_id = 'forum-images' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can list forum videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'forum-videos' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can list forum audio"
ON storage.objects FOR SELECT
USING (bucket_id = 'forum-audio' AND public.has_role(auth.uid(), 'admin'::app_role));
