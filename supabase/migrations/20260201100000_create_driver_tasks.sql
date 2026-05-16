-- =============================================
-- 司機任務系統 (Driver Task System)
-- =============================================
-- 用於車公司派單給司機，司機在 Online App 看到任務

BEGIN;

-- ============================================
-- 1. 供應商員工表 (司機、調度員等)
-- ============================================
CREATE TABLE IF NOT EXISTS public.supplier_employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 所屬供應商
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  
  -- 員工資訊
  code VARCHAR(20),                        -- 員工編號
  name VARCHAR(100) NOT NULL,              -- 姓名
  phone VARCHAR(30),                       -- 電話
  email VARCHAR(100),                      -- Email
  line_id VARCHAR(50),                     -- LINE ID
  
  -- 登入資訊 (連結到 app_users)
  app_user_id UUID,                        -- 關聯 Online App 帳號
  
  -- 角色
  role VARCHAR(30) DEFAULT 'driver',       -- driver/dispatcher/admin
  
  -- 車輛資訊 (司機用)
  vehicle_type VARCHAR(50),                -- 車型：sedan/van/bus
  vehicle_plate VARCHAR(20),               -- 車牌
  vehicle_capacity INTEGER,                -- 載客數
  
  -- 狀態
  is_active BOOLEAN DEFAULT true,
  
  -- Workspace
  workspace_id UUID NOT NULL,
  
  -- 時間戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_supplier_employees_supplier ON public.supplier_employees(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_employees_app_user ON public.supplier_employees(app_user_id);
CREATE INDEX IF NOT EXISTS idx_supplier_employees_role ON public.supplier_employees(role);
CREATE INDEX IF NOT EXISTS idx_supplier_employees_workspace ON public.supplier_employees(workspace_id);

-- ============================================
-- 2. 司機任務表
-- ============================================
CREATE TABLE IF NOT EXISTS public.driver_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 任務編號
  task_code VARCHAR(30) NOT NULL,          -- DT260215-001
  
  -- 來源關聯
  tour_request_id UUID REFERENCES public.tour_requests(id),  -- 關聯需求單
  tour_id UUID,                            -- 關聯團（快照）
  tour_code VARCHAR(30),                   -- 團號（快照）
  tour_name VARCHAR(200),                  -- 團名（快照）
  
  -- 供應商
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id),
  supplier_name VARCHAR(200),              -- 供應商名稱（快照）
  
  -- 司機
  driver_id UUID REFERENCES public.supplier_employees(id),
  driver_name VARCHAR(100),                -- 司機姓名（快照）
  driver_phone VARCHAR(30),                -- 司機電話（快照）
  vehicle_info VARCHAR(100),               -- 車輛資訊（快照）
  
  -- 服務日期時間
  service_date DATE NOT NULL,
  
  -- 接客資訊
  pickup_time TIMESTAMPTZ NOT NULL,
  pickup_location VARCHAR(200) NOT NULL,   -- 地點名稱
  pickup_address TEXT,                     -- 詳細地址
  pickup_lat DECIMAL(10,7),
  pickup_lng DECIMAL(10,7),
  pickup_note TEXT,                        -- 接客備註
  
  -- 送達資訊
  dropoff_location VARCHAR(200) NOT NULL,
  dropoff_address TEXT,
  dropoff_lat DECIMAL(10,7),
  dropoff_lng DECIMAL(10,7),
  dropoff_note TEXT,
  
  -- 中途停靠點 (JSONB Array)
  stops JSONB DEFAULT '[]',                -- [{location, address, time, note}]
  
  -- 乘客資訊
  passenger_name VARCHAR(100),             -- 主要聯絡人
  passenger_phone VARCHAR(30),
  passenger_count INTEGER,                 -- 人數
  passenger_note TEXT,                     -- 乘客備註（行李、特殊需求）
  
  -- 旅行社聯絡人
  agency_contact_name VARCHAR(100),        -- 旅行社聯絡人
  agency_contact_phone VARCHAR(30),
  
  -- 狀態流程
  status VARCHAR(30) DEFAULT 'pending',    -- pending/assigned/accepted/en_route/picked_up/completed/cancelled
  
  -- 時間記錄
  assigned_at TIMESTAMPTZ,                 -- 派單時間
  accepted_at TIMESTAMPTZ,                 -- 司機接受時間
  started_at TIMESTAMPTZ,                  -- 開始前往時間
  picked_up_at TIMESTAMPTZ,                -- 接到客人時間
  completed_at TIMESTAMPTZ,                -- 完成時間
  cancelled_at TIMESTAMPTZ,                -- 取消時間
  
  -- 備註
  internal_note TEXT,                      -- 內部備註（供應商看）
  driver_note TEXT,                        -- 司機備註
  
  -- 費用
  estimated_cost DECIMAL(12,2),
  final_cost DECIMAL(12,2),
  currency VARCHAR(10) DEFAULT 'TWD',
  
  -- Workspace
  workspace_id UUID NOT NULL,              -- 供應商的 workspace
  source_workspace_id UUID,                -- 來源旅行社的 workspace
  
  -- 時間戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  updated_by UUID
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_driver_tasks_code ON public.driver_tasks(task_code);
CREATE INDEX IF NOT EXISTS idx_driver_tasks_supplier ON public.driver_tasks(supplier_id);
CREATE INDEX IF NOT EXISTS idx_driver_tasks_driver ON public.driver_tasks(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_tasks_tour_request ON public.driver_tasks(tour_request_id);
CREATE INDEX IF NOT EXISTS idx_driver_tasks_service_date ON public.driver_tasks(service_date);
CREATE INDEX IF NOT EXISTS idx_driver_tasks_status ON public.driver_tasks(status);
CREATE INDEX IF NOT EXISTS idx_driver_tasks_workspace ON public.driver_tasks(workspace_id);

-- ============================================
-- 3. 視圖：司機今日任務
-- ============================================
CREATE OR REPLACE VIEW public.driver_tasks_today AS
SELECT 
  dt.*,
  se.name as driver_display_name,
  se.phone as driver_display_phone,
  se.vehicle_plate,
  se.vehicle_type
FROM public.driver_tasks dt
LEFT JOIN public.supplier_employees se ON dt.driver_id = se.id
WHERE dt.service_date = CURRENT_DATE
  AND dt.status NOT IN ('cancelled', 'completed')
ORDER BY dt.pickup_time;

-- ============================================
-- 4. 觸發器
-- ============================================
CREATE OR REPLACE FUNCTION update_driver_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_driver_tasks_updated_at
  BEFORE UPDATE ON public.driver_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_driver_tasks_updated_at();

CREATE TRIGGER trigger_supplier_employees_updated_at
  BEFORE UPDATE ON public.supplier_employees
  FOR EACH ROW
  EXECUTE FUNCTION update_driver_tasks_updated_at();

-- ============================================
-- 5. RLS (暫時停用，符合現有系統模式)
-- ============================================
ALTER TABLE public.supplier_employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_tasks DISABLE ROW LEVEL SECURITY;

-- ============================================
-- 6. 註解
-- ============================================
COMMENT ON TABLE public.supplier_employees IS '供應商員工表 - 司機、調度員等';
COMMENT ON TABLE public.driver_tasks IS '司機任務表 - 從需求單派發的接送任務';
COMMENT ON VIEW public.driver_tasks_today IS '司機今日任務視圖';

COMMIT;
