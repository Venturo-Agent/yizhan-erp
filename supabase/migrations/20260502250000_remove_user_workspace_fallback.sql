-- ============================================================
-- Migration: 砍 get_current_user_workspace 的 raw_user_meta_data fallback
-- Date: 2026-05-02
-- 原因：
--   舊版 get_current_user_workspace() 在找不到 employees row 時、
--   會 fallback 到 auth.users.raw_user_meta_data->>'workspace_id'。
--   這是 escape hatch、繞過 employees SSOT、會讓 RLS 邊界混亂。
--
--   現在 employees.user_id 已正規化（13/16 員工有值）、
--   剩 4 個靠 fallback 的 user 是測試/久未登入帳號（>1 月未登入）、
--   這次直接砍 fallback、那 4 個 user 之後若需登入要走正規 employees 建檔。
--
-- 改動：
--   1. 改成 SQL 語言（更簡潔、跟 has_capability_for_workspace 一致）
--   2. 加 status = 'active' 條件（離職員工不該過 RLS）
--   3. 拔掉 raw_user_meta_data fallback（escape hatch）
--   4. SET search_path TO 'public'（SECURITY DEFINER 安全慣例）
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_current_user_workspace()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT workspace_id
  FROM public.employees
  WHERE user_id = auth.uid()
    AND status = 'active'
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.get_current_user_workspace() IS
  '取得目前登入者的 workspace_id。Source of truth: employees.user_id + status=active。
   不再 fallback 到 auth.users.raw_user_meta_data（2026-05-02 移除 escape hatch）。';
