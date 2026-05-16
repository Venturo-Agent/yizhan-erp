-- =============================================
-- Migration: 簡化 get_current_user_workspace 函數
-- 統一 ID 架構後，只需要兩種查詢方式
-- =============================================

BEGIN;

-- 重建簡化版的 get_current_user_workspace 函數
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

  -- 統一 ID 架構：一次查詢處理兩種情況
  -- Pattern A (標準): employee.id = auth.uid()
  -- Pattern B (舊制): supabase_user_id = auth.uid()
  SELECT e.workspace_id INTO ws_id
  FROM public.employees e
  WHERE e.id = current_uid OR e.supabase_user_id = current_uid
  LIMIT 1;

  IF ws_id IS NOT NULL THEN
    RETURN ws_id;
  END IF;

  -- 備用：從 auth.users.raw_user_meta_data.workspace_id 取得
  SELECT (au.raw_user_meta_data->>'workspace_id')::uuid INTO ws_id
  FROM auth.users au
  WHERE au.id = current_uid;

  RETURN ws_id;
END;
$$;

COMMENT ON FUNCTION public.get_current_user_workspace() IS
  '取得當前用戶的 workspace_id（統一 ID 架構版）';

COMMIT;
