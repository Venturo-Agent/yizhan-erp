-- 修正 disbursement_orders 的 code 欄位為可空
-- 因為我們現在使用 order_number 來取代 code
BEGIN;

-- 讓 code 可以為空
ALTER TABLE public.disbursement_orders
ALTER COLUMN code DROP NOT NULL;

-- 如果有舊資料沒有 order_number，從 code 複製過來
UPDATE public.disbursement_orders
SET order_number = code
WHERE order_number IS NULL AND code IS NOT NULL;

COMMIT;
