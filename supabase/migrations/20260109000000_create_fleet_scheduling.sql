-- 資源調度系統：車隊管理 & 領隊調度
-- 2026-01-09

BEGIN;

-- =====================================================
-- 1. 車隊管理表 fleet_vehicles
-- =====================================================
CREATE TABLE IF NOT EXISTS public.fleet_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id),

  -- 車輛資訊
  license_plate VARCHAR(20) NOT NULL,           -- 車牌號碼
  vehicle_name VARCHAR(50),                     -- 車輛名稱（1號車、A車）
  vehicle_type VARCHAR(20) NOT NULL DEFAULT 'large_bus', -- 車型
  capacity INTEGER NOT NULL DEFAULT 45,         -- 座位數

  -- 司機資訊（預設司機）
  driver_name VARCHAR(50),
  driver_phone VARCHAR(20),

  -- 狀態
  status VARCHAR(20) NOT NULL DEFAULT 'available'
    CHECK (status IN ('available', 'maintenance', 'retired')),
  notes TEXT,
  display_order INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 同一公司車牌不可重複
  UNIQUE(workspace_id, license_plate)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_fleet_vehicles_workspace ON public.fleet_vehicles(workspace_id);
CREATE INDEX IF NOT EXISTS idx_fleet_vehicles_status ON public.fleet_vehicles(status);

-- RLS
ALTER TABLE public.fleet_vehicles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fleet_vehicles_select" ON public.fleet_vehicles;
CREATE POLICY "fleet_vehicles_select" ON public.fleet_vehicles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "fleet_vehicles_insert" ON public.fleet_vehicles;
CREATE POLICY "fleet_vehicles_insert" ON public.fleet_vehicles
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "fleet_vehicles_update" ON public.fleet_vehicles;
CREATE POLICY "fleet_vehicles_update" ON public.fleet_vehicles
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS "fleet_vehicles_delete" ON public.fleet_vehicles;
CREATE POLICY "fleet_vehicles_delete" ON public.fleet_vehicles
  FOR DELETE USING (true);

-- =====================================================
-- 2. 車輛調度表 fleet_schedules
-- =====================================================
CREATE TABLE IF NOT EXISTS public.fleet_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id),
  vehicle_id UUID NOT NULL REFERENCES public.fleet_vehicles(id) ON DELETE CASCADE,

  -- 調度日期
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,

  -- 客戶/團資訊
  client_name VARCHAR(100),                     -- 客戶名稱（旅行社）
  tour_name VARCHAR(200),
  tour_code VARCHAR(50),
  contact_person VARCHAR(50),
  contact_phone VARCHAR(20),

  -- 司機（可覆蓋車輛預設司機）
  driver_name VARCHAR(50),
  driver_phone VARCHAR(20),

  -- 狀態
  status VARCHAR(20) NOT NULL DEFAULT 'confirmed'
    CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,

  -- 確保結束日期 >= 開始日期
  CHECK (end_date >= start_date)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_fleet_schedules_workspace ON public.fleet_schedules(workspace_id);
