-- Add display columns to payment_requests for better UI display
-- These are snapshot fields to avoid JOIN queries

BEGIN;

-- Add tour_code column (團號快照)
ALTER TABLE public.payment_requests
ADD COLUMN IF NOT EXISTS tour_code TEXT;

-- Add tour_name column (團名快照)
ALTER TABLE public.payment_requests
ADD COLUMN IF NOT EXISTS tour_name TEXT;

-- Add order_number column if not exists (訂單編號快照)
ALTER TABLE public.payment_requests
ADD COLUMN IF NOT EXISTS order_number TEXT;

-- Add comments
COMMENT ON COLUMN public.payment_requests.tour_code IS '團號快照（例：CNX241225）';
COMMENT ON COLUMN public.payment_requests.tour_name IS '團名快照';
COMMENT ON COLUMN public.payment_requests.order_number IS '訂單編號快照';

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_payment_requests_tour_code ON public.payment_requests(tour_code);

COMMIT;
