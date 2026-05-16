-- 收款單的 customer_id 改為可選（付款人不一定是訂單客戶）
BEGIN;

ALTER TABLE public.receipts
ALTER COLUMN customer_id DROP NOT NULL;

COMMENT ON COLUMN public.receipts.customer_id IS '客戶ID（可選，付款人不一定是訂單客戶）';

COMMIT;
