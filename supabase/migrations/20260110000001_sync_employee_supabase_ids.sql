-- ============================================
-- 同步員工的 supabase_user_id
-- ============================================
-- 問題：某些員工的 supabase_user_id 為 NULL
-- 導致 getServerAuth() 無法找到員工，DM 功能失敗
--
-- 解決方案：
-- 1. 根據 email 匹配 auth.users，更新 supabase_user_id
-- 2. 根據 employee_number 格式的 email 匹配
-- ============================================

BEGIN;

-- 方法 1: 根據 personal_info.email 匹配
UPDATE public.employees e
SET supabase_user_id = au.id
FROM auth.users au
WHERE e.supabase_user_id IS NULL
  AND e.personal_info->>'email' IS NOT NULL
  AND LOWER(au.email) = LOWER(e.personal_info->>'email');

-- 方法 2: 根據 {employee_number}@venturo.com 格式匹配
UPDATE public.employees e
SET supabase_user_id = au.id
FROM auth.users au
WHERE e.supabase_user_id IS NULL
  AND LOWER(au.email) = LOWER(e.employee_number || '@venturo.com');

-- 方法 3: 根據 {workspace_code}_{employee_number}@venturo.com 格式匹配
UPDATE public.employees e
SET supabase_user_id = au.id
FROM auth.users au, public.workspaces w
WHERE e.supabase_user_id IS NULL
  AND e.workspace_id = w.id
  AND LOWER(au.email) = LOWER(UPPER(w.code) || '_' || e.employee_number || '@venturo.com');

COMMIT;

DO $$
DECLARE
  synced_count integer;
  missing_count integer;
BEGIN
  -- 統計同步結果
  SELECT COUNT(*) INTO synced_count
  FROM public.employees
  WHERE supabase_user_id IS NOT NULL;

  SELECT COUNT(*) INTO missing_count
  FROM public.employees
  WHERE supabase_user_id IS NULL
    AND employee_number NOT IN ('BOT001'); -- 機器人不需要

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ 員工 supabase_user_id 同步完成';
  RAISE NOTICE '========================================';
  RAISE NOTICE '已綁定: % 位員工', synced_count;
  RAISE NOTICE '未綁定: % 位員工（需要重新登入）', missing_count;
  RAISE NOTICE '';
  RAISE NOTICE '未綁定的員工需要重新登入系統，';
  RAISE NOTICE '登入時會自動同步 supabase_user_id';
  RAISE NOTICE '========================================';
END $$;
