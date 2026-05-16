-- 為 tours 表添加 confirmed_requirements 欄位
-- 用於儲存需求確認單快照（與 proposal_packages 相同的資料結構）

BEGIN;

ALTER TABLE public.tours
ADD COLUMN IF NOT EXISTS confirmed_requirements jsonb DEFAULT NULL;

COMMENT ON COLUMN public.tours.confirmed_requirements IS '需求確認單快照，從報價單同步的需求項目';

COMMIT;
