-- 修正 receipts.payment_method 的 CHECK 約束，加入 linkpay
BEGIN;

-- 先刪除舊的約束
ALTER TABLE public.receipts
DROP CONSTRAINT IF EXISTS receipts_payment_method_check;

-- 先修正現有資料，確保 payment_method 值符合新約束
-- 根據 receipt_type 更新 payment_method
UPDATE public.receipts SET payment_method = 'transfer' WHERE receipt_type = 0 AND (payment_method IS NULL OR payment_method NOT IN ('cash', 'transfer', 'card', 'check', 'linkpay'));
UPDATE public.receipts SET payment_method = 'cash' WHERE receipt_type = 1 AND (payment_method IS NULL OR payment_method NOT IN ('cash', 'transfer', 'card', 'check', 'linkpay'));
UPDATE public.receipts SET payment_method = 'card' WHERE receipt_type = 2 AND (payment_method IS NULL OR payment_method NOT IN ('cash', 'transfer', 'card', 'check', 'linkpay'));
UPDATE public.receipts SET payment_method = 'check' WHERE receipt_type = 3 AND (payment_method IS NULL OR payment_method NOT IN ('cash', 'transfer', 'card', 'check', 'linkpay'));
UPDATE public.receipts SET payment_method = 'linkpay' WHERE receipt_type = 4 AND (payment_method IS NULL OR payment_method NOT IN ('cash', 'transfer', 'card', 'check', 'linkpay'));

-- 如果還有其他不符合的資料，預設設為 transfer
UPDATE public.receipts SET payment_method = 'transfer' WHERE payment_method IS NULL OR payment_method NOT IN ('cash', 'transfer', 'card', 'check', 'linkpay');

-- 建立新的約束（包含 linkpay）
ALTER TABLE public.receipts
ADD CONSTRAINT receipts_payment_method_check
CHECK (payment_method IN ('cash', 'transfer', 'card', 'check', 'linkpay'));

COMMIT;
