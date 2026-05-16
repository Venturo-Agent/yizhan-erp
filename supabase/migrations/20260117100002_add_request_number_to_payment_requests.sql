-- Add request_number column to payment_requests (backward compatibility alias for code)
BEGIN;

ALTER TABLE public.payment_requests
ADD COLUMN IF NOT EXISTS request_number text;

-- Set request_number to code for existing records
UPDATE public.payment_requests
SET request_number = code
WHERE request_number IS NULL;

COMMENT ON COLUMN public.payment_requests.request_number IS '請款單號（與 code 同義，向下相容）';

COMMIT;
