-- =============================================
-- Migration: 職務名稱統一「管理員」→「系統主管」
-- Date: 2026-04-24
-- Author: cleanup-3c (capability-oriented language)
--
-- 背景：
--   2026-04-24 全站 cleanup 把「管理員」業務職務名統一改為「系統主管」。
--   src/app/api/tenants/create/route.ts 的 DEFAULT_ROLE_NAMES 已改、
--   往後新建租戶會直接用 '系統主管'。
--   此 migration 把現有 4 個 workspace 已存在的 '管理員' row 同步改名。
--
-- 影響：
--   workspace_roles 表中、name = '管理員' 的 4 row 全部改成 '系統主管'。
--   其他欄位（is_admin、workspace_id、created_at 等）不動。
--
-- 驗證（執行前先跑、確認受影響行數）：
--   SELECT count(*) FROM public.workspace_roles WHERE name = '管理員';
--   預期：4
--
-- 驗證（執行後）：
--   SELECT count(*) FROM public.workspace_roles WHERE name = '管理員';  -- 預期：0
--   SELECT count(*) FROM public.workspace_roles WHERE name = '系統主管'; -- 預期：4
--
-- 不動的東西：
--   - workspace_roles.is_admin column（schema 契約、屬於第三層 3d 不動）
--   - employees.roles 欄位裡的 ['admin'] 字面值（3 row、留作 backlog）
--   - DB function is_super_admin()（schema 契約、不動）
--   - 任何 RLS policy（is_admin column 沒改、policy 不受影響）
--
-- Rollback：
--   見同目錄 20260424010000_rename_admin_role_to_system_master.ROLLBACK.sql
-- =============================================

BEGIN;

UPDATE public.workspace_roles
SET name = '系統主管',
    updated_at = now()
WHERE name = '管理員';

-- 對齊 information_schema 風格的驗證（如果 4 row 沒變則 raise）
DO $$
DECLARE
  remaining int;
BEGIN
  SELECT count(*) INTO remaining FROM public.workspace_roles WHERE name = '管理員';
  IF remaining > 0 THEN
    RAISE EXCEPTION '預期 0 個 "管理員" row 殘留、實際 %', remaining;
  END IF;
END $$;

COMMIT;
