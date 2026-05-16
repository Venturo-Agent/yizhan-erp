-- ============================================
-- 完整 RLS：所有有 workspace_id 的表都啟用 RLS + Policy
-- ============================================
-- 此 migration 統一處理所有有 workspace_id 欄位的表格
-- 使用動態 SQL 自動偵測並建立 policy
-- ============================================

BEGIN;

DO $$
DECLARE
  tbl text;
  rec record;
BEGIN
  -- 遍歷所有 public schema 中有 workspace_id 欄位的表
  FOR rec IN
    SELECT DISTINCT c.table_name
    FROM information_schema.columns c
    JOIN pg_tables t ON t.tablename = c.table_name AND t.schemaname = 'public'
    WHERE c.table_schema = 'public'
      AND c.column_name = 'workspace_id'
      AND c.table_name NOT LIKE '\_%'  -- 排除系統表
    ORDER BY c.table_name
  LOOP
    tbl := rec.table_name;

    -- 啟用 RLS
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);

    -- 刪除舊的 policies（避免衝突）
    EXECUTE format('DROP POLICY IF EXISTS "%s_select" ON public.%I', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "%s_insert" ON public.%I', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "%s_update" ON public.%I', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "%s_delete" ON public.%I', tbl, tbl);

    -- SELECT: workspace 匹配或 super_admin
    -- 使用 ::text 轉換確保 text/uuid 欄位都相容
    EXECUTE format(
      'CREATE POLICY "%s_select" ON public.%I FOR SELECT ' ||
      'USING (' ||
      '  is_super_admin() ' ||
      '  OR workspace_id::text = get_current_user_workspace()::text' ||
      ')',
      tbl, tbl
    );

    -- INSERT: workspace 匹配或 super_admin
    EXECUTE format(
      'CREATE POLICY "%s_insert" ON public.%I FOR INSERT ' ||
      'WITH CHECK (' ||
      '  is_super_admin() ' ||
      '  OR workspace_id::text = get_current_user_workspace()::text' ||
      ')',
      tbl, tbl
    );

    -- UPDATE: workspace 匹配或 super_admin
    EXECUTE format(
      'CREATE POLICY "%s_update" ON public.%I FOR UPDATE ' ||
      'USING (' ||
      '  is_super_admin() ' ||
      '  OR workspace_id::text = get_current_user_workspace()::text' ||
      ')',
      tbl, tbl
    );

    -- DELETE: workspace 匹配或 super_admin
    EXECUTE format(
      'CREATE POLICY "%s_delete" ON public.%I FOR DELETE ' ||
      'USING (' ||
      '  is_super_admin() ' ||
      '  OR workspace_id::text = get_current_user_workspace()::text' ||
      ')',
      tbl, tbl
    );

    RAISE NOTICE '✓ RLS + Policy 完成: %', tbl;
  END LOOP;
END $$;

-- ============================================
-- 沒有 workspace_id 的公共參考資料表
-- 只需 RLS + authenticated 可讀
-- ============================================
DO $$
DECLARE
  tbl text;
  public_tables text[] := ARRAY[
    'ref_airlines', 'ref_booking_classes', 'ref_ssr_codes', 'ref_status_codes',
    'cover_templates', 'daily_templates', 'features_templates',
    'flight_templates', 'hotel_templates', 'leader_templates',
    'pricing_templates', 'templates', 'travel_card_templates',
    'expense_categories', 'categories', 'quote_categories'
  ];
BEGIN
  FOREACH tbl IN ARRAY public_tables
  LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = tbl) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
      EXECUTE format('DROP POLICY IF EXISTS "%s_authenticated_access" ON public.%I', tbl, tbl);
      EXECUTE format(
        'CREATE POLICY "%s_authenticated_access" ON public.%I FOR ALL ' ||
        'USING (auth.role() = ''authenticated'')',
        tbl, tbl
      );
      RAISE NOTICE '✓ 公共表 RLS: %', tbl;
    END IF;
  END LOOP;
END $$;

COMMIT;
