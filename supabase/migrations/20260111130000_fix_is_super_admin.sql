-- =============================================
-- Migration: 修復 is_super_admin 函數
-- 問題：roles 欄位類型處理錯誤導致 JSON 解析失敗
-- =============================================

BEGIN;

-- 重建 is_super_admin 函數
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
DECLARE
  user_roles jsonb;
  current_uid uuid;
BEGIN
  current_uid := auth.uid();

  IF current_uid IS NULL THEN
    RETURN false;
  END IF;

  -- 從 employees 表檢查 roles
  SELECT e.roles INTO user_roles
  FROM public.employees e
  WHERE e.supabase_user_id = current_uid
     OR e.id = current_uid
  LIMIT 1;

  -- 檢查 roles 是否包含 super_admin
  IF user_roles IS NOT NULL THEN
    -- roles 可能是 JSONB 陣列 ["super_admin", "admin"] 或物件
    IF jsonb_typeof(user_roles) = 'array' THEN
      RETURN user_roles @> '"super_admin"'::jsonb;
    END IF;
  END IF;

  RETURN false;
END;
$$;

COMMENT ON FUNCTION public.is_super_admin() IS
  '檢查當前用戶是否為超級管理員（修復版）';

COMMIT;
