-- 補齊所有表格的審計欄位 (created_by, updated_by)
-- 使用 DO 塊安全檢查表是否存在，避免因表已刪除而報錯

DO $$
DECLARE
  tbl TEXT;
  tables_with_both TEXT[] := ARRAY[
    'tours', 'itineraries', 'orders', 'order_members', 'customers',
    'quotes', 'quote_items', 'payment_requests', 'receipt_orders',
    'suppliers', 'calendar_events', 'channels', 'todos'
  ];
  tables_with_updated_only TEXT[] := ARRAY['disbursement_orders', 'visas'];
BEGIN
  -- 表格需要 created_by + updated_by
  FOREACH tbl IN ARRAY tables_with_both LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS created_by UUID', tbl);
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS updated_by UUID', tbl);
    END IF;
  END LOOP;

  -- 表格只需要 updated_by
  FOREACH tbl IN ARRAY tables_with_updated_only LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS updated_by UUID', tbl);
    END IF;
  END LOOP;
END $$;
