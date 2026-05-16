-- 報價單新增 itinerary_id 欄位，用於連結行程表
BEGIN;

-- itineraries.id 是 text 類型，所以這裡也用 text
ALTER TABLE public.quotes
ADD COLUMN IF NOT EXISTS itinerary_id text;

COMMENT ON COLUMN public.quotes.itinerary_id IS '連結的行程表 ID，用於報價單與行程表雙向同步';

-- 建立索引加速查詢
CREATE INDEX IF NOT EXISTS idx_quotes_itinerary_id ON public.quotes(itinerary_id);

COMMIT;
