-- ============================================================================
-- Migration: 加職務讀取範圍 (read_scope) + 補回 workspaces.is_multi_department
-- Date: 2026-05-28
-- 變更：
--   1. workspaces.is_multi_department — 5/10 加過但現 DB 不存在（疑似手動砍）、補回
--   2. workspace_roles.read_scope (text + check) — 4 層讀取範圍：
--      self / department / branch / group
--   3. 現有所有 role 預設 'branch'（看自己分公司、最安全、最像現有行為）
--   4. 「系統主管」role（is_admin = true）UPDATE 成 'group'（看全集團）
--      系統機器人（is_system_bot = true）不動、平台 bot 走別的 path
--   5. 不動 is_admin（紅線 #0、Phase 2 才砍）
--
-- 業務語意：
--   - self = 業務員工：只看自己負責的資料
--   - department = 部門主管：看自己部門
--   - branch = 分公司主管：看自己分公司
--   - group = 系統主管：看全集團
--   - 顯示哪幾個選項由 workspaces.is_multi_branch / is_multi_department 決定
-- ============================================================================

BEGIN;

-- 1) workspaces.is_multi_department 補回（5/10 加過、不知何時不見、grep migrations 無 DROP 紀錄）
ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS is_multi_department BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN workspaces.is_multi_department IS
  '是否啟用部門（UI hint flag、影響職務管理 read_scope=department 選項顯示）';

-- 2) workspace_roles.read_scope 新欄位（4 層讀取範圍 enum）
ALTER TABLE workspace_roles
  ADD COLUMN IF NOT EXISTS read_scope TEXT NOT NULL DEFAULT 'branch'
    CHECK (read_scope IN ('self', 'department', 'branch', 'group'));

COMMENT ON COLUMN workspace_roles.read_scope IS
  '讀取範圍：self=只看自己負責 / department=看自己部門 / branch=看自己分公司 / group=看全集團';

-- 3) 「系統主管」role 預設改為看全集團
--    識別條件：name = '系統主管' AND is_admin = true（精準鎖、不誤傷自訂同名）
UPDATE workspace_roles
SET read_scope = 'group', updated_at = now()
WHERE name = '系統主管' AND is_admin = true;

COMMIT;

-- ════ Rollback（萬一爆炸、複製貼上跑）════
-- BEGIN;
-- ALTER TABLE workspace_roles DROP COLUMN IF EXISTS read_scope;
-- ALTER TABLE workspaces DROP COLUMN IF EXISTS is_multi_department;
-- COMMIT;
