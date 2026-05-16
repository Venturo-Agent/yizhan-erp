-- 為收款單新增支票兌現日期欄位
BEGIN;

ALTER TABLE public.receipts
ADD COLUMN IF NOT EXISTS check_date date;

COMMENT ON COLUMN public.receipts.check_date IS '支票兌現日期';

COMMIT;
