-- 定價欄位從 quotes 搬到 tours
-- 售價人數只是計算公式，一個團就是一個報價單

ALTER TABLE public.tours
ADD COLUMN IF NOT EXISTS selling_prices jsonb DEFAULT NULL,
ADD COLUMN IF NOT EXISTS participant_counts jsonb DEFAULT NULL,
ADD COLUMN IF NOT EXISTS tier_pricings jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS accommodation_days integer DEFAULT NULL;

-- 一次性資料搬移：把現有 quotes 定價資料搬到對應的 tour
UPDATE public.tours t
SET
  selling_prices = q.selling_prices,
  participant_counts = q.participant_counts,
  tier_pricings = COALESCE(q.tier_pricings, '[]'::jsonb),
  accommodation_days = q.accommodation_days
FROM public.quotes q
WHERE q.tour_id = t.id
  AND q.quote_type = 'standard'
  AND (q.selling_prices IS NOT NULL OR q.participant_counts IS NOT NULL);
