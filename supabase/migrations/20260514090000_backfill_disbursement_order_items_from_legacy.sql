-- ─────────────────────────────────────────────────────────────────────────────
-- 出納單品項級重構 — backfill：舊請款單級 link → 品項級 link
-- 2026-05-14
--
-- 背景：
--   Phase 1-5 已完成、新建出納單走 disbursement_order_items（品項級）。
--   既有舊出納單透過 payment_requests.disbursement_order_id 連結（請款單級）。
--   兩套並存讓編輯 UI 必須分新舊、不乾淨。
--
-- 本 migration：
--   把所有 disbursement_orders 經 payment_requests 找到的 items
--   全部寫進 disbursement_order_items、之後編輯統一走品項級 UI。
--
-- 設計：
--   - 不動 payment_requests.disbursement_order_id（保留作 fallback、不雙寫衝突）
--   - amount = pri.subtotal
--   - fee_amount = 0、has_cross_bank_fee = false（舊單沒手續費概念）
--   - supplier_bank_code = snapshot 當下 suppliers.bank_code
--   - ON CONFLICT DO NOTHING（冪等、重跑安全）
--   - workspace_id 跟著 disbursement_orders
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

INSERT INTO public.disbursement_order_items (
  disbursement_order_id,
  payment_request_item_id,
  amount,
  supplier_bank_code,
  fee_amount,
  has_cross_bank_fee,
  workspace_id,
  created_by
)
SELECT
  do_.id,
  pri.id,
  COALESCE(pri.subtotal, 0),
  s.bank_code,
  0,
  FALSE,
  do_.workspace_id,
  do_.created_by
FROM public.disbursement_orders do_
JOIN public.payment_requests pr ON pr.disbursement_order_id = do_.id
JOIN public.payment_request_items pri ON pri.request_id = pr.id
LEFT JOIN public.suppliers s ON s.id = pri.supplier_id
-- 跳過已被新 link 收的（冪等保險）
WHERE NOT EXISTS (
  SELECT 1 FROM public.disbursement_order_items doi
  WHERE doi.payment_request_item_id = pri.id
)
ON CONFLICT (payment_request_item_id) DO NOTHING;

-- 驗證
DO $$
DECLARE
  v_total_items INT;
  v_linked_items INT;
  v_orphan_orders INT;
BEGIN
  SELECT COUNT(*) INTO v_total_items FROM public.disbursement_order_items;
  SELECT COUNT(DISTINCT doi.payment_request_item_id) INTO v_linked_items
  FROM public.disbursement_order_items doi
  JOIN public.payment_requests pr ON pr.id = (
    SELECT request_id FROM public.payment_request_items WHERE id = doi.payment_request_item_id
  );

  -- 看有幾張舊單沒被 backfill（理論上 0、除非 disbursement_orders 有 link 但對應 payment_requests 已刪）
  SELECT COUNT(*) INTO v_orphan_orders
  FROM public.disbursement_orders do_
  WHERE EXISTS (
    SELECT 1 FROM public.payment_requests pr WHERE pr.disbursement_order_id = do_.id
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.disbursement_order_items doi WHERE doi.disbursement_order_id = do_.id
  );

  RAISE NOTICE '✓ disbursement_order_items 總 row 數：%', v_total_items;
  RAISE NOTICE '✓ 對應到請款品項數：%', v_linked_items;
  IF v_orphan_orders > 0 THEN
    RAISE WARNING '⚠ 還有 % 張舊出納單沒對應到 items（payment_requests 可能已刪或無 items）', v_orphan_orders;
  ELSE
    RAISE NOTICE '✓ 所有舊出納單都已 backfill';
  END IF;
END $$;

COMMIT;

-- ════ Rollback ════
-- 注意：rollback 會清空 backfill 寫入的 row、但新建（Phase 3 wizard）的也會被清掉
-- 安全 rollback 條件：只清「沒對應 disbursement_orders.batch_uuid」的（舊 backfill = batch_uuid IS NULL）
-- BEGIN;
-- DELETE FROM public.disbursement_order_items doi
-- WHERE EXISTS (
--   SELECT 1 FROM public.disbursement_orders do_
--   WHERE do_.id = doi.disbursement_order_id AND do_.batch_uuid IS NULL
-- );
-- COMMIT;
