-- ─────────────────────────────────────────────────────────────────────────────
-- payment_request_items 補 tour_id 欄位
-- 2026-05-14 William 拍板
--
-- 業務需求：
--   - 團體請款（tab=tour）：parent payment_requests.tour_id 對應整單一個 tour
--     item.tour_id 自動帶 parent.tour_id（值一樣、但保留欄位方便 client 不用 JOIN）
--   - 批量請款（tab=batch）：跨多 tour 可能、每 item 各自綁不同 tour
--     item.tour_id 來自 client 選擇、可能跟其他 item 不同
--   - 公司請款（tab=company）：不綁 tour、item.tour_id = NULL
--
-- 設計：純加欄位、nullable、無 FK 強制（先保持彈性、之後加 FK 不破壞 nullable）
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

ALTER TABLE public.payment_request_items
  ADD COLUMN IF NOT EXISTS tour_id UUID;

COMMENT ON COLUMN public.payment_request_items.tour_id IS
  '每 item 綁的 tour（團體請款 = parent.tour_id、批量請款 = 各 item 各自選、公司請款 = NULL）';

-- index：批量請款常按 tour_id 查
CREATE INDEX IF NOT EXISTS idx_pri_tour_id ON public.payment_request_items(tour_id)
  WHERE tour_id IS NOT NULL;

-- 驗證
DO $$
DECLARE v_count int;
BEGIN
  SELECT count(*) INTO v_count FROM information_schema.columns
  WHERE table_schema='public' AND table_name='payment_request_items' AND column_name='tour_id';
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'tour_id 欄位補失敗、count = %', v_count;
  END IF;
  RAISE NOTICE '✓ payment_request_items.tour_id 補齊';
END $$;

COMMIT;
