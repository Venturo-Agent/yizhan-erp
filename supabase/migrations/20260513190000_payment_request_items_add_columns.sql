-- ─────────────────────────────────────────────────────────────────────────────
-- payment_request_items 補 payment_method_id + custom_request_date
-- 2026-05-13 Logan + William 拍板
--
-- 原因：service.addItems 塞這兩欄位、UI 每 row 有「付款方式」「日期」column、
--       但 DB schema 漏建、填了就炸 PGRST schema mismatch。
--
-- 業務目的：每個請款 item 可獨立指定付款方式 + 日期（不全跟 parent request）。
--
-- 影響：純加欄位、不破壞既有資料、不需 reverse SQL。
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

ALTER TABLE public.payment_request_items
  ADD COLUMN IF NOT EXISTS payment_method_id UUID REFERENCES public.payment_methods(id),
  ADD COLUMN IF NOT EXISTS custom_request_date DATE;

COMMENT ON COLUMN public.payment_request_items.payment_method_id IS
  '每 item 獨立付款方式（不指定 = 用 parent payment_request.payment_method_id）';
COMMENT ON COLUMN public.payment_request_items.custom_request_date IS
  '每 item 獨立請款日期（不指定 = 用 parent payment_request.request_date）';

DO $$
DECLARE v_count int;
BEGIN
  SELECT count(*) INTO v_count FROM information_schema.columns
  WHERE table_schema='public' AND table_name='payment_request_items'
    AND column_name IN ('payment_method_id', 'custom_request_date');
  IF v_count <> 2 THEN
    RAISE EXCEPTION '欄位補齊失敗、count = % (expect 2)', v_count;
  END IF;
  RAISE NOTICE '✓ payment_request_items.payment_method_id + custom_request_date 補齊';
END $$;

COMMIT;
