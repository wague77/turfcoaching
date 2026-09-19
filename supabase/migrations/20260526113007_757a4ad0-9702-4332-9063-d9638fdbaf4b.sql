
CREATE OR REPLACE FUNCTION public.set_ai_password(new_password text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_existing_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Forbidden: admin role required';
  END IF;
  IF new_password IS NULL OR length(trim(new_password)) < 4 THEN
    RAISE EXCEPTION 'Password too short';
  END IF;

  SELECT id INTO v_existing_id FROM public.ai_settings LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.ai_settings
      SET password_hash = extensions.crypt(new_password, extensions.gen_salt('bf')),
          updated_at = now()
      WHERE id = v_existing_id;
  ELSE
    INSERT INTO public.ai_settings (password_hash) VALUES (extensions.crypt(new_password, extensions.gen_salt('bf')));
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_turf_password(new_password text, new_duration_days integer DEFAULT NULL::integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_existing_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Forbidden: admin role required';
  END IF;
  IF new_password IS NULL OR length(trim(new_password)) < 4 THEN
    RAISE EXCEPTION 'Password too short';
  END IF;

  SELECT id INTO v_existing_id FROM public.turf_coaching_settings LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.turf_coaching_settings
      SET password_hash = extensions.crypt(new_password, extensions.gen_salt('bf')),
          session_duration_days = COALESCE(new_duration_days, session_duration_days),
          updated_at = now()
      WHERE id = v_existing_id;
  ELSE
    INSERT INTO public.turf_coaching_settings (password_hash, session_duration_days)
      VALUES (extensions.crypt(new_password, extensions.gen_salt('bf')), COALESCE(new_duration_days, 1));
  END IF;
END;
$function$;
