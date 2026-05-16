-- ============================================================================
-- Migration: 新增旅客行程細項表格
-- 日期: 2025-12-26
-- 目的: 支援旅客自建行程的細節（航班、住宿、景點等）
-- ============================================================================
BEGIN;

-- ============================================================================
-- 1. traveler_trip_itinerary_items - 行程細項
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.traveler_trip_itinerary_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.traveler_trips(id) ON DELETE CASCADE,

  -- 時間資訊
  day_number integer,
  item_date date,
  start_time time,
  end_time time,

  -- 內容
  title text NOT NULL,
  description text,
  category text, -- 交通/住宿/景點/美食/購物/體驗/其他
  icon text, -- material icon name

  -- 地點資訊
  location_name text,
  location_address text,
  location_url text, -- Google Maps URL
  latitude numeric(10, 7),
  longitude numeric(10, 7),

  -- 其他
  currency text DEFAULT 'TWD',
  estimated_cost numeric(12, 2),
  notes text,
  sort_order integer DEFAULT 0,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_traveler_trip_itinerary_items_trip_id
  ON public.traveler_trip_itinerary_items(trip_id);
CREATE INDEX IF NOT EXISTS idx_traveler_trip_itinerary_items_day
  ON public.traveler_trip_itinerary_items(trip_id, day_number, sort_order);
CREATE INDEX IF NOT EXISTS idx_traveler_trip_itinerary_items_date
  ON public.traveler_trip_itinerary_items(item_date);

COMMENT ON TABLE public.traveler_trip_itinerary_items IS '旅客自建行程的細項（景點、餐廳、活動等）';

-- ============================================================================
-- 2. traveler_trip_briefings - 行程說明/須知
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.traveler_trip_briefings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.traveler_trips(id) ON DELETE CASCADE,

  title text NOT NULL,
  content text,
  category text, -- 注意事項/行前須知/緊急聯絡/其他
  sort_order integer DEFAULT 0,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_traveler_trip_briefings_trip_id
  ON public.traveler_trip_briefings(trip_id);

COMMENT ON TABLE public.traveler_trip_briefings IS '旅客行程的說明和須知';

-- ============================================================================
-- 3. 啟用 RLS
-- ============================================================================
ALTER TABLE public.traveler_trip_itinerary_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.traveler_trip_briefings ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. RLS Policies
-- ============================================================================

-- traveler_trip_itinerary_items
DROP POLICY IF EXISTS "traveler_trip_itinerary_items_all" ON public.traveler_trip_itinerary_items;
CREATE POLICY "traveler_trip_itinerary_items_all"
  ON public.traveler_trip_itinerary_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.traveler_trips t
      WHERE t.id = traveler_trip_itinerary_items.trip_id
      AND (
        t.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.traveler_trip_members m
          WHERE m.trip_id = t.id AND m.user_id = auth.uid()
        )
      )
    )
  );

-- traveler_trip_briefings
DROP POLICY IF EXISTS "traveler_trip_briefings_all" ON public.traveler_trip_briefings;
CREATE POLICY "traveler_trip_briefings_all"
  ON public.traveler_trip_briefings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.traveler_trips t
      WHERE t.id = traveler_trip_briefings.trip_id
      AND (
        t.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.traveler_trip_members m
          WHERE m.trip_id = t.id AND m.user_id = auth.uid()
        )
      )
    )
  );

COMMIT;
