-- =============================================
-- Migration: attractions 表新增國際化與詳細資訊欄位
-- 目的：對齊 DATA-SCHEMA.md 統一規範，支援爬文資料匯入
-- Risk: 🟢 LOW（純 ADD COLUMN，不動既有資料）
-- =============================================

BEGIN;

-- ============================================================
-- 1. 國際化欄位
-- ============================================================

ALTER TABLE public.attractions
ADD COLUMN IF NOT EXISTS name_local text;

COMMENT ON COLUMN public.attractions.name_local IS '當地語言名稱（泰文、韓文、日文等）';

ALTER TABLE public.attractions
ADD COLUMN IF NOT EXISTS description_en text;

COMMENT ON COLUMN public.attractions.description_en IS '英文描述';

ALTER TABLE public.attractions
ADD COLUMN IF NOT EXISTS address_en text;

COMMENT ON COLUMN public.attractions.address_en IS '英文地址';

-- ============================================================
-- 2. 營業與聯繫資訊
-- ============================================================

ALTER TABLE public.attractions
ADD COLUMN IF NOT EXISTS opening_hours text;

COMMENT ON COLUMN public.attractions.opening_hours IS '開放時間，格式建議：{"mon":"09:00-17:00","tue":"09:00-17:00",...} 或純文字';

ALTER TABLE public.attractions
ADD COLUMN IF NOT EXISTS phone text;

COMMENT ON COLUMN public.attractions.phone IS '聯繫電話';

ALTER TABLE public.attractions
ADD COLUMN IF NOT EXISTS website text;

COMMENT ON COLUMN public.attractions.website IS '官方網站 URL';

ALTER TABLE public.attractions
ADD COLUMN IF NOT EXISTS google_maps_url text;

COMMENT ON COLUMN public.attractions.google_maps_url IS 'Google Maps 連結';

ALTER TABLE public.attractions
ADD COLUMN IF NOT EXISTS fax text;

COMMENT ON COLUMN public.attractions.fax IS '傳真號碼';

-- ============================================================
-- 3. 資料來源與 AI 排程欄位
-- ============================================================

ALTER TABLE public.attractions
ADD COLUMN IF NOT EXISTS data_sources text[] DEFAULT '{}'::text[];

COMMENT ON COLUMN public.attractions.data_sources IS '資料來源標記，如：{tat_api, osm, kto_api, manual}';

ALTER TABLE public.attractions
ADD COLUMN IF NOT EXISTS best_time_of_day text;

COMMENT ON COLUMN public.attractions.best_time_of_day IS '建議造訪時段：morning, afternoon, evening, night。AI 排程用。';

-- ============================================================
-- 4. 狀態與排序
-- ============================================================

ALTER TABLE public.attractions
ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false;

COMMENT ON COLUMN public.attractions.is_featured IS '是否為精選推薦景點';

-- 確認 display_order 已存在（如果沒有則新增）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'attractions' AND column_name = 'display_order'
  ) THEN
    ALTER TABLE public.attractions ADD COLUMN display_order integer DEFAULT 0;
  END IF;
END $$;

-- ============================================================
-- 5. 建立索引（加速查詢）
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_attractions_name_local ON public.attractions(name_local);
CREATE INDEX IF NOT EXISTS idx_attractions_is_featured ON public.attractions(is_featured);
CREATE INDEX IF NOT EXISTS idx_attractions_data_sources ON public.attractions USING gin(data_sources);
CREATE INDEX IF NOT EXISTS idx_attractions_best_time ON public.attractions(best_time_of_day);

COMMIT;
