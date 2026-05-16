-- 新增 restricted 欄位，用於限制僅會計/管理者可見

BEGIN;

ALTER TABLE public.company_assets
ADD COLUMN IF NOT EXISTS restricted boolean DEFAULT false;

COMMENT ON COLUMN public.company_assets.restricted IS '僅限會計/管理者可見';

COMMIT;
