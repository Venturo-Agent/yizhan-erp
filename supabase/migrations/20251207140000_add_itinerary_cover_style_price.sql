-- 新增封面風格和價格欄位到 itineraries 表格

BEGIN;

-- 新增 cover_style 欄位：封面風格（original 或 gemini）
ALTER TABLE public.itineraries
ADD COLUMN IF NOT EXISTS cover_style text DEFAULT 'original';

COMMENT ON COLUMN public.itineraries.cover_style IS '封面風格：original（原版）或 gemini（Gemini 風格）';

-- 新增 price 欄位：價格
ALTER TABLE public.itineraries
ADD COLUMN IF NOT EXISTS price text DEFAULT NULL;

COMMENT ON COLUMN public.itineraries.price IS '價格（如：39,800）';

-- 新增 price_note 欄位：價格備註
ALTER TABLE public.itineraries
ADD COLUMN IF NOT EXISTS price_note text DEFAULT NULL;

COMMENT ON COLUMN public.itineraries.price_note IS '價格備註（如：起、/人）';

COMMIT;
