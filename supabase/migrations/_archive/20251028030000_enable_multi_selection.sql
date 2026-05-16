-- Migration: 啟用多選功能（城市、服務類型）
-- Purpose: 支援行程跨多城市、供應商多服務類型
-- Author: Claude Code
-- Date: 2025-10-28

BEGIN;

-- 1. 供應商服務類型改為陣列
-- 目前：type: string (單選)
-- 改為：service_types: text[] (多選)
ALTER TABLE public.suppliers
ADD COLUMN IF NOT EXISTS service_types text[];

-- 遷移現有資料：將 type 欄位的值複製到 service_types 陣列
UPDATE public.suppliers
SET service_types = ARRAY[type]
WHERE type IS NOT NULL AND service_types IS NULL;

-- 註釋
COMMENT ON COLUMN public.suppliers.service_types IS '服務類型（多選）：hotel, restaurant, transport, ticket, guide, travel_agency, other';
COMMENT ON COLUMN public.suppliers.type IS '（已廢棄）改用 service_types';

-- 2. 旅遊團 - 確認是否需要城市多選
-- 目前已經有 tours 表，檢查是否有 cities 欄位
-- 如果沒有，需要建立 tour_cities 關聯表

-- 檢查 tours 表是否存在
DO $$
BEGIN
  -- 如果 tours 表存在，建立 tour_cities 關聯表
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'tours') THEN

    -- 建立 tour_cities 關聯表（如果不存在）
    CREATE TABLE IF NOT EXISTS public.tour_cities (
      id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
      tour_id text NOT NULL REFERENCES public.tours(id) ON DELETE CASCADE,
      city_id text NOT NULL REFERENCES public.cities(id) ON DELETE CASCADE,

      -- 審計欄位
      created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,

      -- 唯一約束
      UNIQUE(tour_id, city_id)
    );

    -- 建立索引
    CREATE INDEX IF NOT EXISTS idx_tour_cities_tour_id ON public.tour_cities(tour_id);
    CREATE INDEX IF NOT EXISTS idx_tour_cities_city_id ON public.tour_cities(city_id);

    -- 註釋
    COMMENT ON TABLE public.tour_cities IS '旅遊團與城市的多對多關聯（支援跨城市行程）';

    -- RLS 策略
    ALTER TABLE public.tour_cities ENABLE ROW LEVEL SECURITY;

    CREATE POLICY IF NOT EXISTS "Allow authenticated users to read tour_cities"
      ON public.tour_cities FOR SELECT TO authenticated USING (true);

    CREATE POLICY IF NOT EXISTS "Allow authenticated users to insert tour_cities"
      ON public.tour_cities FOR INSERT TO authenticated WITH CHECK (true);

    CREATE POLICY IF NOT EXISTS "Allow authenticated users to update tour_cities"
      ON public.tour_cities FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

    CREATE POLICY IF NOT EXISTS "Allow authenticated users to delete tour_cities"
      ON public.tour_cities FOR DELETE TO authenticated USING (true);
  END IF;
END $$;

-- 3. 景點 - 支援多城市
-- 建立 attraction_cities 關聯表（如果不存在）
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'attractions') THEN

    CREATE TABLE IF NOT EXISTS public.attraction_cities (
      id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
      attraction_id text NOT NULL REFERENCES public.attractions(id) ON DELETE CASCADE,
      city_id text NOT NULL REFERENCES public.cities(id) ON DELETE CASCADE,

      created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,

      UNIQUE(attraction_id, city_id)
    );

    CREATE INDEX IF NOT EXISTS idx_attraction_cities_attraction_id ON public.attraction_cities(attraction_id);
    CREATE INDEX IF NOT EXISTS idx_attraction_cities_city_id ON public.attraction_cities(city_id);

    COMMENT ON TABLE public.attraction_cities IS '景點與城市的多對多關聯（支援跨城市景點）';

    ALTER TABLE public.attraction_cities ENABLE ROW LEVEL SECURITY;

    CREATE POLICY IF NOT EXISTS "Allow authenticated users to read attraction_cities"
      ON public.attraction_cities FOR SELECT TO authenticated USING (true);

    CREATE POLICY IF NOT EXISTS "Allow authenticated users to insert attraction_cities"
      ON public.attraction_cities FOR INSERT TO authenticated WITH CHECK (true);

    CREATE POLICY IF NOT EXISTS "Allow authenticated users to update attraction_cities"
      ON public.attraction_cities FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

    CREATE POLICY IF NOT EXISTS "Allow authenticated users to delete attraction_cities"
      ON public.attraction_cities FOR DELETE TO authenticated USING (true);
  END IF;
END $$;

COMMIT;
