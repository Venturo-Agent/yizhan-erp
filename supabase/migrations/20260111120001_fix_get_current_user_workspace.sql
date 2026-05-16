-- =============================================
-- Migration: 修復 get_current_user_workspace 函數
-- 確保正確查詢用戶的 workspace_id
-- =============================================

BEGIN;

-- 重建乾淨的 get_current_user_workspace 函數
CREATE OR REPLACE FUNCTION public.get_current_user_workspace()
RETURNS uuid
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
DECLARE
  ws_id uuid;
  current_uid uuid;
BEGIN
  current_uid := auth.uid();

  IF current_uid IS NULL THEN
    RETURN NULL;
  END IF;

  -- 方法 1：從 employees.supabase_user_id 查詢
  SELECT e.workspace_id INTO ws_id
  FROM public.employees e
  WHERE e.supabase_user_id = current_uid
  LIMIT 1;

  IF ws_id IS NOT NULL THEN
    RETURN ws_id;
  END IF;

  -- 方法 2：從 employees.id 查詢（某些情況下 id = supabase_user_id）
  SELECT e.workspace_id INTO ws_id
  FROM public.employees e
  WHERE e.id = current_uid
  LIMIT 1;

  IF ws_id IS NOT NULL THEN
    RETURN ws_id;
  END IF;

  -- 方法 3：從 auth.users.raw_user_meta_data.workspace_id 取得
  SELECT (au.raw_user_meta_data->>'workspace_id')::uuid INTO ws_id
  FROM auth.users au
  WHERE au.id = current_uid;

  RETURN ws_id;
END;
$$;

COMMENT ON FUNCTION public.get_current_user_workspace() IS
  '取得當前用戶的 workspace_id（修復版）';

COMMIT;
