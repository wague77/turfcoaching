
-- Add device_info column to store browser and OS details
ALTER TABLE public.access_codes 
ADD COLUMN IF NOT EXISTS device_info JSONB DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.access_codes.device_info IS 'Stores device details like browser, OS, and platform';
