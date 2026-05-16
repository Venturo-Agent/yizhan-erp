-- 新增 sex 欄位到 customers 表格
-- 用於儲存護照 OCR 辨識出的性別

BEGIN;

ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS sex text;

COMMENT ON COLUMN public.customers.sex IS '性別（男/女）';

COMMIT;
