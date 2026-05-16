-- 新增航班風格欄位到 itineraries 表格
BEGIN;

-- 新增 flight_style 欄位
ALTER TABLE public.itineraries
ADD COLUMN IF NOT EXISTS flight_style text DEFAULT 'original';

-- 新增 itinerary_style 欄位（每日行程風格）
ALTER TABLE public.itineraries
ADD COLUMN IF NOT EXISTS itinerary_style text DEFAULT 'original';

COMMENT ON COLUMN public.itineraries.flight_style IS '航班卡片風格：original, chinese, japanese, luxury, art, none';
COMMENT ON COLUMN public.itineraries.itinerary_style IS '每日行程風格：original, luxury, art';

COMMIT;
