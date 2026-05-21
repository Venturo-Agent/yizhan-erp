-- Fix bank_accounts + chart_of_accounts INSERT policy check=true → workspace_id 守門
-- 紅線 H 違反（William 2026-05-21 抓出）
-- 風險：任何登入者可 INSERT 一筆帶任意 workspace_id 的 row（DB 層無防）
-- 修法：INSERT policy WITH CHECK 加 workspace_id = current
--
-- 已 apply 到 production：2026-05-21 via mcp__supabase__apply_migration

BEGIN;

-- bank_accounts
DROP POLICY IF EXISTS bank_accounts_insert ON public.bank_accounts;
CREATE POLICY bank_accounts_insert ON public.bank_accounts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    workspace_id IS NULL  -- 系統預設、admin 可建（罕見）
    OR workspace_id = get_current_user_workspace()  -- 自己 workspace
  );

-- chart_of_accounts
DROP POLICY IF EXISTS chart_of_accounts_insert ON public.chart_of_accounts;
CREATE POLICY chart_of_accounts_insert ON public.chart_of_accounts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    workspace_id IS NULL  -- 系統預設、admin 可建
    OR workspace_id = get_current_user_workspace()  -- 自己 workspace
  );

COMMIT;

-- ════ Rollback ════
-- BEGIN;
-- DROP POLICY IF EXISTS bank_accounts_insert ON public.bank_accounts;
-- DROP POLICY IF EXISTS chart_of_accounts_insert ON public.chart_of_accounts;
-- CREATE POLICY bank_accounts_insert ON public.bank_accounts FOR INSERT TO authenticated WITH CHECK (true);
-- CREATE POLICY chart_of_accounts_insert ON public.chart_of_accounts FOR INSERT TO authenticated WITH CHECK (true);
-- COMMIT;
