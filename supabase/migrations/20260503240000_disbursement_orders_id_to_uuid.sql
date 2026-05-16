-- ============================================================================
-- 20260503240000_disbursement_orders_id_to_uuid.sql
--
-- disbursement_orders.id 從 text → uuid（schema 一致性）
--
-- # 為什麼
-- 其他表（payment_requests / receipts / tours / orders）的 id 都是 uuid、
-- 偏偏 disbursement_orders.id 是 text、storing UUID 字串但型別錯。
-- 連帶污染：payment_requests.disbursement_order_id 為了配合也只能用 text。
--
-- # 為什麼現在改
-- 現有 6 筆全是合法 UUID 格式（已驗證）、SaaS 化後資料量上升再改成本指數上升。
-- ALTER COLUMN ... USING id::uuid 是 metadata + 一次型別轉換、瞬間完成。
--
-- # 怎麼改
-- 1. 砍 FK（payment_requests.disbursement_order_id → disbursement_orders.id）
-- 2. ALTER disbursement_orders.id TYPE uuid
-- 3. ALTER payment_requests.disbursement_order_id TYPE uuid
-- 4. 重建 FK（ON DELETE SET NULL 不變）
-- ============================================================================

BEGIN;

ALTER TABLE public.payment_requests
  DROP CONSTRAINT IF EXISTS payment_requests_disbursement_order_id_fkey;

ALTER TABLE public.disbursement_orders
  ALTER COLUMN id TYPE uuid USING id::uuid;

ALTER TABLE public.payment_requests
  ALTER COLUMN disbursement_order_id TYPE uuid USING disbursement_order_id::uuid;

ALTER TABLE public.payment_requests
  ADD CONSTRAINT payment_requests_disbursement_order_id_fkey
  FOREIGN KEY (disbursement_order_id)
  REFERENCES public.disbursement_orders(id)
  ON DELETE SET NULL;

COMMENT ON COLUMN public.disbursement_orders.id IS '出納單主鍵（uuid、SaaS 一致性、不再是 text）';
COMMENT ON COLUMN public.payment_requests.disbursement_order_id IS '所屬出納單 FK（uuid、跟 disbursement_orders.id 對齊）';

COMMIT;
