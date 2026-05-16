-- 為出納單新增 created_by 欄位
BEGIN;

ALTER TABLE public.disbursement_orders
ADD COLUMN IF NOT EXISTS created_by UUID;

COMMENT ON COLUMN public.disbursement_orders.created_by IS '建立者 ID';

COMMIT;
