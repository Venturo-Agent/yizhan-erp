-- ============================================
-- 核心業務表 RLS Policy
-- ============================================
-- 日期: 2026-02-25
-- 目的: 為 15 張核心業務表啟用 RLS 並建立 workspace 隔離 policy
-- 參考: 20251211120001_enable_complete_rls_system.sql
--
-- ⚠️ 不存在的表（已標註，DO block 會自動跳過）:
--   - supplier_contacts: 表不存在
--   - contracts: 表不存在
--
-- ⚠️ 名稱對照:
--   - purchase_requests → payment_requests
--   - purchase_request_items → payment_request_items
--   - disbursements → disbursement_orders
-- ============================================

BEGIN;

-- ============================================
-- Part 1: 啟用 RLS
-- ============================================

DO $$
DECLARE
  tables_to_enable text[] := ARRAY[
    'orders', 'order_members', 'tours', 'customers', 'receipts',
    'payment_requests', 'payment_request_items', 'disbursement_orders',
    'suppliers', 'supplier_contacts', 'tour_itinerary_items',
    'quotes', 'contracts', 'visas', 'esims'
  ];
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY tables_to_enable
  LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = tbl) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
      RAISE NOTICE 'Enabled RLS for: %', tbl;
    ELSE
      RAISE NOTICE 'Table does not exist, skipping: %', tbl;
    END IF;
  END LOOP;
END $$;

-- ============================================
-- Part 2: 刪除舊的 Policies（僅限這些表）
-- ============================================

DO $$
DECLARE
  target_tables text[] := ARRAY[
    'orders', 'order_members', 'tours', 'customers', 'receipts',
    'payment_requests', 'payment_request_items', 'disbursement_orders',
    'suppliers', 'supplier_contacts', 'tour_itinerary_items',
    'quotes', 'contracts', 'visas', 'esims'
  ];
  r RECORD;
BEGIN
  FOR r IN
    SELECT tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = ANY(target_tables)
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
    RAISE NOTICE 'Dropped policy: %.%', r.tablename, r.policyname;
  END LOOP;
END $$;

-- ============================================
-- Part 3: 建立 workspace 隔離 Policies
-- ============================================

DO $$
DECLARE
  tables text[] := ARRAY[
    'orders', 'order_members', 'tours', 'customers', 'receipts',
    'payment_requests', 'payment_request_items', 'disbursement_orders',
    'suppliers', 'supplier_contacts', 'tour_itinerary_items',
    'quotes', 'contracts', 'visas', 'esims'
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
        -- SELECT: 看自己分公司 OR 超級管理員
        EXECUTE format(
          'CREATE POLICY "%s_select" ON public.%I FOR SELECT ' ||
          'USING (' ||
          '  workspace_id = get_current_user_workspace() ' ||
          '  OR is_super_admin()' ||
          ')',
          tbl, tbl
        );

        -- INSERT: 只能新增到自己分公司
        EXECUTE format(
          'CREATE POLICY "%s_insert" ON public.%I FOR INSERT ' ||
          'WITH CHECK (workspace_id = get_current_user_workspace())',
          tbl, tbl
        );

        -- UPDATE: 只能改自己分公司 OR 超級管理員
        EXECUTE format(
          'CREATE POLICY "%s_update" ON public.%I FOR UPDATE ' ||
          'USING (' ||
          '  workspace_id = get_current_user_workspace() ' ||
          '  OR is_super_admin()' ||
          ')',
          tbl, tbl
        );

        -- DELETE: 只能刪自己分公司 OR 超級管理員
        EXECUTE format(
          'CREATE POLICY "%s_delete" ON public.%I FOR DELETE ' ||
          'USING (' ||
          '  workspace_id = get_current_user_workspace() ' ||
          '  OR is_super_admin()' ||
          ')',
          tbl, tbl
        );

        RAISE NOTICE 'Created RLS policies for: %', tbl;
      ELSE
        RAISE NOTICE 'Table % has no workspace_id column, skipping policies', tbl;
      END IF;
    ELSE
      RAISE NOTICE 'Table % does not exist, skipping', tbl;
    END IF;
  END LOOP;
END $$;

COMMIT;

-- ============================================
-- Part 4: 驗證結果
-- ============================================

DO $$
DECLARE
  target_tables text[] := ARRAY[
    'orders', 'order_members', 'tours', 'customers', 'receipts',
    'payment_requests', 'payment_request_items', 'disbursement_orders',
    'suppliers', 'tour_itinerary_items', 'quotes', 'visas', 'esims'
  ];
  tbl text;
  rls_on boolean;
  policy_cnt integer;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '核心業務表 RLS 驗證結果';
  RAISE NOTICE '========================================';

  FOREACH tbl IN ARRAY target_tables
  LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = tbl) THEN
      SELECT c.relrowsecurity INTO rls_on
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = tbl;

      SELECT COUNT(*) INTO policy_cnt
      FROM pg_policies
      WHERE schemaname = 'public' AND tablename = tbl;

      RAISE NOTICE '  % — RLS: %, policies: %', tbl, rls_on, policy_cnt;
    ELSE
      RAISE NOTICE '  % — 表不存在', tbl;
    END IF;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '⚠️ 不存在的表（已跳過）:';
  RAISE NOTICE '  - supplier_contacts';
  RAISE NOTICE '  - contracts';
  RAISE NOTICE '========================================';
END $$;
