-- =============================================
-- Online 行程成員表
-- 記錄誰參與了哪個行程、角色是什麼
-- =============================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.online_trip_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 關聯行程
  trip_id UUID NOT NULL REFERENCES public.online_trips(id) ON DELETE CASCADE,
  
  -- 角色：leader=領隊, traveler=團員, driver=司機, guide=導遊
  role TEXT NOT NULL CHECK (role IN ('leader', 'traveler', 'driver', 'guide')),
  
  -- 成員資訊（從 ERP 同步）
  name TEXT,
  phone TEXT,
  
  -- ERP 來源 ID（用於追溯）
  erp_employee_id TEXT,          -- 領隊來源 (employees.id)
  erp_order_member_id TEXT,      -- 團員來源 (order_members.id)
  erp_driver_task_id UUID,       -- 司機任務來源 (driver_tasks.id)
  
  -- 團員專屬欄位
  member_type TEXT,              -- 成人/孩童/嬰兒
  checked_in BOOLEAN DEFAULT false,
  checked_in_at TIMESTAMPTZ,
  special_meal TEXT,
  remarks TEXT,
  
  -- 時間戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_online_trip_members_trip ON public.online_trip_members(trip_id);
CREATE INDEX IF NOT EXISTS idx_online_trip_members_role ON public.online_trip_members(role);
CREATE INDEX IF NOT EXISTS idx_online_trip_members_erp_order_member ON public.online_trip_members(erp_order_member_id);

-- 更新時間觸發器
CREATE OR REPLACE FUNCTION update_online_trip_members_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_online_trip_members_updated_at
  BEFORE UPDATE ON public.online_trip_members
  FOR EACH ROW
  EXECUTE FUNCTION update_online_trip_members_updated_at();

-- RLS（暫時停用，符合現有系統模式）
ALTER TABLE public.online_trip_members DISABLE ROW LEVEL SECURITY;

-- 註解
COMMENT ON TABLE public.online_trip_members IS 'Online 行程成員 - 記錄領隊、團員、司機等參與者';

COMMIT;
