-- ============================================================================
-- Migration: Onboarding fix pack #7 — employees.email partial unique per workspace
-- Date: 2026-05-10
-- 配合 login email 化（validate-login 用 email 查員工）
-- partial unique：只 enforce 非 null email、避免歷史空值衝突
-- ============================================================================

-- 大小寫不敏感（用 LOWER）— 避免 Admin@x.com / admin@x.com 衝突
CREATE UNIQUE INDEX IF NOT EXISTS employees_workspace_email_unique
  ON employees (workspace_id, LOWER(email))
  WHERE email IS NOT NULL AND email <> '';

COMMENT ON INDEX employees_workspace_email_unique IS
  'onboarding fix pack 2026-05-10：同 workspace 內 email 唯一（大小寫不敏感）— 配合 email login';
