-- 修復沒有 workspace_id 的業務資料
-- 將 workspace_id = NULL 的資料分配給 TP（角落台北）
-- 這樣新公司（如 JY）就不會看到舊資料

BEGIN;

DO $$
DECLARE
  tp_workspace_id uuid;
  affected_count integer;
  total_affected integer := 0;
BEGIN
  -- 嘗試找 TP 或 CORNER workspace
  SELECT id INTO tp_workspace_id FROM public.workspaces WHERE code IN ('TP', 'CORNER', 'corner') LIMIT 1;

  IF tp_workspace_id IS NULL THEN
    RAISE NOTICE 'No TP/CORNER workspace found, skipping null workspace fix';
    RETURN;
  END IF;

  -- 顧客
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'customers') THEN
    UPDATE public.customers SET workspace_id = tp_workspace_id WHERE workspace_id IS NULL;
    GET DIAGNOSTICS affected_count = ROW_COUNT;
    IF affected_count > 0 THEN
      RAISE NOTICE 'Updated % customers', affected_count;
      total_affected := total_affected + affected_count;
    END IF;
  END IF;

  -- 旅遊團
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'tours') THEN
    UPDATE public.tours SET workspace_id = tp_workspace_id WHERE workspace_id IS NULL;
    GET DIAGNOSTICS affected_count = ROW_COUNT;
    IF affected_count > 0 THEN
      RAISE NOTICE 'Updated % tours', affected_count;
      total_affected := total_affected + affected_count;
    END IF;
  END IF;

  -- 訂單
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'orders') THEN
    UPDATE public.orders SET workspace_id = tp_workspace_id WHERE workspace_id IS NULL;
    GET DIAGNOSTICS affected_count = ROW_COUNT;
    IF affected_count > 0 THEN
      RAISE NOTICE 'Updated % orders', affected_count;
      total_affected := total_affected + affected_count;
    END IF;
  END IF;

  -- 報價單
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'quotes') THEN
    UPDATE public.quotes SET workspace_id = tp_workspace_id WHERE workspace_id IS NULL;
    GET DIAGNOSTICS affected_count = ROW_COUNT;
    IF affected_count > 0 THEN
      RAISE NOTICE 'Updated % quotes', affected_count;
      total_affected := total_affected + affected_count;
    END IF;
  END IF;

  -- 行程表
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'itineraries') THEN
    UPDATE public.itineraries SET workspace_id = tp_workspace_id WHERE workspace_id IS NULL;
    GET DIAGNOSTICS affected_count = ROW_COUNT;
    IF affected_count > 0 THEN
      RAISE NOTICE 'Updated % itineraries', affected_count;
      total_affected := total_affected + affected_count;
    END IF;
  END IF;

  -- 收款單
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'receipts') THEN
    UPDATE public.receipts SET workspace_id = tp_workspace_id WHERE workspace_id IS NULL;
    GET DIAGNOSTICS affected_count = ROW_COUNT;
    IF affected_count > 0 THEN
      RAISE NOTICE 'Updated % receipts', affected_count;
      total_affected := total_affected + affected_count;
    END IF;
  END IF;

  -- 請款單
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'payment_requests') THEN
    UPDATE public.payment_requests SET workspace_id = tp_workspace_id WHERE workspace_id IS NULL;
    GET DIAGNOSTICS affected_count = ROW_COUNT;
    IF affected_count > 0 THEN
      RAISE NOTICE 'Updated % payment_requests', affected_count;
      total_affected := total_affected + affected_count;
    END IF;
  END IF;

  -- 出納單
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'disbursement_orders') THEN
    UPDATE public.disbursement_orders SET workspace_id = tp_workspace_id WHERE workspace_id IS NULL;
    GET DIAGNOSTICS affected_count = ROW_COUNT;
    IF affected_count > 0 THEN
      RAISE NOTICE 'Updated % disbursement_orders', affected_count;
      total_affected := total_affected + affected_count;
    END IF;
  END IF;

  -- 簽證
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'visas') THEN
    UPDATE public.visas SET workspace_id = tp_workspace_id WHERE workspace_id IS NULL;
    GET DIAGNOSTICS affected_count = ROW_COUNT;
    IF affected_count > 0 THEN
      RAISE NOTICE 'Updated % visas', affected_count;
      total_affected := total_affected + affected_count;
    END IF;
  END IF;

  -- 待辦事項
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'todos') THEN
    UPDATE public.todos SET workspace_id = tp_workspace_id WHERE workspace_id IS NULL;
    GET DIAGNOSTICS affected_count = ROW_COUNT;
    IF affected_count > 0 THEN
      RAISE NOTICE 'Updated % todos', affected_count;
      total_affected := total_affected + affected_count;
    END IF;
  END IF;

  -- 行事曆
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'calendar_events') THEN
    UPDATE public.calendar_events SET workspace_id = tp_workspace_id WHERE workspace_id IS NULL;
    GET DIAGNOSTICS affected_count = ROW_COUNT;
    IF affected_count > 0 THEN
      RAISE NOTICE 'Updated % calendar_events', affected_count;
      total_affected := total_affected + affected_count;
    END IF;
  END IF;

  -- 頻道
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'channels') THEN
    UPDATE public.channels SET workspace_id = tp_workspace_id WHERE workspace_id IS NULL;
    GET DIAGNOSTICS affected_count = ROW_COUNT;
    IF affected_count > 0 THEN
      RAISE NOTICE 'Updated % channels', affected_count;
      total_affected := total_affected + affected_count;
    END IF;
  END IF;

  RAISE NOTICE '==========================================';
  RAISE NOTICE 'Total records updated: %', total_affected;
  RAISE NOTICE '==========================================';
END $$;

COMMIT;
