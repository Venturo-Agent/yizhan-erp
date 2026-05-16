-- 新增景點門票和驗證欄位
BEGIN;

-- 門票價格（文字，如「免費」「約500泰銖」「成人$30/兒童$15」）
ALTER TABLE public.attractions
ADD COLUMN IF NOT EXISTS ticket_price text;

-- 資料是否已驗證（用於顯示驚嘆號）
ALTER TABLE public.attractions
ADD COLUMN IF NOT EXISTS data_verified boolean DEFAULT false;

COMMENT ON COLUMN public.attractions.ticket_price IS '門票價格資訊';
COMMENT ON COLUMN public.attractions.data_verified IS '資料是否已驗證（false 時顯示警告圖示）';

COMMIT;
