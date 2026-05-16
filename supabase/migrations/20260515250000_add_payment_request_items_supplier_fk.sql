-- ════════════════════════════════════════════════════════════════════════════
-- 加 payment_request_items.supplier_id → suppliers(id) FK
--
-- Bug：5/14 wizard query 用 `suppliers:supplier_id(bank_code, bank_name)` join、
-- 但 payment_request_items.supplier_id 從沒設 FK 到 suppliers(id)、
-- PostgREST 400 Bad Request：「Could not find a relationship」。
-- 結果 wizard 撈不到 items、列表空。
--
-- 修：補 FK constraint、先清掉孤兒 supplier_id（指向不存在 supplier）。
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

-- 1. 清掉指向不存在 supplier 的 orphan supplier_id（設成 NULL）
UPDATE public.payment_request_items
SET supplier_id = NULL
WHERE supplier_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.suppliers s WHERE s.id = payment_request_items.supplier_id);

-- 2. 加 FK
ALTER TABLE public.payment_request_items
  ADD CONSTRAINT payment_request_items_supplier_id_fkey
  FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE SET NULL;

NOTIFY pgrst, 'reload schema';

COMMIT;

-- ════════ Rollback（萬一爆炸）════════
-- BEGIN;
-- ALTER TABLE public.payment_request_items DROP CONSTRAINT IF EXISTS payment_request_items_supplier_id_fkey;
-- -- 孤兒 supplier_id 已被清成 NULL、原 supplier_id 無法復原（沒備份）、不要 rollback 那段
-- NOTIFY pgrst, 'reload schema';
-- COMMIT;
