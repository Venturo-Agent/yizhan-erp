-- Add is_special_billing column to payment_requests
BEGIN;

ALTER TABLE public.payment_requests
ADD COLUMN IF NOT EXISTS is_special_billing boolean DEFAULT false;

COMMENT ON COLUMN public.payment_requests.is_special_billing IS '是否為特殊出帳（非週四出帳）';

COMMIT;
