-- 為 visas 表格新增 is_urgent 欄位
BEGIN;

ALTER TABLE public.visas
ADD COLUMN IF NOT EXISTS is_urgent boolean DEFAULT false;

COMMENT ON COLUMN public.visas.is_urgent IS '是否為急件';

COMMIT;
