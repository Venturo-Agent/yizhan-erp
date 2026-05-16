-- Online 行程表
-- 當 ERP 交接確認後，行程資料會同步到這個表
-- Online App 從這個表讀取行程資料

CREATE TABLE IF NOT EXISTS online_trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 關聯 ERP 資料（TEXT 類型，配合 ERP 表結構）
  erp_tour_id TEXT REFERENCES tours(id) ON DELETE SET NULL,
  erp_itinerary_id TEXT REFERENCES itineraries(id) ON DELETE SET NULL,
  
  -- 基本資訊
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  departure_date DATE NOT NULL,
  return_date DATE,
  destination TEXT,
  
  -- 行程內容（從 ERP itinerary 複製）
  daily_itinerary JSONB DEFAULT '[]',
  
  -- 領隊資訊
  leader_info JSONB,
  
  -- 集合資訊
  meeting_info JSONB,
  
  -- 航班資訊
  outbound_flight JSONB,
  return_flight JSONB,
  
  -- 狀態
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'departed', 'completed', 'cancelled')),
  handoff_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 時間戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 工作區
  workspace_id TEXT
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_online_trips_erp_tour ON online_trips(erp_tour_id);
CREATE INDEX IF NOT EXISTS idx_online_trips_status ON online_trips(status);
CREATE INDEX IF NOT EXISTS idx_online_trips_departure ON online_trips(departure_date);

-- RLS 政策
ALTER TABLE online_trips ENABLE ROW LEVEL SECURITY;

-- 允許所有已認證用戶讀取
DROP POLICY IF EXISTS "online_trips_select" ON online_trips;
CREATE POLICY "online_trips_select" ON online_trips
  FOR SELECT TO authenticated
  USING (true);

-- 只有 ERP 可以寫入（透過 service_role）
DROP POLICY IF EXISTS "online_trips_insert" ON online_trips;
CREATE POLICY "online_trips_insert" ON online_trips
  FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "online_trips_update" ON online_trips;
CREATE POLICY "online_trips_update" ON online_trips
  FOR UPDATE TO authenticated
  USING (true);

COMMENT ON TABLE online_trips IS 'Online App 的行程資料，從 ERP 交接同步';
