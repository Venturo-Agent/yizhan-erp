-- 新增 nationality 欄位到 customers 表格
-- 用於儲存護照 OCR 辨識出的國籍代碼（如 TWN, USA, JPN）

BEGIN;

ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS nationality text;

COMMENT ON COLUMN public.customers.nationality IS '國籍代碼（ISO 3166-1 alpha-3），例如 TWN, USA, JPN';

COMMIT;
