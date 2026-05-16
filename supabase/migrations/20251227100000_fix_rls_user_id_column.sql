-- ============================================
-- Fix RLS Helper Functions - Use supabase_user_id
-- ============================================
-- 日期: 2025-12-27
-- 問題: RLS 函數使用 employees.user_id，但實際欄位是 employees.supabase_user_id
-- 修正: 更新函數使用正確的欄位名稱

BEGIN;

-- 1. 修正 get_current_user_workspace 函數
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
    ws_id := ws_id_text::uuid;
  ELSE
    -- 🔧 修正：使用 supabase_user_id 欄位（而不是舊的 user_id）
    SELECT e.workspace_id INTO ws_id
    FROM public.employees e
    WHERE e.supabase_user_id = auth.uid();
  END IF;

  RETURN ws_id;
END;
$$;

COMMENT ON FUNCTION public.get_current_user_workspace IS '取得當前用戶的 workspace_id（使用 supabase_user_id）';

-- 2. 修正 is_super_admin 函數 - 同時檢查 user_roles 和 employees.roles
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

COMMENT ON FUNCTION public.is_super_admin IS '檢查當前用戶是否為超級管理員（檢查 user_roles 和 employees.roles）';

-- 3. 修正 get_current_employee_id 函數
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

COMMENT ON FUNCTION public.get_current_employee_id IS '取得當前員工的 ID（使用 supabase_user_id）';

COMMIT;

-- 驗證
DO $$
BEGIN
  RAISE NOTICE '✅ RLS Helper Functions 已更新';
  RAISE NOTICE '  • get_current_user_workspace: 使用 supabase_user_id';
  RAISE NOTICE '  • is_super_admin: 同時檢查 user_roles 和 employees.roles';
  RAISE NOTICE '  • get_current_employee_id: 使用 supabase_user_id';
END $$;
