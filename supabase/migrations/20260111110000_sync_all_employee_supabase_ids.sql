-- =============================================
-- Migration: 正確同步所有員工的 supabase_user_id
-- 從 auth.users 的 raw_user_meta_data.employee_id 反向同步
-- =============================================

BEGIN;

-- 1. 從 auth.users 同步 supabase_user_id 到 employees
-- 使用 raw_user_meta_data.employee_id 來匹配
UPDATE public.employees e
SET supabase_user_id = au.id
FROM auth.users au
WHERE au.raw_user_meta_data->>'employee_id' = e.id::text
  AND (e.supabase_user_id IS NULL OR e.supabase_user_id != au.id);

-- 2. 記錄同步結果
DO $$
DECLARE
  synced_count integer;
BEGIN
  SELECT COUNT(*) INTO synced_count
  FROM public.employees
  WHERE supabase_user_id IS NOT NULL;

  RAISE NOTICE 'Total employees with supabase_user_id: %', synced_count;
END $$;

-- 3. 恢復正確的 get_current_user_workspace 函數（不放寬，但更可靠）
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

  -- 方法 3：從 auth.users.raw_user_meta_data 取得
  BEGIN
    SELECT (raw_user_meta_data->>'workspace_id')::uuid INTO ws_id
    FROM auth.users
    WHERE id = current_uid;

    IF ws_id IS NOT NULL THEN
      RETURN ws_id;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  -- 方法 4：從 auth.users.raw_user_meta_data.employee_id 查詢
  BEGIN
    SELECT e.workspace_id INTO ws_id
    FROM public.employees e
    INNER JOIN auth.users au ON au.raw_user_meta_data->>'employee_id' = e.id::text
    WHERE au.id = current_uid
    LIMIT 1;

    IF ws_id IS NOT NULL THEN
      RETURN ws_id;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN NULL;
END;
$$;

COMMENT ON FUNCTION public.get_current_user_workspace() IS
  '取得當前用戶的 workspace_id，使用多種方法確保可靠性';

COMMIT;
