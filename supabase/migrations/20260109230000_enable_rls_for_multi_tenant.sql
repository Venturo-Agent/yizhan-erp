-- ============================================
-- 重新啟用業務表格 RLS（多公司模式）
-- ============================================
-- 原因: 新增勁陽旅行社 (UTOUR)，需要資料隔離
-- ============================================

BEGIN;

-- ============================================
-- 重建所有業務表格的 RLS Policies
-- ============================================

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
        -- 啟用 RLS
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);

        -- 刪除舊的 policies
        EXECUTE format('DROP POLICY IF EXISTS "%s_select" ON public.%I', tbl, tbl);
        EXECUTE format('DROP POLICY IF EXISTS "%s_insert" ON public.%I', tbl, tbl);
        EXECUTE format('DROP POLICY IF EXISTS "%s_update" ON public.%I', tbl, tbl);
        EXECUTE format('DROP POLICY IF EXISTS "%s_delete" ON public.%I', tbl, tbl);

        -- SELECT: 只能看到自己 workspace 的資料，super_admin 可看全部
        EXECUTE format(
          'CREATE POLICY "%s_select" ON public.%I FOR SELECT ' ||
          'USING (' ||
          '  is_super_admin() ' ||
          '  OR (get_current_user_workspace() IS NOT NULL AND workspace_id = get_current_user_workspace())' ||
          ')',
          tbl, tbl
        );

        -- INSERT: 只能新增到自己 workspace
        EXECUTE format(
          'CREATE POLICY "%s_insert" ON public.%I FOR INSERT ' ||
          'WITH CHECK (' ||
          '  is_super_admin() ' ||
          '  OR (get_current_user_workspace() IS NOT NULL AND workspace_id = get_current_user_workspace())' ||
          ')',
          tbl, tbl
        );

        -- UPDATE: 只能更新自己 workspace 的資料
        EXECUTE format(
          'CREATE POLICY "%s_update" ON public.%I FOR UPDATE ' ||
          'USING (' ||
          '  is_super_admin() ' ||
          '  OR (get_current_user_workspace() IS NOT NULL AND workspace_id = get_current_user_workspace())' ||
          ')',
          tbl, tbl
        );

        -- DELETE: 只能刪除自己 workspace 的資料
        EXECUTE format(
          'CREATE POLICY "%s_delete" ON public.%I FOR DELETE ' ||
          'USING (' ||
          '  is_super_admin() ' ||
          '  OR (get_current_user_workspace() IS NOT NULL AND workspace_id = get_current_user_workspace())' ||
          ')',
          tbl, tbl
        );

        RAISE NOTICE '✓ 啟用 % 的 RLS', tbl;
      ELSE
        RAISE NOTICE '⚠ % 沒有 workspace_id 欄位，跳過', tbl;
      END IF;
    ELSE
      RAISE NOTICE '⚠ % 表格不存在，跳過', tbl;
    END IF;
  END LOOP;
END $$;

COMMIT;

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ RLS 已啟用（多公司模式）';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '公司資料隔離:';
  RAISE NOTICE '  • 角落 (TP/TC) 只能看到角落的資料';
  RAISE NOTICE '  • 勁陽 (UTOUR) 只能看到勁陽的資料';
  RAISE NOTICE '  • Super Admin 可以跨公司查看';
  RAISE NOTICE '========================================';
END $$;
