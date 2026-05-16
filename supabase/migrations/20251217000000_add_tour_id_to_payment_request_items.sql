-- 為請款單品項加入獨立的 tour_id 欄位
-- 讓每個品項可以獨立關聯到不同的團

BEGIN;

-- 加入 tour_id 欄位（使用 text 類型，與 tours.id 一致）
ALTER TABLE public.payment_request_items
ADD COLUMN IF NOT EXISTS tour_id text REFERENCES public.tours(id);

-- 加入索引以加速查詢
CREATE INDEX IF NOT EXISTS idx_payment_request_items_tour_id 
ON public.payment_request_items(tour_id);

-- 加入註解
COMMENT ON COLUMN public.payment_request_items.tour_id IS '品項關聯的團號（可獨立移動到不同團）';

COMMIT;
