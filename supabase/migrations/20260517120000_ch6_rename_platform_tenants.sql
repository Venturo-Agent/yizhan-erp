-- ════════════════════════════════════════════════════════════════════════════
-- Ch6: 將 role_capabilities 中 platform.tenants.* → workspaces.*
--
-- 為什麼：
--   platform.tenants.read / platform.tenants.write 是舊 namespace，
--   對應的模組已重命名為 workspaces（見 capabilities.ts WORKSPACES_READ / WORKSPACES_WRITE）。
--   TypeScript 層已更新為 'workspaces.read' / 'workspaces.write'，DB 層要同步。
--
-- 冪等設計（每個 rename 都是兩步：先去重、再 UPDATE）：
--   - 若來源 code 不存在 → 影響 0 筆，無害
--   - 若目標 code 已存在於同一 role_id → 先刪重複來源，再 UPDATE（影響 0 筆，無害）
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ── platform.tenants.read → workspaces.read ──────────────────────────────

-- Step 1a: 刪除重複項（同一 role_id 同時有兩個 code）
DELETE FROM public.role_capabilities
WHERE capability_code = 'platform.tenants.read'
  AND role_id IN (
    SELECT role_id
    FROM public.role_capabilities
    WHERE capability_code = 'workspaces.read'
  );

-- Step 2a: RENAME 剩餘的 platform.tenants.read
UPDATE public.role_capabilities
SET capability_code = 'workspaces.read'
WHERE capability_code = 'platform.tenants.read';

-- ── platform.tenants.write → workspaces.write ────────────────────────────

-- Step 1b: 刪除重複項
DELETE FROM public.role_capabilities
WHERE capability_code = 'platform.tenants.write'
  AND role_id IN (
    SELECT role_id
    FROM public.role_capabilities
    WHERE capability_code = 'workspaces.write'
  );

-- Step 2b: RENAME 剩餘的 platform.tenants.write
UPDATE public.role_capabilities
SET capability_code = 'workspaces.write'
WHERE capability_code = 'platform.tenants.write';

COMMIT;

-- ════ Rollback（若需還原，複製貼上執行）════
-- 注意：已被刪除的重複 rows 無法還原。
-- BEGIN;
-- UPDATE public.role_capabilities
-- SET capability_code = 'platform.tenants.read'
-- WHERE capability_code = 'workspaces.read';
--
-- UPDATE public.role_capabilities
-- SET capability_code = 'platform.tenants.write'
-- WHERE capability_code = 'workspaces.write';
-- COMMIT;
