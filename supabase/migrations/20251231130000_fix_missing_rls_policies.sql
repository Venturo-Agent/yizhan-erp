-- 修復缺少 RLS 政策的 workspaceScoped 表格
-- 確保所有業務資料表都有正確的 RLS 配置

-- ============================================
-- quote_items - 沒有 workspace_id 欄位，禁用 RLS
-- ============================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='quote_items' AND table_schema='public') THEN
    ALTER TABLE public.quote_items DISABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- ============================================
-- receipt_orders - 有 workspace_id 欄位
-- ============================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='receipt_orders' AND table_schema='public') THEN
    ALTER TABLE public.receipt_orders ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='receipt_orders' AND table_schema='public') THEN
    DROP POLICY IF EXISTS "receipt_orders_select" ON public.receipt_orders;
    DROP POLICY IF EXISTS "receipt_orders_insert" ON public.receipt_orders;
    DROP POLICY IF EXISTS "receipt_orders_update" ON public.receipt_orders;
    DROP POLICY IF EXISTS "receipt_orders_delete" ON public.receipt_orders;

    CREATE POLICY "receipt_orders_select" ON public.receipt_orders
      FOR SELECT TO authenticated
      USING (workspace_id IS NULL OR workspace_id = get_current_user_workspace() OR is_super_admin());

    CREATE POLICY "receipt_orders_insert" ON public.receipt_orders
      FOR INSERT TO authenticated
      WITH CHECK (workspace_id IS NULL OR workspace_id = get_current_user_workspace() OR is_super_admin());

    CREATE POLICY "receipt_orders_update" ON public.receipt_orders
      FOR UPDATE TO authenticated
      USING (workspace_id IS NULL OR workspace_id = get_current_user_workspace() OR is_super_admin());

    CREATE POLICY "receipt_orders_delete" ON public.receipt_orders
      FOR DELETE TO authenticated
      USING (workspace_id IS NULL OR workspace_id = get_current_user_workspace() OR is_super_admin());
  END IF;
END $$;

-- ============================================
-- tour_addons - 沒有 workspace_id 欄位，禁用 RLS
-- ============================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='tour_addons' AND table_schema='public') THEN
    ALTER TABLE public.tour_addons DISABLE ROW LEVEL SECURITY;
  END IF;
END $$;
