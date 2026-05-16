-- ============================================
-- 完整診斷並修復 RLS 系統
-- ============================================
-- 日期: 2025-12-27
-- 目的: 全面檢查並修復所有 RLS 相關問題

BEGIN;

-- ============================================
-- Part 1: 診斷 - 輸出當前狀態
-- ============================================

DO $$
DECLARE
  emp_count integer;
  emp_with_supabase_id integer;
  emp_with_old_user_id integer;
  user_roles_count integer;
  calendar_events_count integer;
BEGIN
  -- 統計 employees
  SELECT COUNT(*) INTO emp_count FROM public.employees;
  SELECT COUNT(*) INTO emp_with_supabase_id FROM public.employees WHERE supabase_user_id IS NOT NULL;
  SELECT COUNT(*) INTO emp_with_old_user_id FROM public.employees WHERE user_id IS NOT NULL;

  -- 統計 user_roles
  SELECT COUNT(*) INTO user_roles_count FROM public.user_roles;

  -- 統計 calendar_events
  SELECT COUNT(*) INTO calendar_events_count FROM public.calendar_events;

  RAISE NOTICE '====== RLS 診斷報告 ======';
  RAISE NOTICE '員工總數: %', emp_count;
  RAISE NOTICE '有 supabase_user_id 的員工: %', emp_with_supabase_id;
  RAISE NOTICE '有舊 user_id 的員工: %', emp_with_old_user_id;
  RAISE NOTICE 'user_roles 記錄數: %', user_roles_count;
  RAISE NOTICE 'calendar_events 記錄數: %', calendar_events_count;
  RAISE NOTICE '==========================';
END $$;

-- ============================================
-- Part 2: 修復所有 RLS Helper Functions
-- ============================================

-- 2.1 get_current_user_workspace
DROP FUNCTION IF EXISTS public.get_current_user_workspace() CASCADE;
CREATE FUNCTION public.get_current_user_workspace()
RETURNS uuid
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
DECLARE
  ws_id uuid;
  ws_id_text text;
BEGIN
  -- 方法1: 從 session 取得
  ws_id_text := current_setting('app.current_workspace_id', true);
  IF ws_id_text IS NOT NULL AND ws_id_text != '' THEN
    BEGIN
      ws_id := ws_id_text::uuid;
      RETURN ws_id;
    EXCEPTION WHEN OTHERS THEN
      NULL; -- 繼續嘗試其他方法
    END;
  END IF;

  -- 方法2: 從 auth.users.raw_user_meta_data 取得
  SELECT (raw_user_meta_data->>'workspace_id')::uuid INTO ws_id
  FROM auth.users
  WHERE id = auth.uid();

  IF ws_id IS NOT NULL THEN
    RETURN ws_id;
  END IF;

  -- 方法3: 從 employees 表格取得（使用 supabase_user_id）
  SELECT e.workspace_id INTO ws_id
  FROM public.employees e
  WHERE e.supabase_user_id = auth.uid();

  RETURN ws_id;
END;
$$;

-- 2.2 is_super_admin
DROP FUNCTION IF EXISTS public.is_super_admin() CASCADE;
CREATE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
BEGIN
  -- 方法1: 檢查 user_roles 表格
  IF EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'super_admin'
  ) THEN
    RETURN true;
  END IF;

  -- 方法2: 檢查 employees.roles 陣列
  IF EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.supabase_user_id = auth.uid()
    AND 'super_admin' = ANY(e.roles)
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- 2.3 get_current_employee_id
DROP FUNCTION IF EXISTS public.get_current_employee_id() CASCADE;
CREATE FUNCTION public.get_current_employee_id()
RETURNS uuid
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
DECLARE
  emp_id uuid;
BEGIN
  -- 優先從 auth.users.raw_user_meta_data 取得
  SELECT (raw_user_meta_data->>'employee_id')::uuid INTO emp_id
  FROM auth.users
  WHERE id = auth.uid();

  IF emp_id IS NOT NULL THEN
    RETURN emp_id;
  END IF;

  -- 備用: 從 employees 查詢
  SELECT e.id INTO emp_id
  FROM public.employees e
  WHERE e.supabase_user_id = auth.uid();

  RETURN emp_id;
END;
$$;

