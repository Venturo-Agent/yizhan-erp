-- Add passport_image_url column to customers table
-- This column stores the URL to the customer's passport image in Supabase storage

BEGIN;

-- Add passport_image_url column to customers
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS passport_image_url text;

-- Add comment for documentation
COMMENT ON COLUMN public.customers.passport_image_url IS 'URL to passport image stored in Supabase storage';

COMMIT;
