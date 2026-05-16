-- 擴展行程狀態欄位
-- 新增 is_template (公司範例) 和 closed_at (結案時間) 欄位

BEGIN;

-- 新增 is_template 欄位：標記為公司範例行程
ALTER TABLE public.itineraries
ADD COLUMN IF NOT EXISTS is_template boolean DEFAULT false;

COMMENT ON COLUMN public.itineraries.is_template IS '是否為公司範例行程';

-- 新增 closed_at 欄位：結案時間
ALTER TABLE public.itineraries
ADD COLUMN IF NOT EXISTS closed_at timestamptz DEFAULT NULL;

COMMENT ON COLUMN public.itineraries.closed_at IS '結案時間（手動結案或日期過期自動結案）';

-- 為常用查詢建立索引
CREATE INDEX IF NOT EXISTS idx_itineraries_is_template ON public.itineraries(is_template) WHERE is_template = true;
CREATE INDEX IF NOT EXISTS idx_itineraries_closed_at ON public.itineraries(closed_at) WHERE closed_at IS NOT NULL;

COMMIT;
