-- ════════════════════════════════════════════════════════════════════════════
-- Ch6: 將 role_capabilities 中 platform.is_admin → hr.manage_roles
--
-- 為什麼：
--   platform.is_admin 是超級管理員時代的 capability code，現行架構已廢棄此概念。
--   對應的正確 capability 是 hr.manage_roles（能管理職務角色的員工）。
--   TypeScript 層 CAPABILITIES.HR_MANAGE_ROLES = 'hr.manage_roles' 已更新，
--   DB 層要同步，讓 code 查的 capability_code 能正確 match。
--
-- 冪等設計：
--   - 若 platform.is_admin 不存在 → UPDATE 影響 0 筆，無害
--   - 若目標 hr.manage_roles 已存在（同一 role_id）→ 先刪重複再 RENAME，避免 UNIQUE 衝突
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

-- Step 1: 刪除重複項（同一 role_id 同時擁有 platform.is_admin 和 hr.manage_roles）
-- 保留已存在的 hr.manage_roles，刪掉 platform.is_admin（稍後會被 UPDATE 覆寫，
-- 若 hr.manage_roles 已存在則不需要 RENAME，直接砍 platform.is_admin 即可）
DELETE FROM public.role_capabilities
WHERE capability_code = 'platform.is_admin'
  AND role_id IN (
    SELECT role_id
    FROM public.role_capabilities
    WHERE capability_code = 'hr.manage_roles'
  );

-- Step 2: 將剩餘的 platform.is_admin 改名為 hr.manage_roles
-- （剩餘的代表同一 role_id 沒有 hr.manage_roles，安全 RENAME）
UPDATE public.role_capabilities
SET capability_code = 'hr.manage_roles'
WHERE capability_code = 'platform.is_admin';

COMMIT;

-- ════ Rollback（若需還原，複製貼上執行）════
-- 注意：此 rollback 無法恢復已被刪除的重複 platform.is_admin rows。
-- 它只能將現有 hr.manage_roles（由 platform.is_admin rename 而來）改回去。
-- BEGIN;
-- UPDATE public.role_capabilities
-- SET capability_code = 'platform.is_admin'
-- WHERE capability_code = 'hr.manage_roles';
-- COMMIT;
