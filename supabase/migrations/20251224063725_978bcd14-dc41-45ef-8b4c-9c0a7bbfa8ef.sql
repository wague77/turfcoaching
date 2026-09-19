
-- Remove the vulnerable anonymous SELECT policy
DROP POLICY IF EXISTS "Anonymous can validate codes" ON public.access_codes;

-- Create secure validation RPC function
CREATE OR REPLACE FUNCTION public.validate_access_code(input_code TEXT)
RETURNS TABLE(valid BOOLEAN, expires_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (code.expires_at > NOW())::BOOLEAN AS valid,
    code.expires_at
  FROM public.access_codes code
  WHERE code.code = UPPER(TRIM(input_code))
  LIMIT 1;
  
  -- Return false if not found
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE::BOOLEAN, NULL::TIMESTAMPTZ;
  END IF;
END;
$$;

-- Grant execute to anonymous users for validation
GRANT EXECUTE ON FUNCTION public.validate_access_code(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.validate_access_code(TEXT) TO authenticated;
