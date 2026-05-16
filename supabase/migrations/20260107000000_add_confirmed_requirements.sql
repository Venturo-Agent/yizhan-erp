-- 為 proposal_packages 新增已確認需求快照欄位
-- 用於追蹤需求變更：比較快照與目前報價單資料

BEGIN;

-- 新增欄位
ALTER TABLE public.proposal_packages
ADD COLUMN IF NOT EXISTS confirmed_requirements jsonb DEFAULT NULL;

-- 欄位說明
COMMENT ON COLUMN public.proposal_packages.confirmed_requirements IS '已確認的需求快照，格式：{ snapshot: [...items], confirmed_at: timestamp, confirmed_by: user_id }';

COMMIT;
