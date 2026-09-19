

-- Add multi-device setting to app
CREATE TABLE IF NOT EXISTS public.app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  multi_device_enabled boolean NOT NULL DEFAULT false,
  max_devices_per_code integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can read/update
CREATE POLICY "Admins can manage app settings" ON public.app_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Allow anonymous read for the multi_device setting (needed by RPC)
CREATE POLICY "Anyone can read app settings" ON public.app_settings
  FOR SELECT USING (true);

-- Insert default row
INSERT INTO public.app_settings (multi_device_enabled, max_devices_per_code) VALUES (false, 1);

-- Add device_id_2 to access_codes
ALTER TABLE public.access_codes ADD COLUMN IF NOT EXISTS device_id_2 text;

-- Update validate_access_code to support 2 devices
CREATE OR REPLACE FUNCTION public.validate_access_code(input_code text, input_device_id text DEFAULT NULL::text)
 RETURNS TABLE(valid boolean, expires_at timestamp with time zone, device_bound boolean, device_mismatch boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_code_record RECORD;
  v_random_delay NUMERIC;
  v_multi_device boolean;
BEGIN
  -- Add random delay (10-50ms) to normalize timing
  v_random_delay := 0.01 + (random() * 0.04);
  PERFORM pg_sleep(v_random_delay);

  -- Check multi-device setting
  SELECT multi_device_enabled INTO v_multi_device
  FROM public.app_settings
  LIMIT 1;

  IF v_multi_device IS NULL THEN
    v_multi_device := false;
  END IF;

  -- Find the access code
  SELECT ac.* INTO v_code_record
  FROM public.access_codes ac
  WHERE ac.code = UPPER(TRIM(input_code))
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE::BOOLEAN, NULL::TIMESTAMPTZ, FALSE::BOOLEAN, FALSE::BOOLEAN;
    RETURN;
  END IF;
  
  IF v_code_record.is_blocked THEN
    RETURN QUERY SELECT FALSE::BOOLEAN, v_code_record.expires_at, FALSE::BOOLEAN, FALSE::BOOLEAN;
    RETURN;
  END IF;
  
  IF v_code_record.expires_at <= NOW() THEN
    RETURN QUERY SELECT FALSE::BOOLEAN, v_code_record.expires_at, FALSE::BOOLEAN, FALSE::BOOLEAN;
    RETURN;
  END IF;

  -- No device_id provided, just validate
  IF input_device_id IS NULL THEN
    RETURN QUERY SELECT TRUE::BOOLEAN, v_code_record.expires_at, (v_code_record.device_id IS NOT NULL)::BOOLEAN, FALSE::BOOLEAN;
    RETURN;
  END IF;

  -- MULTI-DEVICE MODE (2 devices allowed)
  IF v_multi_device THEN
    -- Check if this device matches device_id or device_id_2
    IF v_code_record.device_id IS NULL THEN
      -- No device bound yet, bind to slot 1
      UPDATE public.access_codes 
      SET device_id = input_device_id, used_at = NOW(), is_used = TRUE
      WHERE id = v_code_record.id;
      RETURN QUERY SELECT TRUE::BOOLEAN, v_code_record.expires_at, TRUE::BOOLEAN, FALSE::BOOLEAN;
      RETURN;
    END IF;

    IF v_code_record.device_id = input_device_id THEN
      -- Matches slot 1
      RETURN QUERY SELECT TRUE::BOOLEAN, v_code_record.expires_at, TRUE::BOOLEAN, FALSE::BOOLEAN;
      RETURN;
    END IF;

    IF v_code_record.device_id_2 IS NULL THEN
      -- Slot 2 is free, bind it
      UPDATE public.access_codes 
      SET device_id_2 = input_device_id
      WHERE id = v_code_record.id;
      RETURN QUERY SELECT TRUE::BOOLEAN, v_code_record.expires_at, TRUE::BOOLEAN, FALSE::BOOLEAN;
      RETURN;
    END IF;

    IF v_code_record.device_id_2 = input_device_id THEN
      -- Matches slot 2
      RETURN QUERY SELECT TRUE::BOOLEAN, v_code_record.expires_at, TRUE::BOOLEAN, FALSE::BOOLEAN;
      RETURN;
    END IF;

    -- Both slots taken by other devices
    RETURN QUERY SELECT FALSE::BOOLEAN, v_code_record.expires_at, TRUE::BOOLEAN, TRUE::BOOLEAN;
    RETURN;

  ELSE
    -- SINGLE DEVICE MODE (original behavior)
    IF v_code_record.device_id IS NULL THEN
      UPDATE public.access_codes 
      SET device_id = input_device_id, used_at = NOW(), is_used = TRUE
      WHERE id = v_code_record.id;
      RETURN QUERY SELECT TRUE::BOOLEAN, v_code_record.expires_at, TRUE::BOOLEAN, FALSE::BOOLEAN;
      RETURN;
    END IF;

    IF v_code_record.device_id = input_device_id THEN
      RETURN QUERY SELECT TRUE::BOOLEAN, v_code_record.expires_at, TRUE::BOOLEAN, FALSE::BOOLEAN;
    ELSE
      RETURN QUERY SELECT FALSE::BOOLEAN, v_code_record.expires_at, TRUE::BOOLEAN, TRUE::BOOLEAN;
    END IF;
    RETURN;
  END IF;
END;
$function$;

