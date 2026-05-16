-- ============================================================================
-- P016 修復：workspaces_delete policy 從 USING (true) 改為 service_role only
-- Date: 2026-04-22
-- Source: docs/SITEMAP/_PATTERN_MAP.md P016（/login v3.0 覆盤挖到）
-- ============================================================================
-- 歷史：
--   原始 migration 20260405500000_fix_rls_medium_risk_tables.sql:622-626
--   寫的是：USING (is_super_admin())
--   但 is_super_admin() function 後來被停用、永遠 return false
--   （見 function body：「已停用：所有使用者統一靠 workspace_id RLS 過濾、
--     租戶管理頁面使用 service role API 繞過 RLS」）
--   於是此 policy 被手動或未知 migration 改寫成 USING (true)、
--   導致任何 authenticated 用戶可 DELETE 任一 workspace（CASCADE 蒸發整租戶）
--
-- 今日修法（2026-04-22）：
--   配合新增 API `/api/workspaces/[id]` DELETE handler（有 requireTenantAdmin
--   + Corner 硬擋 + self-delete 禁 + 員工數防呆 + rate limit + audit log）、
--   policy 層只允許 service_role。所有合法刪除必須走 API、client-side
--   supabase.from('workspaces').delete() 直接被擋。
--
-- 注意 CLAUDE.md DB 紅線：workspaces 絕不 FORCE RLS（2026-04-20 燒過登入）。
--   本 migration 只改 DELETE policy、不動 FORCE RLS 狀態。
-- ============================================================================

BEGIN;

DROP POLICY IF EXISTS "workspaces_delete" ON public.workspaces;

CREATE POLICY "workspaces_delete" ON public.workspaces
  FOR DELETE TO public
  USING (auth.role() = 'service_role');

-- 驗證：policy 已改為 service_role only
DO $$
DECLARE
  policy_qual text;
BEGIN
  SELECT qual INTO policy_qual
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'workspaces'
    AND policyname = 'workspaces_delete';

  IF policy_qual IS NULL THEN
    RAISE EXCEPTION 'workspaces_delete policy 不存在';
  END IF;

  IF policy_qual NOT LIKE '%service_role%' THEN
    RAISE EXCEPTION 'workspaces_delete policy 未正確套用：%', policy_qual;
  END IF;

  RAISE NOTICE 'P016 migration 驗證通過：workspaces_delete = %', policy_qual;
END $$;

-- 驗證：workspaces 仍是 NO FORCE RLS（CLAUDE.md 紅線）
DO $$
DECLARE
  is_forced boolean;
BEGIN
  SELECT relforcerowsecurity INTO is_forced
  FROM pg_class
  WHERE oid = 'public.workspaces'::regclass;

  IF is_forced THEN
    RAISE EXCEPTION 'workspaces 不得 FORCE RLS（CLAUDE.md 紅線、會炸登入）';
  END IF;

  RAISE NOTICE 'P016 紅線守門通過：workspaces NO FORCE RLS';
END $$;

COMMIT;
