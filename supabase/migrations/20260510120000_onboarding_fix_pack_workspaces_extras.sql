-- ============================================================================
-- Migration: Onboarding fix pack #1 — workspaces 擴欄位
-- Date: 2026-05-10
-- Pack: feature/onboarding-fix-pack-2026-05-10
-- 變更：
--   - workspaces.tax_id (8 碼公司統編、onboarding 必填、用來組預設密碼)
--   - workspaces.is_multi_branch / is_multi_department (UI hint flag)
-- 既有 default_password 欄位保留、但 onboarding 改為 {WORKSPACE_CODE}-{TAX_ID}
-- ============================================================================

ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS tax_id VARCHAR(20),
  ADD COLUMN IF NOT EXISTS is_multi_branch BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_multi_department BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN workspaces.tax_id IS '公司統編（台灣 8 碼、onboarding 必填、組合預設密碼用）';
COMMENT ON COLUMN workspaces.is_multi_branch IS 'onboarding 拍板「是否多分公司」flag、僅作 UI hint、實際是否顯示由 branches 數量決定';
COMMENT ON COLUMN workspaces.is_multi_department IS 'onboarding 拍板「是否多部門」flag、僅作 UI hint、實際是否顯示由 departments 數量決定';
