-- 新增詳細團費欄位到 itineraries 表格

BEGIN;

-- 新增 show_pricing_details 欄位：是否顯示詳細團費
ALTER TABLE public.itineraries
ADD COLUMN IF NOT EXISTS show_pricing_details boolean DEFAULT false;

COMMENT ON COLUMN public.itineraries.show_pricing_details IS '是否顯示詳細團費區塊';

-- 新增 pricing_details 欄位：詳細團費資訊（JSON 格式）
ALTER TABLE public.itineraries
ADD COLUMN IF NOT EXISTS pricing_details jsonb DEFAULT NULL;

COMMENT ON COLUMN public.itineraries.pricing_details IS '詳細團費資訊，包含費用包含/不含、保險金額、注意事項等';

COMMIT;
