-- 新增提醒事項和取消政策欄位
BEGIN;

-- 提醒事項欄位
ALTER TABLE public.itineraries
ADD COLUMN IF NOT EXISTS notices text[] DEFAULT NULL;

ALTER TABLE public.itineraries
ADD COLUMN IF NOT EXISTS show_notices boolean DEFAULT false;

-- 取消政策欄位
ALTER TABLE public.itineraries
ADD COLUMN IF NOT EXISTS cancellation_policy text[] DEFAULT NULL;

ALTER TABLE public.itineraries
ADD COLUMN IF NOT EXISTS show_cancellation_policy boolean DEFAULT false;

-- 新增欄位註解
COMMENT ON COLUMN public.itineraries.notices IS '提醒事項 (NOTICES) 陣列';
COMMENT ON COLUMN public.itineraries.show_notices IS '是否顯示提醒事項區塊';
COMMENT ON COLUMN public.itineraries.cancellation_policy IS '取消政策 (CANCELLATION) 陣列';
COMMENT ON COLUMN public.itineraries.show_cancellation_policy IS '是否顯示取消政策區塊';

COMMIT;
