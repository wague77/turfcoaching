
-- Add is_blocked column to access_codes table
ALTER TABLE public.access_codes 
ADD COLUMN is_blocked boolean NOT NULL DEFAULT false;

-- Update the validate_access_code function to check for blocked codes
CREATE OR REPLACE FUNCTION public.validate_access_code(input_code text, input_device_id text DEFAULT NULL::text)
 RETURNS TABLE(valid boolean, expires_at timestamp with time zone, device_bound boolean, device_mismatch boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_code_record RECORD;
BEGIN
  -- Find the access code
  SELECT ac.* INTO v_code_record
  FROM public.access_codes ac
  WHERE ac.code = UPPER(TRIM(input_code))
  LIMIT 1;
  
  -- Code not found
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE::BOOLEAN, NULL::TIMESTAMPTZ, FALSE::BOOLEAN, FALSE::BOOLEAN;
    RETURN;
  END IF;
  
  -- Code is blocked
  IF v_code_record.is_blocked THEN
    RETURN QUERY SELECT FALSE::BOOLEAN, v_code_record.expires_at, FALSE::BOOLEAN, FALSE::BOOLEAN;
    RETURN;
  END IF;
  
  -- Code is expired
  IF v_code_record.expires_at <= NOW() THEN
    RETURN QUERY SELECT FALSE::BOOLEAN, v_code_record.expires_at, FALSE::BOOLEAN, FALSE::BOOLEAN;
    RETURN;
  END IF;
  
  -- Code has no device bound yet - bind it to this device
  IF v_code_record.device_id IS NULL AND input_device_id IS NOT NULL THEN
    UPDATE public.access_codes 
    SET device_id = input_device_id, used_at = NOW(), is_used = TRUE
    WHERE id = v_code_record.id;
    
    RETURN QUERY SELECT TRUE::BOOLEAN, v_code_record.expires_at, TRUE::BOOLEAN, FALSE::BOOLEAN;
    RETURN;
  END IF;
  
  -- Code is already bound to a device - check if it matches
  IF v_code_record.device_id IS NOT NULL AND input_device_id IS NOT NULL THEN
    IF v_code_record.device_id = input_device_id THEN
      -- Same device, allow access
      RETURN QUERY SELECT TRUE::BOOLEAN, v_code_record.expires_at, TRUE::BOOLEAN, FALSE::BOOLEAN;
    ELSE
      -- Different device, reject
      RETURN QUERY SELECT FALSE::BOOLEAN, v_code_record.expires_at, TRUE::BOOLEAN, TRUE::BOOLEAN;
    END IF;
    RETURN;
  END IF;
  
  -- Fallback: no device_id provided, just validate normally
  RETURN QUERY SELECT TRUE::BOOLEAN, v_code_record.expires_at, (v_code_record.device_id IS NOT NULL)::BOOLEAN, FALSE::BOOLEAN;
END;
$function$;
