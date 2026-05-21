-- Fix expense_categories RLS: 修紅線 H 違反（William 2026-05-21 拍板）
-- 問題：原 RLS 只檢 auth.role() = 'authenticated'、跨 workspace 可讀寫
-- 修法：1) backfill workspace_id from user_id (legacy 欄位)
--      2) DROP 弱 policy
--      3) 加 workspace-scoped policy
-- 對齊：payment_methods 同 pattern (pm_all / pm_select)
--
-- 已 apply 到 production：2026-05-21 via mcp__supabase__apply_migration（紀錄補 migration 檔對齊 SOP）

BEGIN;

-- Step 1: backfill workspace_id from user_id（legacy 儲位）
UPDATE public.expense_categories
SET workspace_id = user_id
WHERE workspace_id IS NULL AND user_id IS NOT NULL;

-- Step 2: drop 弱 policy
DROP POLICY IF EXISTS expense_categories_authenticated_access ON public.expense_categories;

-- Step 3: SELECT — 看自己 workspace + 系統預設（workspace_id IS NULL）
CREATE POLICY expense_categories_workspace_select ON public.expense_categories
  FOR SELECT
  TO authenticated
  USING (
    workspace_id IS NULL  -- 系統預設、全租戶可讀
    OR workspace_id = get_current_user_workspace()  -- 自己 workspace
  );

-- Step 4: INSERT/UPDATE/DELETE — 只能動自己 workspace（不准動系統預設）
CREATE POLICY expense_categories_workspace_write ON public.expense_categories
  FOR ALL
  TO authenticated
  USING (workspace_id = get_current_user_workspace())
  WITH CHECK (workspace_id = get_current_user_workspace());

COMMIT;

-- ════ Rollback（萬一爆炸、複製貼上跑）════
-- BEGIN;
-- DROP POLICY IF EXISTS expense_categories_workspace_select ON public.expense_categories;
-- DROP POLICY IF EXISTS expense_categories_workspace_write ON public.expense_categories;
-- CREATE POLICY expense_categories_authenticated_access ON public.expense_categories
--   FOR ALL TO authenticated USING (auth.role() = 'authenticated');
-- COMMIT;
