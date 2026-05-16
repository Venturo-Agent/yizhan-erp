-- =====================================================
-- 收款單新增 tour_id 欄位
-- 建立日期：2025-12-28
-- 說明：讓收款單可直接關聯到團，方便查詢
-- =====================================================

BEGIN;

-- 新增 tour_id 欄位（tours.id 是 text 類型）
ALTER TABLE public.receipts
ADD COLUMN IF NOT EXISTS tour_id text REFERENCES public.tours(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.receipts.tour_id IS '關聯團號（可直接從團查詢收款）';

-- 建立索引加速查詢
CREATE INDEX IF NOT EXISTS idx_receipts_tour_id ON public.receipts(tour_id);

-- 回填現有資料：從 order_id 取得 tour_id
-- 注意：receipts.order_id 是 uuid，orders.id 是 text，需要轉型
UPDATE public.receipts r
SET tour_id = o.tour_id
FROM public.orders o
WHERE r.order_id::text = o.id
  AND r.tour_id IS NULL;

COMMIT;
