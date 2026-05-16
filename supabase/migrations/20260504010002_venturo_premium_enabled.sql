-- VENTURO platform 開 premium_enabled
-- 問題：tenants 在 PREMIUM_FEATURE_CODES 列表（src/lib/permissions/hooks.ts）、
--   isFeatureEnabled('tenants') 要 premium_enabled=true 才通過。
--   VENTURO 之前 premium_enabled=false、所以 sidebar 永遠看不到「租戶管理」。
--
-- 修補：platform type workspace 該預設 premium_enabled=true。
-- idempotent（直接 SET、重跑無害）。

UPDATE public.workspaces
SET premium_enabled = true
WHERE id = 'aed1bc23-7bbf-4c59-a8e3-12dbb3271f0a'::uuid
  AND premium_enabled = false;
