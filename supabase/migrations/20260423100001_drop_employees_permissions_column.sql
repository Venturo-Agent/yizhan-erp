-- =============================================
-- Migration: DROP employees.permissions JSONB/text[] column（2026-04-23）
--
-- 背景：
--   兩套權限系統並存的最後一塊殘骸：employees.permissions。
--   登入早已改讀 role_tab_permissions + employee_permission_overrides、
--   is_super_admin() 已於 20260423100000 改讀 workspace_roles.is_admin、
--   HR 編輯頁的舊 tab (permissions-tab-new.tsx) 已於 2026-04-23 刪除、
--   auth API 的 .select('permissions') 死讀已清除。
--
--   現在無人讀、無人寫、沒有 RLS 引用。直接砍。
--
-- 依賴先於此 migration 執行：
--   - 20260423100000_rebuild_is_super_admin_via_workspace_roles.sql（已先於此）
--
-- 前端型別 cascade：
--   自動生成的 database.types.ts / supabase/types.ts 會在下次 `npx supabase gen types`
--   時自動移除 permissions 欄位。手動 User interface（src/types/user.types.ts）裡的
--   permissions: string[] 是「登入時算出的袋子」、不是 DB 欄位、保留。
-- =============================================

BEGIN;

ALTER TABLE public.employees
  DROP COLUMN IF EXISTS permissions;

COMMIT;
