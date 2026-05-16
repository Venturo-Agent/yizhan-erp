-- 建立出團資料表

BEGIN;

CREATE TABLE IF NOT EXISTS public.tour_departure_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id text NOT NULL REFERENCES public.tours(id) ON DELETE CASCADE,

  -- 出團資料
  flight_info jsonb DEFAULT '{}',
  hotel_info jsonb DEFAULT '{}',
  bus_info jsonb DEFAULT '{}',
  guide_info jsonb DEFAULT '{}',
  emergency_contact jsonb DEFAULT '{}',
  notes text,

  -- 審計欄位
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid,
  updated_by uuid,

  UNIQUE(tour_id)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_tour_departure_data_tour_id ON public.tour_departure_data(tour_id);

-- 註解
COMMENT ON TABLE public.tour_departure_data IS '出團資料';

-- 禁用 RLS
ALTER TABLE public.tour_departure_data DISABLE ROW LEVEL SECURITY;

COMMIT;
