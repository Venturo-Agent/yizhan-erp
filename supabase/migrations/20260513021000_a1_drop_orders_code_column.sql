-- ─────────────────────────────────────────────────────────────────────────────
-- A1: 砍 orders.code 雙欄位 SSOT 收斂（William 2026-05-13 拍板）
--
-- 背景：
--   orders 表有 code + order_number 雙欄位、寫法不一致（pattern-matrix audit 發現）：
--   - 21 row code = tour_code prefix（早期寫法）
--   - 3 row code = order_number（自洽）
--   - 356 row order_number 是空字串（御風 demo data）
--   - 358 row 為 "other"（混亂）
--
--   William 拍板：留 order_number 為 SSOT、砍 code 欄位。
--
-- 本 migration 做：
--   1. 把 empty string order_number 改 NULL（NULL 不違反 unique）
--   2. 加新 unique (workspace_id, order_number)（NULLS DISTINCT default）
--   3. drop 舊 unique (workspace_id, code)
--   4. drop column code（最後）
--
-- 風險：
--   - 已驗證 frontend 所有 `order.code` reader 都改成 `order.order_number`
--   - 無 writer 寫 `orders.code`、drop 不影響寫入路徑
--   - 對 356 個 empty order_number rows、改 NULL 不影響業務（demo data、未編號訂單）
--
-- 紅線檢核：
--   - 不動 RLS / workspaces / FORCE
--   - 不動 admin client
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- Step 1: empty order_number → NULL
DO $$
DECLARE v_count int;
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.orders WHERE order_number = '';
  RAISE NOTICE 'orders with empty order_number: % (將改 NULL)', v_count;
END $$;

UPDATE public.orders SET order_number = NULL WHERE order_number = '';

-- Step 2: 確認改完無 empty
DO $$
DECLARE v_count int;
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.orders WHERE order_number = '';
  IF v_count > 0 THEN RAISE EXCEPTION 'Step 1 失敗、仍有 % 個 empty', v_count; END IF;
END $$;

-- Step 3: 加新 unique（NULLS DISTINCT 預設、多個 NULL 不違規）
ALTER TABLE public.orders
  ADD CONSTRAINT orders_workspace_order_number_unique
  UNIQUE (workspace_id, order_number);

-- Step 4: drop 舊 unique on code
ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_workspace_code_key;

-- Step 5: drop column code
ALTER TABLE public.orders DROP COLUMN code;

-- 驗證
DO $$
DECLARE
  v_has_code int;
  v_has_new_constraint int;
BEGIN
  SELECT COUNT(*) INTO v_has_code
  FROM information_schema.columns
  WHERE table_schema='public' AND table_name='orders' AND column_name='code';

  SELECT COUNT(*) INTO v_has_new_constraint
  FROM pg_constraint
  WHERE conrelid='public.orders'::regclass
    AND conname='orders_workspace_order_number_unique';

  IF v_has_code > 0 THEN RAISE EXCEPTION 'orders.code 沒砍乾淨'; END IF;
  IF v_has_new_constraint = 0 THEN RAISE EXCEPTION '新 unique constraint 沒建好'; END IF;

  RAISE NOTICE '✓ A1 完成：orders.code 砍光、order_number 為 SSOT 並 UNIQUE';
END $$;

COMMIT;
