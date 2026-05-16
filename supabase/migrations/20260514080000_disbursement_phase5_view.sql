-- ─────────────────────────────────────────────────────────────────────────────
-- 出納單品項級重構 Phase 5：報表 view 隱藏新舊 link 差異
-- 2026-05-14
--
-- 背景：
--   - 舊：disbursement_orders ← payment_requests.disbursement_order_id（請款單級）
--   - 新：disbursement_orders ← disbursement_order_items.payment_request_item_id（品項級）
--
-- 雙軌 transition 期、報表需要統一介面，不關心新舊。
-- 本 view 把兩種 link 合一、報表用 view 不用直接 JOIN 兩條 link。
--
-- 用法：
--   SELECT * FROM v_disbursement_full WHERE workspace_id = ...
--   每 row = 一個 (disbursement_order, payment_request_item, payment_request) 組合
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

CREATE OR REPLACE VIEW public.v_disbursement_full AS
-- 新模式（disbursement_order_items）
SELECT
  do_.id AS disbursement_order_id,
  do_.code AS disbursement_code,
  do_.disbursement_date,
  do_.status AS disbursement_status,
  do_.bank_account_id AS from_bank_account_id,
  do_.total_fee,
  do_.batch_uuid,
  do_.workspace_id,
  doi.id AS link_id,
  doi.payment_request_item_id,
  doi.amount AS item_amount,
  doi.fee_amount AS item_fee,
  doi.has_cross_bank_fee,
  doi.supplier_bank_code AS snapshot_supplier_bank_code,
  pri.request_id AS payment_request_id,
  pri.description AS item_description,
  pri.category AS item_category,
  pri.tour_id,
  pri.supplier_id,
  pri.supplier_name,
  pr.code AS payment_request_code,
  pr.expense_type,
  pr.amount AS payment_request_total,
  pr.tour_name,
  'item' AS link_mode  -- 識別走哪種 link
FROM public.disbursement_orders do_
JOIN public.disbursement_order_items doi ON doi.disbursement_order_id = do_.id
JOIN public.payment_request_items pri ON pri.id = doi.payment_request_item_id
LEFT JOIN public.payment_requests pr ON pr.id = pri.request_id

UNION ALL

-- 舊模式（payment_requests.disbursement_order_id）— 過渡期保留
SELECT
  do_.id AS disbursement_order_id,
  do_.code AS disbursement_code,
  do_.disbursement_date,
  do_.status AS disbursement_status,
  do_.bank_account_id AS from_bank_account_id,
  COALESCE(do_.total_fee, 0) AS total_fee,
  do_.batch_uuid,
  do_.workspace_id,
  NULL::UUID AS link_id,
  pri.id AS payment_request_item_id,
  pri.subtotal AS item_amount,
  0::NUMERIC AS item_fee,
  FALSE AS has_cross_bank_fee,
  NULL::TEXT AS snapshot_supplier_bank_code,
  pri.request_id AS payment_request_id,
  pri.description AS item_description,
  pri.category AS item_category,
  pri.tour_id,
  pri.supplier_id,
  pri.supplier_name,
  pr.code AS payment_request_code,
  pr.expense_type,
  pr.amount AS payment_request_total,
  pr.tour_name,
  'request' AS link_mode
FROM public.disbursement_orders do_
JOIN public.payment_requests pr ON pr.disbursement_order_id = do_.id
JOIN public.payment_request_items pri ON pri.request_id = pr.id
-- 排除已被新模式收編的（避免雙算）
WHERE NOT EXISTS (
  SELECT 1 FROM public.disbursement_order_items doi2
  WHERE doi2.disbursement_order_id = do_.id
);

COMMENT ON VIEW public.v_disbursement_full IS
  '出納單品項級 view、UNION 新舊兩種 link。報表用 view 不用關心是品項級還是請款單級。
   2026-05-14 Phase 5 雙軌 transition。';

-- 驗證
DO $$
BEGIN
  RAISE NOTICE '✓ v_disbursement_full view 建好（UNION 新舊 link、隱藏 transition）';
END $$;

COMMIT;

-- ════ Rollback ════
-- BEGIN;
-- DROP VIEW IF EXISTS public.v_disbursement_full;
-- COMMIT;
