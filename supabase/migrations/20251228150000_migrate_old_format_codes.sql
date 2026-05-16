-- Migration: 更新舊格式編號為新格式
-- 員工編號: TP-E001, TC-E001 → E001
-- 收款單號: TP-R2501280001 → {團號}-R{序號}

BEGIN;

-- ============================================
-- 1. 更新員工編號（移除 TP- 或 TC- 前綴）
-- ============================================
UPDATE public.employees
SET
  employee_number = REGEXP_REPLACE(employee_number, '^(TP|TC)-', ''),
  updated_at = NOW()
WHERE employee_number ~ '^(TP|TC)-E\d{3}$';

-- ============================================
-- 2. 更新收款單號（從舊格式轉換為新格式）
-- ============================================
-- 使用 tour_id 直接關聯（如果存在）
WITH receipt_tour_mapping AS (
  SELECT
    r.id AS receipt_id,
    r.receipt_number AS old_number,
    t.code AS tour_code,
    ROW_NUMBER() OVER (
      PARTITION BY r.tour_id
      ORDER BY r.created_at
    ) AS seq_num
  FROM public.receipts r
  INNER JOIN public.tours t ON r.tour_id = t.id
  WHERE
    r.receipt_number ~ '^(TP|TC)?-?R\d{10}$'
    AND t.code IS NOT NULL
    AND t.code != ''
    AND r.tour_id IS NOT NULL
)
UPDATE public.receipts r
SET
  receipt_number = rtm.tour_code || '-R' || LPAD(rtm.seq_num::TEXT, 2, '0'),
  updated_at = NOW()
FROM receipt_tour_mapping rtm
WHERE r.id = rtm.receipt_id;

-- ============================================
-- 3. 更新訂單編號（如果有舊格式）
-- ============================================
-- 舊格式: 可能是 {團號}-01 而非 {團號}-O01
WITH order_update AS (
  SELECT
    o.id AS order_id,
    o.order_number AS old_number,
    t.code AS tour_code,
    ROW_NUMBER() OVER (
      PARTITION BY t.id
      ORDER BY o.created_at
    ) AS seq_num
  FROM public.orders o
  INNER JOIN public.tours t ON o.tour_id = t.id
  WHERE
    o.order_number ~ '-\d{2}$'
    AND o.order_number !~ '-O\d{2}$'
    AND t.code IS NOT NULL
)
UPDATE public.orders o
SET
  order_number = ou.tour_code || '-O' || LPAD(ou.seq_num::TEXT, 2, '0'),
  updated_at = NOW()
FROM order_update ou
WHERE o.id = ou.order_id;

-- ============================================
-- 4. 驗證結果
-- ============================================
DO $$
DECLARE
  old_employee_count INTEGER;
  old_receipt_count INTEGER;
  old_order_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO old_employee_count
  FROM public.employees
  WHERE employee_number ~ '^(TP|TC)-';

  SELECT COUNT(*) INTO old_receipt_count
  FROM public.receipts
  WHERE receipt_number ~ '^(TP|TC)?-?R\d{10}$';

  SELECT COUNT(*) INTO old_order_count
  FROM public.orders
  WHERE order_number ~ '-\d{2}$' AND order_number !~ '-O\d{2}$';

  RAISE NOTICE '=== Migration Result ===';
  RAISE NOTICE 'Remaining old format employees: %', old_employee_count;
  RAISE NOTICE 'Remaining old format receipts: %', old_receipt_count;
  RAISE NOTICE 'Remaining old format orders: %', old_order_count;

  IF old_employee_count > 0 OR old_receipt_count > 0 OR old_order_count > 0 THEN
    RAISE NOTICE 'Warning: Some records could not be migrated (missing tour association)';
  ELSE
    RAISE NOTICE 'All records migrated successfully!';
  END IF;
END $$;

COMMIT;
