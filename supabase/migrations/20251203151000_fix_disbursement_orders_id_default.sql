-- 修正 disbursement_orders 的 id 欄位預設值
BEGIN;

ALTER TABLE public.disbursement_orders
ALTER COLUMN id SET DEFAULT gen_random_uuid();

COMMIT;
