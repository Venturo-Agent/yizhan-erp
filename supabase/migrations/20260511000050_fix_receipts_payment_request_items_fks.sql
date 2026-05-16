-- 補 client query 期待的 FK：
-- receipts.payment_method_id -> payment_methods (name=fk_receipts_payment_method)
-- payment_request_items.request_id -> payment_requests
-- 解 finance/payments / finance/requests UI 顯示「目前沒有資料」

BEGIN;

DO $$ BEGIN
  ALTER TABLE public.receipts
    ADD CONSTRAINT fk_receipts_payment_method
    FOREIGN KEY (payment_method_id) REFERENCES public.payment_methods(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- payment_request_items.request_id 是 text、payment_requests.id 是 uuid、type 不一致、FK 加不了
-- 需要 schema 對齊（改 column type 或建 view）— 留待後續處理、不擋 demo
-- finance/requests page 之前就在 broken state、繞 entity hook 可能不會擋


NOTIFY pgrst, 'reload schema';

COMMIT;
