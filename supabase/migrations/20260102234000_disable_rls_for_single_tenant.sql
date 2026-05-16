-- ============================================
-- 暫時關閉業務表格 RLS（單一公司模式）
-- ============================================
-- 原因: 決定未來每個客戶用獨立 Supabase，不需要 RLS 隔離
-- ============================================

BEGIN;

-- 關閉主要業務表格的 RLS（只處理存在的表格）
DO $$
DECLARE
  tables text[] := ARRAY[
    'tours', 'orders', 'customers', 'quotes', 'itineraries',
    'payments', 'payment_requests', 'receipts', 'disbursement_orders',
    'visas', 'tasks', 'todos', 'channels', 'messages', 'calendar_events',
    'countries', 'cities', 'regions', 'tour_requests', 'tour_destinations',
    'vendor_costs', 'bulletins', 'channel_groups', 'pnrs'
  ];
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY tables
  LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = tbl) THEN
      EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', tbl);
      RAISE NOTICE '✓ 關閉 % RLS', tbl;
    END IF;
  END LOOP;
END $$;

COMMIT;

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ RLS 已關閉（單一公司模式）';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '說明:';
  RAISE NOTICE '  • 所有業務表格 RLS 已關閉';
  RAISE NOTICE '  • 適合單一公司使用';
  RAISE NOTICE '  • 未來每個客戶用獨立 Supabase';
  RAISE NOTICE '========================================';
END $$;
