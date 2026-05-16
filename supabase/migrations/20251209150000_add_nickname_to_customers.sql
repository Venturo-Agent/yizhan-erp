-- 新增外號/稱謂欄位到 customers 表
BEGIN;

ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS nickname text;

COMMENT ON COLUMN public.customers.nickname IS '外號或常用稱謂，方便業務辨識';

COMMIT;
