-- Migration: 修復訂單編號格式
-- 問題1: TP-XXX 前綴需移除
-- 問題2: 缺少 -O 格式 (如 HKG260305A558 → HKG260305A-O01)

BEGIN;

-- ============================================
-- 1. 移除 TP- 前綴的訂單
-- ============================================
-- TP-OSA25121901340 → 需要重新生成
-- TP-CNX26112101401 → 需要重新生成

-- 先處理有 tour_id 的訂單
WITH orders_with_tour AS (
  SELECT
    o.id,
    o.order_number AS old_number,
    t.code AS tour_code,
    ROW_NUMBER() OVER (
      PARTITION BY o.tour_id
      ORDER BY o.created_at
    ) AS seq_num
  FROM public.orders o
  INNER JOIN public.tours t ON o.tour_id = t.id
  WHERE o.order_number LIKE 'TP-%'
)
UPDATE public.orders o
SET
  order_number = owt.tour_code || '-O' || LPAD(owt.seq_num::TEXT, 2, '0'),
  updated_at = NOW()
FROM orders_with_tour owt
WHERE o.id = owt.id;

-- ============================================
-- 2. 修復格式錯誤的訂單 (如 HKG260305A558)
-- ============================================
-- 這類訂單的特徵：團號後面直接跟數字，沒有 -O

WITH orders_wrong_format AS (
  SELECT
    o.id,
    o.order_number AS old_number,
    t.code AS tour_code,
    ROW_NUMBER() OVER (
      PARTITION BY o.tour_id
      ORDER BY o.created_at
    ) AS seq_num
  FROM public.orders o
  INNER JOIN public.tours t ON o.tour_id = t.id
  WHERE
    -- 訂單編號以團號開頭但後面直接跟數字
    o.order_number LIKE t.code || '%'
    AND o.order_number NOT LIKE '%-O%'
    AND o.order_number != t.code
    -- 排除 VISA 和 ESIM 專用團
    AND t.code NOT LIKE 'VISA%'
    AND t.code NOT LIKE 'ESIM%'
)
UPDATE public.orders o
SET
  order_number = owf.tour_code || '-O' || LPAD(owf.seq_num::TEXT, 2, '0'),
  updated_at = NOW()
FROM orders_wrong_format owf
WHERE o.id = owf.id;

-- ============================================
-- 3. 處理沒有 tour_id 但有 TP- 前綴的訂單
-- ============================================
-- 這些訂單無法關聯到團，只能移除前綴
UPDATE public.orders
SET
  order_number = REGEXP_REPLACE(order_number, '^TP-', ''),
  updated_at = NOW()
WHERE
  order_number LIKE 'TP-%'
  AND tour_id IS NULL;

-- ============================================
-- 4. 輸出結果
-- ============================================
DO $$
DECLARE
  tp_count INTEGER;
  wrong_format_count INTEGER;
BEGIN
  -- 還有多少 TP- 前綴
  SELECT COUNT(*) INTO tp_count
  FROM public.orders
  WHERE order_number LIKE 'TP-%';

  -- 還有多少格式錯誤（非 VISA/ESIM）
  SELECT COUNT(*) INTO wrong_format_count
  FROM public.orders o
  JOIN public.tours t ON o.tour_id = t.id
  WHERE
    o.order_number NOT LIKE '%-O%'
    AND t.code NOT LIKE 'VISA%'
    AND t.code NOT LIKE 'ESIM%';

  RAISE NOTICE '=== Migration Result ===';
  RAISE NOTICE 'Remaining TP- prefix orders: %', tp_count;
  RAISE NOTICE 'Remaining wrong format orders: %', wrong_format_count;
END $$;

COMMIT;
