BEGIN;

-- Add subscription_plan to workspaces table
-- William 2026-05-18 拍板：Lite / Standard / Advance / Premium / Custom 五層方案
-- 用於前端顯示 + 初始 feature 自動配置（不鎖定 features、只是 UI 套裝快捷）
ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS subscription_plan TEXT
  DEFAULT 'custom'
  CHECK (subscription_plan IN ('lite', 'standard', 'advance', 'premium', 'custom'));

-- Backfill existing workspaces to 'custom'（現有租戶維持手動管理）
UPDATE public.workspaces SET subscription_plan = 'custom' WHERE subscription_plan IS NULL;

COMMIT;

-- ════ Rollback（萬一爆炸、複製貼上跑）════
-- BEGIN;
-- ALTER TABLE public.workspaces DROP COLUMN IF EXISTS subscription_plan;
-- COMMIT;
