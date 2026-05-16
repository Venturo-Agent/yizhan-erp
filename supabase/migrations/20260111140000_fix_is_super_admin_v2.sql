-- =============================================
-- Migration: 修復 is_super_admin 函數 v2
-- 問題：之前錯誤使用 roles 欄位，應該使用 permissions 欄位
-- permissions 是 text[] 陣列，不是 jsonb
-- =============================================

BEGIN;

-- 重建 is_super_admin 函數（使用正確的 permissions 欄位）
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
DECLARE
  current_uid uuid;
  emp_permissions text[];
BEGIN
  current_uid := auth.uid();

  IF current_uid IS NULL THEN
    RETURN false;
  END IF;

  -- 從 employees 表格取得 permissions（text[] 陣列）
  SELECT e.permissions INTO emp_permissions
  FROM public.employees e
  WHERE e.supabase_user_id = current_uid
     OR e.id = current_uid
  LIMIT 1;

  -- 檢查 permissions 陣列是否包含 'super_admin'
  RETURN 'super_admin' = ANY(COALESCE(emp_permissions, ARRAY[]::text[]));
END;
$$;

COMMENT ON FUNCTION public.is_super_admin() IS
  '檢查當前用戶是否為超級管理員（使用 permissions text[] 欄位）';

COMMIT;
