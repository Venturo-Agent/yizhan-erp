-- ============================================
-- 修正所有業務表格 RLS：NULL 安全版本
-- ============================================
-- 日期: 2026-01-02
-- 問題: 當 get_current_user_workspace() 返回 NULL 時，RLS 查詢失敗返回 404
-- 修正: 所有 policy 加上 NULL 檢查，確保返回空陣列而非 404
-- ============================================

BEGIN;

-- ============================================
-- 重建所有業務表格的 RLS Policies（NULL 安全版本）
-- ============================================

DO $$
DECLARE
  tables text[] := ARRAY[
    'tours', 'orders', 'customers', 'payments', 'payment_requests',
    'disbursement_orders', 'receipts', 'quotes', 'contracts',
    'itineraries', 'visas', 'vendor_costs', 'tasks', 'todos',
    'bulletins', 'channels', 'channel_groups', 'tour_requests',
    'tour_destinations', 'pnrs'
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
        -- 確保 RLS 已啟用
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);

        -- 刪除舊的 policies
        EXECUTE format('DROP POLICY IF EXISTS "%s_select" ON public.%I', tbl, tbl);
        EXECUTE format('DROP POLICY IF EXISTS "%s_insert" ON public.%I', tbl, tbl);
        EXECUTE format('DROP POLICY IF EXISTS "%s_update" ON public.%I', tbl, tbl);
        EXECUTE format('DROP POLICY IF EXISTS "%s_delete" ON public.%I', tbl, tbl);

        -- SELECT: NULL 安全版本
        -- 當 get_current_user_workspace() 返回 NULL 時，不返回任何資料（而非報錯）
        EXECUTE format(
          'CREATE POLICY "%s_select" ON public.%I FOR SELECT ' ||
          'USING (' ||
          '  is_super_admin() ' ||
          '  OR (get_current_user_workspace() IS NOT NULL AND workspace_id = get_current_user_workspace())' ||
          ')',
          tbl, tbl
        );

        -- INSERT: NULL 安全版本
        EXECUTE format(
          'CREATE POLICY "%s_insert" ON public.%I FOR INSERT ' ||
          'WITH CHECK (' ||
          '  is_super_admin() ' ||
          '  OR (get_current_user_workspace() IS NOT NULL AND workspace_id = get_current_user_workspace())' ||
          ')',
          tbl, tbl
        );

        -- UPDATE: NULL 安全版本
        EXECUTE format(
          'CREATE POLICY "%s_update" ON public.%I FOR UPDATE ' ||
          'USING (' ||
          '  is_super_admin() ' ||
          '  OR (get_current_user_workspace() IS NOT NULL AND workspace_id = get_current_user_workspace())' ||
          ')',
          tbl, tbl
        );

        -- DELETE: NULL 安全版本
        EXECUTE format(
          'CREATE POLICY "%s_delete" ON public.%I FOR DELETE ' ||
          'USING (' ||
          '  is_super_admin() ' ||
          '  OR (get_current_user_workspace() IS NOT NULL AND workspace_id = get_current_user_workspace())' ||
          ')',
          tbl, tbl
        );

        RAISE NOTICE '✓ 重建 % 的 NULL 安全 RLS policies', tbl;
      ELSE
        RAISE NOTICE '⚠ % 沒有 workspace_id 欄位，跳過', tbl;
      END IF;
    ELSE
      RAISE NOTICE '⚠ % 表格不存在，跳過', tbl;
    END IF;
  END LOOP;
END $$;

COMMIT;

-- ============================================
-- 驗證
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ 所有業務表格 RLS 已更新為 NULL 安全版本';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '效果:';
  RAISE NOTICE '  • workspace 未設定時返回空陣列，不再返回 404';
  RAISE NOTICE '  • 移除 workspace_id IS NULL 的舊資料例外（更嚴格）';
  RAISE NOTICE '  • Super Admin 可以跨公司查看';
  RAISE NOTICE '========================================';
END $$;
