-- 2026-04-28: 登入頁安全強化 — 三個安全漏洞修復
--
-- Fix 1: workspaces DELETE policy
--   sitemap v3.0 發現 USING:true 讓任何登入用戶可刪任何 workspace
--   現況確認：已是 auth.role()='service_role'（可能先前 migration 已修）
--   本 migration 補文件紀錄、確保不被誤改
--
-- Fix 2: _migrations 表 RLS 啟用
--   任何登入用戶可讀 DB 全部變更歷史 → 開 RLS 限 service_role
--
-- Fix 3: rate_limits 表 RLS 啟用
--   登入嘗試記錄外露 → 開 RLS 限 service_role

BEGIN;

-- Fix 2
ALTER TABLE public._migrations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "_migrations_service_only" ON public._migrations;
CREATE POLICY "_migrations_service_only" ON public._migrations
  FOR ALL USING (auth.role() = 'service_role');

-- Fix 3
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rate_limits_service_only" ON public.rate_limits;
CREATE POLICY "rate_limits_service_only" ON public.rate_limits
  FOR ALL USING (auth.role() = 'service_role');

COMMIT;
