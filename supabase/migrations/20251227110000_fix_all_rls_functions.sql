-- ============================================
-- 完整修復所有 RLS 函數 - 統一使用 supabase_user_id
-- ============================================
-- 日期: 2025-12-27
-- 問題: 多個 RLS 函數使用錯誤的 employees.user_id 欄位
-- 修正: 全部改為使用 employees.supabase_user_id

BEGIN;

-- ============================================
-- 1. 修正 get_current_user_workspace 函數
-- ============================================
CREATE OR REPLACE FUNCTION public.get_current_user_workspace()
RETURNS uuid
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
DECLARE
  ws_id uuid;
  ws_id_text text;
BEGIN
  -- 優先從 session 取得
  ws_id_text := current_setting('app.current_workspace_id', true);

  -- 如果有設定，轉換為 uuid
  IF ws_id_text IS NOT NULL AND ws_id_text != '' THEN
    BEGIN
      ws_id := ws_id_text::uuid;
    EXCEPTION WHEN OTHERS THEN
      ws_id := NULL;
    END;
  END IF;

  -- 如果 session 沒有，從 employees 表格取得
  IF ws_id IS NULL THEN
    SELECT e.workspace_id INTO ws_id
    FROM public.employees e
    WHERE e.supabase_user_id = auth.uid();
  END IF;

  RETURN ws_id;
END;
$$;

-- ============================================
-- 2. 修正 is_super_admin 函數
-- ============================================
CREATE OR REPLACE FUNCTION public.is_super_admin()
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

  -- 方法2: 檢查 employees.roles 陣列（使用 supabase_user_id）
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

-- ============================================
-- 3. 修正 get_current_employee_id 函數
-- ============================================
CREATE OR REPLACE FUNCTION public.get_current_employee_id()
RETURNS uuid
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
DECLARE
  emp_id uuid;
BEGIN
  SELECT e.id INTO emp_id
  FROM public.employees e
  WHERE e.supabase_user_id = auth.uid();

  RETURN emp_id;
END;
$$;

-- ============================================
-- 4. 修正 is_employee 函數（旅客系統用）
-- ============================================
CREATE OR REPLACE FUNCTION public.is_employee()
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

-- ============================================
-- 5. 確保 calendar_events 的 RLS policies 正確
-- ============================================

-- 先刪除現有的 policies（使用 IF EXISTS 避免錯誤）
DROP POLICY IF EXISTS "calendar_events_select" ON public.calendar_events;
DROP POLICY IF EXISTS "calendar_events_insert" ON public.calendar_events;
DROP POLICY IF EXISTS "calendar_events_update" ON public.calendar_events;
DROP POLICY IF EXISTS "calendar_events_delete" ON public.calendar_events;

-- 確保 RLS 已啟用
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

-- SELECT policy:
-- 個人事項: 只有本人能看
-- 公司事項: 同 workspace 或 super_admin
-- 舊資料: 所有人都能看
-- 注意: created_by 存的是 employees.id，不是 auth.uid()
DROP POLICY IF EXISTS "calendar_events_select" ON public.calendar_events;
CREATE POLICY "calendar_events_select" ON public.calendar_events FOR SELECT
USING (
  CASE
    -- 個人事項：只有建立者能看（created_by = employees.id）
    WHEN visibility = 'personal' THEN created_by = get_current_employee_id()
    -- 公司事項：同 workspace 或超級管理員
    WHEN visibility = 'company' THEN
      workspace_id = get_current_user_workspace()
      OR is_super_admin()
      OR workspace_id IS NULL
    -- 其他情況：允許（向後相容）
    ELSE
      workspace_id IS NULL
      OR workspace_id = get_current_user_workspace()
      OR is_super_admin()
  END
);

-- INSERT policy
DROP POLICY IF EXISTS "calendar_events_insert" ON public.calendar_events;
CREATE POLICY "calendar_events_insert" ON public.calendar_events FOR INSERT
WITH CHECK (
  workspace_id IS NULL
  OR workspace_id = get_current_user_workspace()
  OR is_super_admin()
);

-- UPDATE policy（created_by = employees.id）
DROP POLICY IF EXISTS "calendar_events_update" ON public.calendar_events;
CREATE POLICY "calendar_events_update" ON public.calendar_events FOR UPDATE
USING (
  created_by = get_current_employee_id()
  OR (is_super_admin() AND visibility != 'personal')
  OR workspace_id IS NULL
);

-- DELETE policy（created_by = employees.id）
DROP POLICY IF EXISTS "calendar_events_delete" ON public.calendar_events;
CREATE POLICY "calendar_events_delete" ON public.calendar_events FOR DELETE
USING (
  created_by = get_current_employee_id()
  OR (is_super_admin() AND visibility != 'personal')
  OR workspace_id IS NULL
);

COMMIT;

-- 驗證
DO $$
BEGIN
  RAISE NOTICE '✅ 所有 RLS 函數已修正為使用 supabase_user_id';
  RAISE NOTICE '  • get_current_user_workspace()';
  RAISE NOTICE '  • is_super_admin()';
  RAISE NOTICE '  • get_current_employee_id()';
  RAISE NOTICE '  • is_employee()';
  RAISE NOTICE '  • calendar_events RLS policies';
END $$;
