-- Add created_by_name column to payment_requests for displaying requester name

BEGIN;

-- Add created_by_name column (請款人姓名快照)
ALTER TABLE public.payment_requests
ADD COLUMN IF NOT EXISTS created_by_name TEXT;

-- Add comment
COMMENT ON COLUMN public.payment_requests.created_by_name IS '請款人姓名（快照）';

COMMIT;
