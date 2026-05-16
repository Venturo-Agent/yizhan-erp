-- 新增價格方案和常見問題欄位
BEGIN;

-- 價格方案欄位
ALTER TABLE public.itineraries
ADD COLUMN IF NOT EXISTS price_tiers jsonb DEFAULT NULL;

ALTER TABLE public.itineraries
ADD COLUMN IF NOT EXISTS show_price_tiers boolean DEFAULT false;

-- 常見問題欄位
ALTER TABLE public.itineraries
ADD COLUMN IF NOT EXISTS faqs jsonb DEFAULT NULL;

ALTER TABLE public.itineraries
ADD COLUMN IF NOT EXISTS show_faqs boolean DEFAULT false;

-- 新增欄位註解
COMMENT ON COLUMN public.itineraries.price_tiers IS '價格方案陣列 (4人包團、6人包團等)';
COMMENT ON COLUMN public.itineraries.show_price_tiers IS '是否顯示價格方案區塊';
COMMENT ON COLUMN public.itineraries.faqs IS '常見問題陣列';
COMMENT ON COLUMN public.itineraries.show_faqs IS '是否顯示常見問題區塊';

COMMIT;
