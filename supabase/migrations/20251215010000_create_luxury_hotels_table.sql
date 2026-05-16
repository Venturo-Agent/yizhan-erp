-- =============================================
-- 奢華飯店資料表
-- 用途：行程規劃中的飯店選擇庫
-- =============================================

BEGIN;

-- 建立奢華飯店表
CREATE TABLE IF NOT EXISTS public.luxury_hotels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 基本資訊
  name text NOT NULL,
  name_en text,
  name_local text,                    -- 當地語言名稱
  brand text,                          -- 品牌（如：麗思卡爾頓、四季、安縵）

  -- 地理位置（注意：countries/cities/regions 的 id 是 text 類型）
  country_id text NOT NULL REFERENCES public.countries(id),
  region_id text REFERENCES public.regions(id),
  city_id text NOT NULL REFERENCES public.cities(id),
  address text,
  address_en text,
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  google_maps_url text,

  -- 飯店等級與分類
  star_rating integer CHECK (star_rating >= 1 AND star_rating <= 5),  -- 星級 1-5
  hotel_class text,                    -- luxury, ultra-luxury, boutique
  category text,                       -- resort, city, airport, onsen, etc.

  -- 描述
  description text,
  description_en text,
  highlights text[],                   -- 特色亮點

  -- 房型與價格
  room_types jsonb,                    -- [{name, name_en, size_sqm, max_guests, price_range}]
  price_range text,                    -- $$$, $$$$, $$$$$
  avg_price_per_night integer,         -- 平均每晚價格 (USD)
  currency text DEFAULT 'USD',

  -- 設施
  facilities jsonb,                    -- {pool, spa, gym, restaurant, bar, ...}
  amenities text[],                    -- 設施清單

  -- 餐飲
  restaurants_count integer,           -- 餐廳數量
  has_michelin_restaurant boolean DEFAULT false,
  dining_options text[],               -- 餐飲選項

  -- 預訂資訊
  booking_contact text,
  booking_email text,
  booking_phone text,
  website text,

  -- 團體相關
  group_friendly boolean DEFAULT true,
  min_rooms_for_group integer,         -- 團體最少房數
  max_group_size integer,              -- 最大團體人數
  group_rate_available boolean DEFAULT false,
  commission_rate numeric(5, 2),       -- 佣金比例

  -- 特殊服務
  airport_transfer boolean DEFAULT false,
  concierge_service boolean DEFAULT true,
  butler_service boolean DEFAULT false,

  -- 最佳季節
  best_seasons text[],                 -- spring, summer, autumn, winter

  -- 獎項與認證
  awards text[],                       -- 獲獎紀錄
  certifications text[],               -- 認證

  -- 媒體
  thumbnail text,                      -- 縮圖
  images text[],                       -- 圖片陣列

  -- 備註
  notes text,
  internal_notes text,                 -- 內部備註（不對外顯示）

  -- 狀態
  is_active boolean DEFAULT true,
  is_featured boolean DEFAULT false,   -- 精選推薦
  display_order integer DEFAULT 0,

  -- 審計
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES public.employees(id),
  updated_by uuid REFERENCES public.employees(id)
);

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_luxury_hotels_country ON public.luxury_hotels(country_id);
CREATE INDEX IF NOT EXISTS idx_luxury_hotels_city ON public.luxury_hotels(city_id);
CREATE INDEX IF NOT EXISTS idx_luxury_hotels_brand ON public.luxury_hotels(brand);
CREATE INDEX IF NOT EXISTS idx_luxury_hotels_active ON public.luxury_hotels(is_active);
CREATE INDEX IF NOT EXISTS idx_luxury_hotels_star ON public.luxury_hotels(star_rating);
CREATE INDEX IF NOT EXISTS idx_luxury_hotels_class ON public.luxury_hotels(hotel_class);

-- 建立 updated_at 觸發器
CREATE OR REPLACE FUNCTION update_luxury_hotels_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_luxury_hotels_updated_at ON public.luxury_hotels;
CREATE TRIGGER trigger_luxury_hotels_updated_at
  BEFORE UPDATE ON public.luxury_hotels
  FOR EACH ROW
  EXECUTE FUNCTION update_luxury_hotels_updated_at();

-- 註解
COMMENT ON TABLE public.luxury_hotels IS '奢華飯店資料庫，用於行程規劃';
COMMENT ON COLUMN public.luxury_hotels.brand IS '飯店品牌，如：四季、麗思卡爾頓、安縵';
COMMENT ON COLUMN public.luxury_hotels.hotel_class IS 'luxury: 奢華, ultra-luxury: 頂級奢華, boutique: 精品';
COMMENT ON COLUMN public.luxury_hotels.category IS 'resort: 度假村, city: 城市飯店, onsen: 溫泉旅館';

COMMIT;
