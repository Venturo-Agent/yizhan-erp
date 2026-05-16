-- 分房分車系統資料表
-- 2025-12-13

BEGIN;

-- ============================================
-- 1. tour_rooms - 房間設定
-- ============================================
CREATE TABLE IF NOT EXISTS public.tour_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id text NOT NULL REFERENCES public.tours(id) ON DELETE CASCADE,
  hotel_name text NOT NULL,              -- 飯店名稱
  room_type text NOT NULL,               -- 房型 (雙人房、單人房、三人房等)
  room_number text,                      -- 房號 (可選)
  capacity integer NOT NULL DEFAULT 2,   -- 容量 (幾人房)
  night_number integer NOT NULL DEFAULT 1, -- 第幾晚
  notes text,                            -- 備註
  display_order integer DEFAULT 0,       -- 排序
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_tour_rooms_tour_id ON public.tour_rooms(tour_id);
CREATE INDEX IF NOT EXISTS idx_tour_rooms_night ON public.tour_rooms(tour_id, night_number);

COMMENT ON TABLE public.tour_rooms IS '旅遊團房間設定';
COMMENT ON COLUMN public.tour_rooms.hotel_name IS '飯店名稱';
COMMENT ON COLUMN public.tour_rooms.room_type IS '房型';
COMMENT ON COLUMN public.tour_rooms.room_number IS '房號';
COMMENT ON COLUMN public.tour_rooms.capacity IS '房間容量';
COMMENT ON COLUMN public.tour_rooms.night_number IS '第幾晚';

-- ============================================
-- 2. tour_room_assignments - 房間分配
-- ============================================
CREATE TABLE IF NOT EXISTS public.tour_room_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.tour_rooms(id) ON DELETE CASCADE,
  order_member_id uuid NOT NULL REFERENCES public.order_members(id) ON DELETE CASCADE,
  bed_number integer,                    -- 床位號 (可選)
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- 確保同一房間、同一晚不會重複分配同一團員
  UNIQUE(room_id, order_member_id)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_tour_room_assignments_room_id ON public.tour_room_assignments(room_id);
CREATE INDEX IF NOT EXISTS idx_tour_room_assignments_member_id ON public.tour_room_assignments(order_member_id);

COMMENT ON TABLE public.tour_room_assignments IS '房間分配記錄';
COMMENT ON COLUMN public.tour_room_assignments.bed_number IS '床位號';

-- ============================================
-- 3. tour_vehicles - 車輛設定
-- ============================================
CREATE TABLE IF NOT EXISTS public.tour_vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id text NOT NULL REFERENCES public.tours(id) ON DELETE CASCADE,
  vehicle_name text NOT NULL,            -- 車輛名稱 (1號車、A車等)
  vehicle_type text,                     -- 車型 (大巴、中巴、小巴等)
  capacity integer NOT NULL DEFAULT 45,  -- 座位數
  driver_name text,                      -- 司機姓名
  driver_phone text,                     -- 司機電話
  license_plate text,                    -- 車牌號碼
  notes text,                            -- 備註
  display_order integer DEFAULT 0,       -- 排序
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_tour_vehicles_tour_id ON public.tour_vehicles(tour_id);

COMMENT ON TABLE public.tour_vehicles IS '旅遊團車輛設定';
COMMENT ON COLUMN public.tour_vehicles.vehicle_name IS '車輛名稱';
COMMENT ON COLUMN public.tour_vehicles.capacity IS '座位數';

-- ============================================
-- 4. tour_vehicle_assignments - 車輛分配
-- ============================================
CREATE TABLE IF NOT EXISTS public.tour_vehicle_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES public.tour_vehicles(id) ON DELETE CASCADE,
  order_member_id uuid NOT NULL REFERENCES public.order_members(id) ON DELETE CASCADE,
  seat_number integer,                   -- 座位號 (可選)
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- 確保同一車不會重複分配同一團員
  UNIQUE(vehicle_id, order_member_id)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_tour_vehicle_assignments_vehicle_id ON public.tour_vehicle_assignments(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_tour_vehicle_assignments_member_id ON public.tour_vehicle_assignments(order_member_id);

COMMENT ON TABLE public.tour_vehicle_assignments IS '車輛分配記錄';
COMMENT ON COLUMN public.tour_vehicle_assignments.seat_number IS '座位號';

-- ============================================
-- 5. 建立 View: 房間使用狀況
-- ============================================
CREATE OR REPLACE VIEW public.tour_rooms_status AS
SELECT
  r.id,
  r.tour_id,
  r.hotel_name,
  r.room_type,
  r.room_number,
  r.capacity,
  r.night_number,
  r.notes,
  r.display_order,
  COUNT(ra.id) as assigned_count,
  r.capacity - COUNT(ra.id) as remaining_beds,
  CASE
    WHEN COUNT(ra.id) >= r.capacity THEN true
    ELSE false
  END as is_full
FROM public.tour_rooms r
LEFT JOIN public.tour_room_assignments ra ON ra.room_id = r.id
GROUP BY r.id;

COMMENT ON VIEW public.tour_rooms_status IS '房間使用狀況（含已分配人數）';

-- ============================================
-- 6. 建立 View: 車輛使用狀況
-- ============================================
CREATE OR REPLACE VIEW public.tour_vehicles_status AS
SELECT
  v.id,
  v.tour_id,
  v.vehicle_name,
  v.vehicle_type,
  v.capacity,
  v.driver_name,
  v.driver_phone,
  v.license_plate,
  v.notes,
  v.display_order,
  COUNT(va.id) as assigned_count,
  v.capacity - COUNT(va.id) as remaining_seats,
  CASE
    WHEN COUNT(va.id) >= v.capacity THEN true
    ELSE false
  END as is_full
FROM public.tour_vehicles v
LEFT JOIN public.tour_vehicle_assignments va ON va.vehicle_id = v.id
GROUP BY v.id;

COMMENT ON VIEW public.tour_vehicles_status IS '車輛使用狀況（含已分配人數）';

COMMIT;
