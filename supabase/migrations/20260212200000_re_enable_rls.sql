-- ============================================
-- 重新啟用所有業務表格 RLS
-- ============================================
-- 原因: 即使是單租戶模式，RLS 仍是重要的安全層
-- 覆蓋: 20260102234000_disable_rls_for_single_tenant.sql
-- ============================================

BEGIN;

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
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
      RAISE NOTICE '✓ 啟用 % RLS', tbl;
    END IF;
  END LOOP;
END $$;

COMMIT;
