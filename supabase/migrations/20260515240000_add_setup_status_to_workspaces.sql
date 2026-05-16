-- ════════════════════════════════════════════════════════════════════════════
-- workspaces 加 setup 狀態欄位
--
-- William 2026-05-15 拍板：簽約客戶需完成 setup 才有完整功能。
-- 此 phase 先做 banner 版（不擋 feature）、之後補 onboarding wizard 強制版。
--
-- 兩個欄位：
--   - setup_completed_at：完成 setup 的 timestamp（NULL = 未完成）
--   - setup_banner_dismissed_at：user 手動關掉提示 banner 的 timestamp
--                                （讓既有 workspace 不被 banner 打擾）
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS setup_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS setup_banner_dismissed_at timestamptz;

COMMENT ON COLUMN public.workspaces.setup_completed_at IS
  '完成 setup 的時間（NULL = 未完成、會顯示 setup banner）';
COMMENT ON COLUMN public.workspaces.setup_banner_dismissed_at IS
  'user 主動關掉 banner 的時間（不是真完成、只是不想看提示）';

NOTIFY pgrst, 'reload schema';

COMMIT;

-- ════════ Rollback ════════
-- BEGIN;
-- ALTER TABLE public.workspaces DROP COLUMN IF EXISTS setup_completed_at;
-- ALTER TABLE public.workspaces DROP COLUMN IF EXISTS setup_banner_dismissed_at;
-- NOTIFY pgrst, 'reload schema';
-- COMMIT;
