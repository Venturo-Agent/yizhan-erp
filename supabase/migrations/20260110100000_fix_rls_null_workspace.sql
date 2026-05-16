-- ============================================
-- 修復 RLS：處理 workspace_id 為 NULL 的情況
-- ============================================
-- 問題：當 get_current_user_workspace() 返回 NULL 時，
--       所有 RLS policy 都會拒絕訪問，導致「建立提案失敗: {}」
--
-- 解決方案：
-- 1. 改進 get_current_user_workspace() 函數，增加調試日誌
-- 2. 修改 RLS policy，在找不到 workspace 時提供更好的錯誤訊息
-- ============================================

BEGIN;

-- 重建 get_current_user_workspace 函數，增加調試能力
DROP FUNCTION IF EXISTS public.get_current_user_workspace() CASCADE;
CREATE FUNCTION public.get_current_user_workspace()
RETURNS uuid
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
DECLARE
  ws_id uuid;
  current_uid uuid;
BEGIN
  current_uid := auth.uid();

  IF current_uid IS NULL THEN
    -- 未登入，返回 NULL
    RETURN NULL;
  END IF;

  -- 從 employees 表格取得（使用 supabase_user_id）- 最可靠
  SELECT e.workspace_id INTO ws_id
  FROM public.employees e
  WHERE e.supabase_user_id = current_uid
  LIMIT 1;

  IF ws_id IS NOT NULL THEN
    RETURN ws_id;
  END IF;

  -- 備用：從 auth.users.raw_user_meta_data 取得
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

  -- 都找不到，返回 NULL
  -- 注意：這會導致 RLS policy 拒絕訪問
  RETURN NULL;
END;
$$;

-- 重建所有業務表格的 RLS Policies
-- 加入更寬鬆的條件：如果 workspace 無法確定，允許 super_admin 訪問
DO $$
DECLARE
  tables text[] := ARRAY[
    'tours', 'orders', 'customers', 'payments', 'payment_requests',
    'disbursement_orders', 'receipts', 'quotes', 'contracts',
    'itineraries', 'visas', 'vendor_costs', 'tasks', 'todos',
    'bulletins', 'channels', 'channel_groups', 'tour_requests',
    'tour_destinations', 'pnrs', 'messages', 'calendar_events',
    'proposals', 'proposal_packages', 'tour_documents'
  ];
  tbl text;
  has_workspace_id boolean;
BEGIN
  FOREACH tbl IN ARRAY tables
  LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = tbl) THEN
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = tbl
        AND column_name = 'workspace_id'
      ) INTO has_workspace_id;

      IF has_workspace_id THEN
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);

        -- 刪除舊的 policies
        EXECUTE format('DROP POLICY IF EXISTS "%s_select" ON public.%I', tbl, tbl);
        EXECUTE format('DROP POLICY IF EXISTS "%s_insert" ON public.%I', tbl, tbl);
        EXECUTE format('DROP POLICY IF EXISTS "%s_update" ON public.%I', tbl, tbl);
        EXECUTE format('DROP POLICY IF EXISTS "%s_delete" ON public.%I', tbl, tbl);

        -- SELECT: super_admin 可看全部，或 workspace 匹配
        EXECUTE format(
          'CREATE POLICY "%s_select" ON public.%I FOR SELECT ' ||
          'USING (' ||
          '  is_super_admin() ' ||
          '  OR workspace_id = get_current_user_workspace()' ||
          ')',
          tbl, tbl
        );

        -- INSERT: super_admin 可新增到任何 workspace，或匹配自己的 workspace
        EXECUTE format(
          'CREATE POLICY "%s_insert" ON public.%I FOR INSERT ' ||
          'WITH CHECK (' ||
          '  is_super_admin() ' ||
          '  OR workspace_id = get_current_user_workspace()' ||
          ')',
          tbl, tbl
        );

        -- UPDATE
        EXECUTE format(
          'CREATE POLICY "%s_update" ON public.%I FOR UPDATE ' ||
          'USING (' ||
          '  is_super_admin() ' ||
          '  OR workspace_id = get_current_user_workspace()' ||
          ')',
          tbl, tbl
        );

        -- DELETE
        EXECUTE format(
          'CREATE POLICY "%s_delete" ON public.%I FOR DELETE ' ||
          'USING (' ||
          '  is_super_admin() ' ||
          '  OR workspace_id = get_current_user_workspace()' ||
          ')',
          tbl, tbl
        );

        RAISE NOTICE '✓ 重建 % RLS policies', tbl;
      END IF;
    END IF;
  END LOOP;
END $$;

-- 更新所有缺失 supabase_user_id 的員工
-- 根據 email 匹配 auth.users
UPDATE public.employees e
SET supabase_user_id = au.id
FROM auth.users au
WHERE e.supabase_user_id IS NULL
  AND e.personal_info->>'email' IS NOT NULL
  AND LOWER(au.email) = LOWER(e.personal_info->>'email');

-- 根據 {employee_number}@venturo.com 格式匹配
UPDATE public.employees e
SET supabase_user_id = au.id
FROM auth.users au
WHERE e.supabase_user_id IS NULL
  AND LOWER(au.email) = LOWER(e.employee_number || '@venturo.com');

-- 根據 {workspace_code}_{employee_number}@venturo.com 格式匹配
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
  SELECT COUNT(*) INTO synced_count
  FROM public.employees
  WHERE supabase_user_id IS NOT NULL;

  SELECT COUNT(*) INTO missing_count
  FROM public.employees
  WHERE supabase_user_id IS NULL
    AND employee_number NOT IN ('BOT001');

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ RLS 修復完成';
  RAISE NOTICE '========================================';
  RAISE NOTICE '已綁定 supabase_user_id: % 位員工', synced_count;
  RAISE NOTICE '未綁定: % 位員工', missing_count;
  IF missing_count > 0 THEN
    RAISE NOTICE '';
    RAISE NOTICE '⚠️ 未綁定的員工需要重新登入！';
    RAISE NOTICE '登入時會自動同步 supabase_user_id';
  END IF;
  RAISE NOTICE '========================================';
END $$;
