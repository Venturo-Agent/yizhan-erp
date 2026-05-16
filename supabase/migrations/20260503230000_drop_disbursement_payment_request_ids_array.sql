-- ============================================================================
-- 20260503230000_drop_disbursement_payment_request_ids_array.sql
--
-- 砍 disbursement_orders.payment_request_ids array
--
-- # 為什麼
-- 上一張 migration（20260503220000）把 1-to-N 綁定改成 FK 方向
--   payment_requests.disbursement_order_id → disbursement_orders.id
-- 資料已 100% migrate（12 筆全部對齊）、cascade trigger 已改用 FK 不讀 array、
-- 此欄位變成 dead column、砍。
-- ============================================================================

ALTER TABLE public.disbursement_orders DROP COLUMN IF EXISTS payment_request_ids;
