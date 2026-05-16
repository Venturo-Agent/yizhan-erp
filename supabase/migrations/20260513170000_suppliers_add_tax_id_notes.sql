-- ─────────────────────────────────────────────────────────────────────────────
-- suppliers 補 tax_id + notes 欄位
-- 2026-05-13 黒羽 + William 拍板
--
-- 原因：CreateSupplierDialog 表單有「統編」「備註」field、但 DB schema 漏建、
--       填了就炸 PGRST204 schema mismatch。Logan 5/13 修 suppliers 那輪沒包這兩欄。
--
-- 影響：只擴欄位、純加法、不破壞既有資料、不需 reverse SQL。
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS tax_id VARCHAR(20),
  ADD COLUMN IF NOT EXISTS notes TEXT;

COMMENT ON COLUMN public.suppliers.tax_id IS '統一編號（台灣 8 碼為主、保留長度容納海外）';
COMMENT ON COLUMN public.suppliers.notes IS '內部備註（客戶看不到）';

-- 驗證
DO $$
DECLARE
  v_count int;
BEGIN
  SELECT count(*) INTO v_count
  FROM information_schema.columns
  WHERE table_schema='public' AND table_name='suppliers'
    AND column_name IN ('tax_id', 'notes');
  IF v_count <> 2 THEN
    RAISE EXCEPTION 'suppliers 補欄失敗、count = % (expect 2)', v_count;
  END IF;
  RAISE NOTICE '✓ suppliers.tax_id + suppliers.notes 補齊';
END $$;

COMMIT;
