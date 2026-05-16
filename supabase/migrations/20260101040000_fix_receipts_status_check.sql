-- 移除 receipts.status 的 CHECK 約束，改用數字狀態（0=待確認, 1=已確認）
-- 這樣和前端的 ReceiptStatus enum 保持一致
BEGIN;

-- 刪除舊的 status 約束
ALTER TABLE public.receipts
DROP CONSTRAINT IF EXISTS receipts_status_check;

-- 將現有字串狀態轉換為數字
UPDATE public.receipts SET status = '0' WHERE status = 'received' OR status = 'pending';
UPDATE public.receipts SET status = '1' WHERE status = 'confirmed';
UPDATE public.receipts SET status = '2' WHERE status = 'rejected' OR status = 'exception';

-- 如果還有不符合的，預設為 0
UPDATE public.receipts SET status = '0' WHERE status NOT IN ('0', '1', '2');

-- 新增數字狀態的 CHECK 約束
ALTER TABLE public.receipts
ADD CONSTRAINT receipts_status_check
CHECK (status IN ('0', '1', '2'));

COMMENT ON COLUMN public.receipts.status IS '狀態：0=待確認, 1=已確認, 2=異常';

COMMIT;
