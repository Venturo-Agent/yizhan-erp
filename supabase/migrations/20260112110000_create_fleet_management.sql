-- ============================================
-- 車庫管理系統 - 資料庫表格
-- ============================================

-- 1. 車輛表
CREATE TABLE IF NOT EXISTS public.fleet_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  license_plate VARCHAR(20) NOT NULL,
  vehicle_name VARCHAR(50),
  vehicle_type VARCHAR(30) NOT NULL DEFAULT 'large_bus',
  brand VARCHAR(50),
  model VARCHAR(50),
  year INTEGER,
  capacity INTEGER NOT NULL DEFAULT 45,
  vin VARCHAR(50),
  default_driver_id UUID,
  registration_date DATE,
  inspection_due_date DATE,
  insurance_due_date DATE,
  last_maintenance_date DATE,
  next_maintenance_date DATE,
  next_maintenance_km INTEGER,
  current_mileage INTEGER DEFAULT 0,
  documents JSONB DEFAULT '[]'::jsonb,
  status VARCHAR(20) DEFAULT 'available',
  notes TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  updated_by UUID
);

-- 2. 司機表
CREATE TABLE IF NOT EXISTS public.fleet_drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  employee_id UUID,
  name VARCHAR(50) NOT NULL,
  phone VARCHAR(20),
  id_number VARCHAR(20),
  license_number VARCHAR(30),
  license_type VARCHAR(20) DEFAULT 'professional',
  license_expiry_date DATE,
  license_image_url TEXT,
  professional_license_number VARCHAR(30),
  professional_license_expiry DATE,
  professional_license_image_url TEXT,
  health_check_date DATE,
  health_check_expiry DATE,
  health_check_document_url TEXT,
  status VARCHAR(20) DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 車輛記錄表
CREATE TABLE IF NOT EXISTS public.fleet_vehicle_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.fleet_vehicles(id) ON DELETE CASCADE,
  log_type VARCHAR(30) NOT NULL,
  log_date DATE NOT NULL,
  description TEXT,
  cost DECIMAL(12, 2),
  mileage INTEGER,
  next_due_date DATE,
  next_due_mileage INTEGER,
  vendor_name VARCHAR(100),
  documents JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  notes TEXT
);

-- 4. 車輛調度表
CREATE TABLE IF NOT EXISTS public.fleet_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.fleet_vehicles(id),
  driver_id UUID,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  client_workspace_id UUID,
  client_name VARCHAR(100),
  tour_id UUID,
  tour_name VARCHAR(200),
  tour_code VARCHAR(50),
  contact_person VARCHAR(50),
  contact_phone VARCHAR(20),
  pickup_location TEXT,
  destination TEXT,
  route_notes TEXT,
  rental_fee DECIMAL(12, 2),
  status VARCHAR(20) DEFAULT 'confirmed',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. RLS 政策
ALTER TABLE public.fleet_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fleet_drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fleet_vehicle_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fleet_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fleet_vehicles_all" ON public.fleet_vehicles;
CREATE POLICY "fleet_vehicles_all" ON public.fleet_vehicles FOR ALL
USING (workspace_id = get_current_user_workspace() OR is_super_admin());

DROP POLICY IF EXISTS "fleet_drivers_all" ON public.fleet_drivers;
CREATE POLICY "fleet_drivers_all" ON public.fleet_drivers FOR ALL
USING (workspace_id = get_current_user_workspace() OR is_super_admin());

DROP POLICY IF EXISTS "fleet_logs_all" ON public.fleet_vehicle_logs;
CREATE POLICY "fleet_logs_all" ON public.fleet_vehicle_logs FOR ALL
USING (workspace_id = get_current_user_workspace() OR is_super_admin());

DROP POLICY IF EXISTS "fleet_schedules_all" ON public.fleet_schedules;
CREATE POLICY "fleet_schedules_all" ON public.fleet_schedules FOR ALL
USING (workspace_id = get_current_user_workspace() OR is_super_admin());
