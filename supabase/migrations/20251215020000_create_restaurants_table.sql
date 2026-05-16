-- =============================================
-- 餐廳資料表（一般餐廳，非米其林）
-- 用途：行程規劃中的用餐選擇庫
-- =============================================

BEGIN;

-- 建立餐廳表
CREATE TABLE IF NOT EXISTS public.restaurants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 基本資訊
  name text NOT NULL,
  name_en text,
  name_local text,                    -- 當地語言名稱

  -- 地理位置（注意：countries/cities/regions 的 id 是 text 類型）
  country_id text NOT NULL REFERENCES public.countries(id),
  region_id text REFERENCES public.regions(id),
  city_id text NOT NULL REFERENCES public.cities(id),
  address text,
  address_en text,
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  google_maps_url text,

  -- 餐廳分類
  cuisine_type text[],                 -- 料理類型：日式、中式、西式、泰式等
  category text,                       -- 類別：fine-dining, casual, local, buffet, izakaya
  meal_type text[],                    -- 餐別：breakfast, lunch, dinner, tea

  -- 描述
  description text,
  description_en text,
  specialties text[],                  -- 招牌菜
  highlights text[],                   -- 特色亮點

  -- 價格
  price_range text,                    -- $, $$, $$$, $$$$
  avg_price_lunch integer,             -- 午餐平均價格
  avg_price_dinner integer,            -- 晚餐平均價格
  currency text DEFAULT 'TWD',

  -- 營業資訊
  opening_hours jsonb,                 -- {mon: "11:00-22:00", tue: "11:00-22:00", ...}
  phone text,
  website text,
  reservation_required boolean DEFAULT false,
  reservation_url text,

  -- 團體相關（重要！）
  group_friendly boolean DEFAULT true, -- 是否接受團體
  min_group_size integer,              -- 最小團體人數
  max_group_size integer,              -- 最大團體人數
  group_menu_available boolean DEFAULT false,  -- 是否有團餐菜單
  group_menu_price integer,            -- 團餐價格
  group_menu_options jsonb,            -- [{name, price, items, min_pax}]
  private_room boolean DEFAULT false,  -- 是否有包廂
  private_room_capacity integer,       -- 包廂容納人數

  -- 預訂聯繫
  booking_contact text,
  booking_email text,
  booking_phone text,
  booking_notes text,                  -- 預訂注意事項

  -- 佣金
  commission_rate numeric(5, 2),       -- 佣金比例

  -- 設施與服務
  facilities jsonb,                    -- {parking, wifi, wheelchair, ...}
  dietary_options text[],              -- vegetarian, vegan, halal, kosher

  -- 媒體
  thumbnail text,
  images text[],
  menu_images text[],                  -- 菜單圖片

  -- 評價
  rating numeric(2, 1),                -- 評分 1.0-5.0
  review_count integer DEFAULT 0,

  -- 備註
  notes text,
  internal_notes text,                 -- 內部備註

  -- 狀態
  is_active boolean DEFAULT true,
  is_featured boolean DEFAULT false,
  display_order integer DEFAULT 0,

  -- 審計
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES public.employees(id),
  updated_by uuid REFERENCES public.employees(id)
);

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_restaurants_country ON public.restaurants(country_id);
CREATE INDEX IF NOT EXISTS idx_restaurants_city ON public.restaurants(city_id);
CREATE INDEX IF NOT EXISTS idx_restaurants_category ON public.restaurants(category);
CREATE INDEX IF NOT EXISTS idx_restaurants_active ON public.restaurants(is_active);
CREATE INDEX IF NOT EXISTS idx_restaurants_group ON public.restaurants(group_friendly);
CREATE INDEX IF NOT EXISTS idx_restaurants_cuisine ON public.restaurants USING gin(cuisine_type);

-- 建立 updated_at 觸發器
CREATE OR REPLACE FUNCTION update_restaurants_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_restaurants_updated_at ON public.restaurants;
CREATE TRIGGER trigger_restaurants_updated_at
  BEFORE UPDATE ON public.restaurants
  FOR EACH ROW
  EXECUTE FUNCTION update_restaurants_updated_at();

-- 註解
COMMENT ON TABLE public.restaurants IS '餐廳資料庫，用於行程規劃的用餐安排';
COMMENT ON COLUMN public.restaurants.category IS 'fine-dining: 高級餐廳, casual: 休閒餐廳, local: 在地小吃, buffet: 自助餐';
COMMENT ON COLUMN public.restaurants.group_menu_options IS '團餐選項，格式：[{name: "A套餐", price: 800, items: ["前菜", "主菜", "甜點"], min_pax: 10}]';

COMMIT;
