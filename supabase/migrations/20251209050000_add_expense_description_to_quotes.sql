-- 為 quotes 表格新增 expense_description 欄位
-- 用於快速報價單的費用說明

BEGIN;

ALTER TABLE public.quotes
ADD COLUMN IF NOT EXISTS expense_description TEXT;

COMMENT ON COLUMN public.quotes.expense_description IS '費用說明（快速報價單用）';

COMMIT;