CREATE INDEX IF NOT EXISTS idx_fleet_schedules_vehicle ON public.fleet_schedules(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_fleet_schedules_dates ON public.fleet_schedules(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_fleet_schedules_status ON public.fleet_schedules(status);

-- RLS
ALTER TABLE public.fleet_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fleet_schedules_select" ON public.fleet_schedules;
CREATE POLICY "fleet_schedules_select" ON public.fleet_schedules
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "fleet_schedules_insert" ON public.fleet_schedules;
CREATE POLICY "fleet_schedules_insert" ON public.fleet_schedules
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "fleet_schedules_update" ON public.fleet_schedules;
CREATE POLICY "fleet_schedules_update" ON public.fleet_schedules
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS "fleet_schedules_delete" ON public.fleet_schedules;
CREATE POLICY "fleet_schedules_delete" ON public.fleet_schedules
  FOR DELETE USING (true);

-- =====================================================
-- 3. 領隊調度表 leader_schedules
-- =====================================================
CREATE TABLE IF NOT EXISTS public.leader_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id),
  leader_id UUID NOT NULL REFERENCES public.tour_leaders(id) ON DELETE CASCADE,

  -- 調度日期
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,

  -- 團資訊
  tour_id TEXT REFERENCES public.tours(id) ON DELETE SET NULL,
  tour_name VARCHAR(200),
  tour_code VARCHAR(50),
  destination VARCHAR(100),

  -- 狀態
  status VARCHAR(20) NOT NULL DEFAULT 'confirmed'
    CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,

  -- 確保結束日期 >= 開始日期
  CHECK (end_date >= start_date)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_leader_schedules_workspace ON public.leader_schedules(workspace_id);
CREATE INDEX IF NOT EXISTS idx_leader_schedules_leader ON public.leader_schedules(leader_id);
CREATE INDEX IF NOT EXISTS idx_leader_schedules_dates ON public.leader_schedules(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_leader_schedules_tour ON public.leader_schedules(tour_id);

-- RLS
ALTER TABLE public.leader_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "leader_schedules_select" ON public.leader_schedules;
CREATE POLICY "leader_schedules_select" ON public.leader_schedules
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "leader_schedules_insert" ON public.leader_schedules;
CREATE POLICY "leader_schedules_insert" ON public.leader_schedules
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "leader_schedules_update" ON public.leader_schedules;
CREATE POLICY "leader_schedules_update" ON public.leader_schedules
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS "leader_schedules_delete" ON public.leader_schedules;
CREATE POLICY "leader_schedules_delete" ON public.leader_schedules
  FOR DELETE USING (true);

-- =====================================================
-- 4. 衝突檢查函數
-- =====================================================

-- 檢查車輛日期衝突
CREATE OR REPLACE FUNCTION check_vehicle_schedule_conflict(
  p_vehicle_id UUID,
  p_start_date DATE,
  p_end_date DATE,
  p_exclude_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.fleet_schedules
    WHERE vehicle_id = p_vehicle_id
      AND status != 'cancelled'
      AND (p_exclude_id IS NULL OR id != p_exclude_id)
      AND daterange(start_date, end_date, '[]') && daterange(p_start_date, p_end_date, '[]')
  );
END;
$$ LANGUAGE plpgsql;

-- 檢查領隊日期衝突
CREATE OR REPLACE FUNCTION check_leader_schedule_conflict(
  p_leader_id UUID,
  p_start_date DATE,
  p_end_date DATE,
  p_exclude_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.leader_schedules
    WHERE leader_id = p_leader_id
      AND status != 'cancelled'
      AND (p_exclude_id IS NULL OR id != p_exclude_id)
      AND daterange(start_date, end_date, '[]') && daterange(p_start_date, p_end_date, '[]')
  );
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 5. 車輛調度視圖（含車輛資訊）
-- =====================================================
DROP VIEW IF EXISTS public.fleet_schedules_with_vehicle;
CREATE OR REPLACE VIEW public.fleet_schedules_with_vehicle AS
SELECT
  s.*,
  v.license_plate,
  v.vehicle_name,
  v.vehicle_type,
  v.capacity,
  COALESCE(s.driver_name, v.driver_name) AS effective_driver_name,
  COALESCE(s.driver_phone, v.driver_phone) AS effective_driver_phone
FROM public.fleet_schedules s
JOIN public.fleet_vehicles v ON v.id = s.vehicle_id;

-- =====================================================
-- 6. 領隊調度視圖（含領隊資訊）
-- =====================================================
DROP VIEW IF EXISTS public.leader_schedules_with_leader;
CREATE OR REPLACE VIEW public.leader_schedules_with_leader AS
SELECT
  s.*,
  l.name AS leader_name,
  l.phone AS leader_phone,
  l.languages,
  l.specialties
FROM public.leader_schedules s
JOIN public.tour_leaders l ON l.id = s.leader_id;

COMMIT;
