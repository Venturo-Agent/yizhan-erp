-- ============================================
-- Fix All RLS Policies for NULL workspace_id
-- ============================================
-- 日期: 2025-12-12
-- 問題: 多個表的舊資料沒有 workspace_id，被 RLS 擋住
-- 解決: 允許 workspace_id IS NULL 的舊資料

BEGIN;

-- ============================================
-- 需要修復的表格清單
-- ============================================
-- 這些表格啟用了 RLS，但舊資料可能沒有 workspace_id

DO $$
DECLARE
  tables_to_fix text[] := ARRAY[
    'orders', 'tours', 'customers', 'payments', 'payment_requests',
    'disbursement_orders', 'receipts', 'quotes', 'contracts',
    'itineraries', 'itinerary_items', 'visas', 'vendor_costs',
    'refunds', 'ledgers', 'linkpay_logs', 'confirmations',
    'disbursements', 'tasks', 'todos',
    'bulletins', 'esims', 'tour_participants', 'contacts',
    'payment_request_items', 'companies', 'company_contacts',
    'company_announcements', 'tour_addons', 'channels', 'channel_groups'
  ];
  tbl text;
  has_workspace_id boolean;
BEGIN
  FOREACH tbl IN ARRAY tables_to_fix
  LOOP
    -- 檢查表格是否存在
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = tbl) THEN
      -- 檢查是否有 workspace_id 欄位
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = tbl
        AND column_name = 'workspace_id'
      ) INTO has_workspace_id;

      IF has_workspace_id THEN
        -- 刪除現有 policies
        EXECUTE format('DROP POLICY IF EXISTS "%s_select" ON public.%I', tbl, tbl);
        EXECUTE format('DROP POLICY IF EXISTS "%s_insert" ON public.%I', tbl, tbl);
        EXECUTE format('DROP POLICY IF EXISTS "%s_update" ON public.%I', tbl, tbl);
        EXECUTE format('DROP POLICY IF EXISTS "%s_delete" ON public.%I', tbl, tbl);

        -- SELECT: 看自己分公司 OR NULL（舊資料）OR 超級管理員
        EXECUTE format(
          'CREATE POLICY "%s_select" ON public.%I FOR SELECT ' ||
          'USING (' ||
          '  workspace_id IS NULL ' ||
          '  OR workspace_id = get_current_user_workspace() ' ||
          '  OR is_super_admin()' ||
          ')',
          tbl, tbl
        );

        -- INSERT: 允許新增（workspace_id 可以為 NULL 向後相容）
        EXECUTE format(
          'CREATE POLICY "%s_insert" ON public.%I FOR INSERT ' ||
          'WITH CHECK (' ||
          '  workspace_id IS NULL ' ||
          '  OR workspace_id = get_current_user_workspace()' ||
          ')',
          tbl, tbl
        );

        -- UPDATE: 只能改自己分公司 OR NULL OR 超級管理員
        EXECUTE format(
          'CREATE POLICY "%s_update" ON public.%I FOR UPDATE ' ||
          'USING (' ||
          '  workspace_id IS NULL ' ||
          '  OR workspace_id = get_current_user_workspace() ' ||
          '  OR is_super_admin()' ||
          ')',
          tbl, tbl
        );

        -- DELETE: 只能刪自己分公司 OR NULL OR 超級管理員
        EXECUTE format(
          'CREATE POLICY "%s_delete" ON public.%I FOR DELETE ' ||
          'USING (' ||
          '  workspace_id IS NULL ' ||
          '  OR workspace_id = get_current_user_workspace() ' ||
          '  OR is_super_admin()' ||
          ')',
          tbl, tbl
        );

        RAISE NOTICE '✅ Fixed RLS policies for: %', tbl;
      ELSE
        RAISE NOTICE '⏭️ Table % has no workspace_id column, skipping', tbl;
      END IF;
    ELSE
      RAISE NOTICE '⏭️ Table % does not exist, skipping', tbl;
    END IF;
  END LOOP;
END $$;

COMMIT;

-- 驗證
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public';

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ All RLS Policies Fixed!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '  • 允許 workspace_id IS NULL 的舊資料';
  RAISE NOTICE '  • 總共 % 個 RLS policies', policy_count;
  RAISE NOTICE '========================================';
END $$;
