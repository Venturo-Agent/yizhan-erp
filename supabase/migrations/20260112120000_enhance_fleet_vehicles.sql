-- ============================================
-- 增強車輛表格結構
-- ============================================

-- 添加車輛詳細資訊欄位
ALTER TABLE public.fleet_vehicles
ADD COLUMN IF NOT EXISTS brand VARCHAR(50),
ADD COLUMN IF NOT EXISTS model VARCHAR(50),
ADD COLUMN IF NOT EXISTS year INTEGER,
ADD COLUMN IF NOT EXISTS vin VARCHAR(50),
ADD COLUMN IF NOT EXISTS default_driver_id UUID REFERENCES public.fleet_drivers(id),
ADD COLUMN IF NOT EXISTS registration_date DATE,
ADD COLUMN IF NOT EXISTS inspection_due_date DATE,
ADD COLUMN IF NOT EXISTS insurance_due_date DATE,
ADD COLUMN IF NOT EXISTS last_maintenance_date DATE,
ADD COLUMN IF NOT EXISTS next_maintenance_date DATE,
ADD COLUMN IF NOT EXISTS next_maintenance_km INTEGER,
ADD COLUMN IF NOT EXISTS current_mileage INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS documents JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS created_by UUID,
ADD COLUMN IF NOT EXISTS updated_by UUID;

-- 添加調度表缺少的欄位
ALTER TABLE public.fleet_schedules
ADD COLUMN IF NOT EXISTS driver_id UUID REFERENCES public.fleet_drivers(id),
ADD COLUMN IF NOT EXISTS client_workspace_id UUID,
ADD COLUMN IF NOT EXISTS tour_id UUID,
ADD COLUMN IF NOT EXISTS pickup_location TEXT,
ADD COLUMN IF NOT EXISTS destination TEXT,
ADD COLUMN IF NOT EXISTS route_notes TEXT,
ADD COLUMN IF NOT EXISTS rental_fee DECIMAL(12, 2);

-- 添加車輛記錄表的 updated_at 欄位
ALTER TABLE public.fleet_vehicle_logs
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 創建索引優化查詢
CREATE INDEX IF NOT EXISTS idx_fleet_vehicles_default_driver ON public.fleet_vehicles(default_driver_id);
CREATE INDEX IF NOT EXISTS idx_fleet_vehicles_inspection_due ON public.fleet_vehicles(inspection_due_date);
CREATE INDEX IF NOT EXISTS idx_fleet_vehicles_insurance_due ON public.fleet_vehicles(insurance_due_date);
CREATE INDEX IF NOT EXISTS idx_fleet_schedules_driver ON public.fleet_schedules(driver_id);
CREATE INDEX IF NOT EXISTS idx_fleet_schedules_dates ON public.fleet_schedules(start_date, end_date);
