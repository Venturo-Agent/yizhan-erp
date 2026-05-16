-- 領隊資料表新增欄位
-- 新增頭像、國內電話、國外電話欄位

BEGIN;

-- 新增欄位
ALTER TABLE public.tour_leaders
  ADD COLUMN IF NOT EXISTS photo TEXT,
  ADD COLUMN IF NOT EXISTS domestic_phone VARCHAR(30),
  ADD COLUMN IF NOT EXISTS overseas_phone VARCHAR(30);

-- 欄位註解
COMMENT ON COLUMN public.tour_leaders.photo IS '領隊頭像 URL';
COMMENT ON COLUMN public.tour_leaders.domestic_phone IS '國內電話';
COMMENT ON COLUMN public.tour_leaders.overseas_phone IS '國外電話';

COMMIT;
