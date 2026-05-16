-- ============================================
-- 修復 RLS 類型轉換問題
-- ============================================
-- 問題: uuid = text 類型不匹配
-- 解決: 確保 workspace_id 比較時類型正確
-- ============================================

BEGIN;

-- 重建 get_current_user_workspace 函數，確保返回 uuid
DROP FUNCTION IF EXISTS public.get_current_user_workspace() CASCADE;
CREATE FUNCTION public.get_current_user_workspace()
RETURNS uuid
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
DECLARE
  ws_id uuid;
  ws_id_text text;
  current_uid uuid;
BEGIN
  current_uid := auth.uid();

  IF current_uid IS NULL THEN
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

  -- 從 auth.users.raw_user_meta_data 取得
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

  RETURN NULL;
END;
$$;

-- 重建 is_super_admin 函數
DROP FUNCTION IF EXISTS public.is_super_admin() CASCADE;
CREATE FUNCTION public.is_super_admin()
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

  -- 從 employees 表格取得 permissions
  SELECT e.permissions INTO emp_permissions
  FROM public.employees e
  WHERE e.supabase_user_id = current_uid
  LIMIT 1;

  RETURN 'super_admin' = ANY(emp_permissions);
END;
$$;

-- 重建所有業務表格的 RLS Policies（確保類型正確）
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

        -- SELECT: 明確轉換類型
        EXECUTE format(
          'CREATE POLICY "%s_select" ON public.%I FOR SELECT ' ||
          'USING (' ||
          '  is_super_admin() ' ||
          '  OR workspace_id = get_current_user_workspace()' ||
          ')',
          tbl, tbl
        );

        -- INSERT
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

COMMIT;

DO $$
BEGIN
  RAISE NOTICE '✅ RLS 類型轉換問題已修復';
END $$;
