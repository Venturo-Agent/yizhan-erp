-- 修復缺少 tour_id 的收款紀錄
-- 從 order_id 反查 tour_id

BEGIN;

-- 從 order_id 反查 tour_id (receipts.order_id 是 uuid，orders.id 是 text)
UPDATE receipts r
SET tour_id = o.tour_id
FROM orders o
WHERE r.order_id IS NOT NULL
  AND r.order_id::text = o.id
  AND r.tour_id IS NULL
  AND o.tour_id IS NOT NULL;

COMMIT;