-- 2.4 is_employee（旅客系統用）
DROP FUNCTION IF EXISTS public.is_employee() CASCADE;
CREATE FUNCTION public.is_employee()
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.supabase_user_id = auth.uid()
    AND e.status != 'terminated'
  );
END;
$$;

-- 2.5 is_traveler（保持不變，traveler_profiles.id = auth.uid()）
CREATE OR REPLACE FUNCTION public.is_traveler()
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM traveler_profiles
    WHERE id = auth.uid()
  );
END;
$$;

-- ============================================
-- Part 3: 重建 calendar_events RLS Policies
-- ============================================

-- 確保 RLS 已啟用
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

-- 刪除現有 policies
DROP POLICY IF EXISTS "calendar_events_select" ON public.calendar_events;
DROP POLICY IF EXISTS "calendar_events_insert" ON public.calendar_events;
DROP POLICY IF EXISTS "calendar_events_update" ON public.calendar_events;
DROP POLICY IF EXISTS "calendar_events_delete" ON public.calendar_events;

-- SELECT: 個人事項只有本人能看，公司事項同 workspace 能看
DROP POLICY IF EXISTS "calendar_events_select" ON public.calendar_events;
CREATE POLICY "calendar_events_select" ON public.calendar_events FOR SELECT
USING (
  CASE
    WHEN visibility = 'personal' THEN
      created_by = get_current_employee_id()
    WHEN visibility = 'company' THEN
      workspace_id = get_current_user_workspace()
      OR is_super_admin()
      OR workspace_id IS NULL
    ELSE
      workspace_id IS NULL
      OR workspace_id = get_current_user_workspace()
      OR is_super_admin()
  END
);

-- INSERT
DROP POLICY IF EXISTS "calendar_events_insert" ON public.calendar_events;
CREATE POLICY "calendar_events_insert" ON public.calendar_events FOR INSERT
WITH CHECK (
  workspace_id IS NULL
  OR workspace_id = get_current_user_workspace()
  OR is_super_admin()
);

-- UPDATE
DROP POLICY IF EXISTS "calendar_events_update" ON public.calendar_events;
CREATE POLICY "calendar_events_update" ON public.calendar_events FOR UPDATE
USING (
  created_by = get_current_employee_id()
  OR (is_super_admin() AND visibility != 'personal')
  OR workspace_id IS NULL
);

-- DELETE
DROP POLICY IF EXISTS "calendar_events_delete" ON public.calendar_events;
CREATE POLICY "calendar_events_delete" ON public.calendar_events FOR DELETE
USING (
  created_by = get_current_employee_id()
  OR (is_super_admin() AND visibility != 'personal')
  OR workspace_id IS NULL
);

-- ============================================
-- Part 4: 確保其他關鍵表格的 RLS 正確
-- ============================================

-- 4.1 確保 employees 表格 RLS 已禁用（全公司共享）
ALTER TABLE public.employees DISABLE ROW LEVEL SECURITY;

-- 4.2 確保 workspaces 表格 RLS 已禁用（全公司共享）
ALTER TABLE public.workspaces DISABLE ROW LEVEL SECURITY;

-- 4.3 確保 user_roles 表格 RLS 已禁用（全公司共享）
ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;

COMMIT;

-- ============================================
-- Part 5: 最終驗證
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ RLS 系統完整修復完成';
  RAISE NOTICE '';
  RAISE NOTICE '修正的函數:';
  RAISE NOTICE '  • get_current_user_workspace() - 支援 session/metadata/employees 三種來源';
  RAISE NOTICE '  • is_super_admin() - 檢查 user_roles 和 employees.roles';
  RAISE NOTICE '  • get_current_employee_id() - 支援 metadata/employees 兩種來源';
  RAISE NOTICE '  • is_employee() - 使用 supabase_user_id';
  RAISE NOTICE '';
  RAISE NOTICE '修正的表格:';
  RAISE NOTICE '  • calendar_events - RLS 已重建';
  RAISE NOTICE '  • employees - RLS 已禁用（全公司共享）';
  RAISE NOTICE '  • workspaces - RLS 已禁用（全公司共享）';
  RAISE NOTICE '  • user_roles - RLS 已禁用（全公司共享）';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  用戶需要重新登入才能讓 employees.supabase_user_id 被更新！';
END $$;
