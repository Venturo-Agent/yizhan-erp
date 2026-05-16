-- =============================================
-- 出勤核心三表（2026-05-03 重建、純加法）
-- clock_records / missed_clock_requests / overtime_requests
--
-- 背景：
--   v0 在 20260411000003 建過 missed_clock_requests / overtime_requests，後來某次清理被砍。
--   2026-05-03 重建、加上 clock_records（v0 從來沒建過 raw 打卡層）。
--
-- 設計決策（見 vault：erp/modules/hr/decisions/2026-05-03_three_flows_ux.md）：
--   - MVP 只做 raw 層 clock_records、不做 derived attendance_daily（用 view）
--   - 一天可有多筆（上班 / 下班 / 補打卡），不寫成 (employee_id, date) UNIQUE
--   - GPS 失敗不擋打卡、is_remote = true 由 admin review
-- =============================================

-- 1. 補打卡申請
CREATE TABLE IF NOT EXISTS missed_clock_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  clock_type VARCHAR(10) NOT NULL CHECK (clock_type IN ('clock_in', 'clock_out')),
  requested_time TIME NOT NULL,
  reason TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  approved_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  reject_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES employees(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_missed_clock_employee ON missed_clock_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_missed_clock_status ON missed_clock_requests(workspace_id, status);

ALTER TABLE missed_clock_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "missed_clock_select" ON missed_clock_requests
  FOR SELECT USING (workspace_id IN (SELECT workspace_id FROM employees WHERE user_id = auth.uid()));
CREATE POLICY "missed_clock_insert" ON missed_clock_requests
  FOR INSERT WITH CHECK (workspace_id IN (SELECT workspace_id FROM employees WHERE user_id = auth.uid()));
CREATE POLICY "missed_clock_update" ON missed_clock_requests
  FOR UPDATE USING (workspace_id IN (SELECT workspace_id FROM employees WHERE user_id = auth.uid()));
CREATE POLICY "missed_clock_service" ON missed_clock_requests
  FOR ALL USING (true) WITH CHECK (true);

COMMENT ON TABLE missed_clock_requests IS '補打卡申請';

-- 2. 加班申請
CREATE TABLE IF NOT EXISTS overtime_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  hours NUMERIC(4,2) NOT NULL,
  overtime_type VARCHAR(20) NOT NULL DEFAULT 'weekday'
    CHECK (overtime_type IN ('weekday', 'rest_day', 'holiday', 'official_holiday')),
  reason TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  approved_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  reject_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES employees(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_overtime_employee ON overtime_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_overtime_status ON overtime_requests(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_overtime_date ON overtime_requests(workspace_id, date);

ALTER TABLE overtime_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "overtime_select" ON overtime_requests
  FOR SELECT USING (workspace_id IN (SELECT workspace_id FROM employees WHERE user_id = auth.uid()));
CREATE POLICY "overtime_insert" ON overtime_requests
  FOR INSERT WITH CHECK (workspace_id IN (SELECT workspace_id FROM employees WHERE user_id = auth.uid()));
CREATE POLICY "overtime_update" ON overtime_requests
  FOR UPDATE USING (workspace_id IN (SELECT workspace_id FROM employees WHERE user_id = auth.uid()));
CREATE POLICY "overtime_service" ON overtime_requests
  FOR ALL USING (true) WITH CHECK (true);

COMMENT ON TABLE overtime_requests IS '加班申請';

-- 3. 員工打卡記錄（raw 層）
CREATE TABLE IF NOT EXISTS clock_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  clock_type VARCHAR(10) NOT NULL CHECK (clock_type IN ('clock_in', 'clock_out')),
  clock_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  clock_date DATE NOT NULL DEFAULT CURRENT_DATE,
  source VARCHAR(20) NOT NULL DEFAULT 'web'
    CHECK (source IN ('web', 'mobile', 'line', 'manual')),
  gps_latitude NUMERIC(10,7),
  gps_longitude NUMERIC(10,7),
  gps_accuracy_meters NUMERIC(8,2),
  is_within_geofence BOOLEAN,
  is_remote BOOLEAN NOT NULL DEFAULT false,
  status VARCHAR(20) NOT NULL DEFAULT 'normal'
    CHECK (status IN ('normal', 'late', 'early_leave', 'overtime', 'manual_added')),
  late_minutes INTEGER NOT NULL DEFAULT 0,
  missed_clock_request_id UUID REFERENCES missed_clock_requests(id) ON DELETE SET NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES employees(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_clock_records_employee_date
  ON clock_records(employee_id, clock_date DESC);
CREATE INDEX IF NOT EXISTS idx_clock_records_workspace_date
  ON clock_records(workspace_id, clock_date DESC);
CREATE INDEX IF NOT EXISTS idx_clock_records_status
  ON clock_records(workspace_id, status) WHERE status != 'normal';

ALTER TABLE clock_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clock_records_select" ON clock_records
  FOR SELECT USING (workspace_id IN (SELECT workspace_id FROM employees WHERE user_id = auth.uid()));
CREATE POLICY "clock_records_insert" ON clock_records
  FOR INSERT WITH CHECK (workspace_id IN (SELECT workspace_id FROM employees WHERE user_id = auth.uid()));
CREATE POLICY "clock_records_update" ON clock_records
  FOR UPDATE USING (workspace_id IN (SELECT workspace_id FROM employees WHERE user_id = auth.uid()));
CREATE POLICY "clock_records_service" ON clock_records
  FOR ALL USING (true) WITH CHECK (true);

COMMENT ON TABLE clock_records IS '員工打卡記錄（raw 層、一天可多筆）';
COMMENT ON COLUMN clock_records.is_remote IS 'GPS 不在範圍 / 沒給 GPS、由 admin review';

-- 4. 視圖：每日彙總
CREATE OR REPLACE VIEW v_attendance_daily AS
SELECT
  workspace_id,
  employee_id,
  clock_date,
  MIN(CASE WHEN clock_type = 'clock_in' THEN clock_at END) AS first_clock_in,
  MAX(CASE WHEN clock_type = 'clock_out' THEN clock_at END) AS last_clock_out,
  EXTRACT(EPOCH FROM (
    MAX(CASE WHEN clock_type = 'clock_out' THEN clock_at END)
    - MIN(CASE WHEN clock_type = 'clock_in' THEN clock_at END)
  )) / 3600 AS work_hours,
  MAX(late_minutes) AS late_minutes,
  bool_or(is_remote) AS has_remote_clock,
  COUNT(*) FILTER (WHERE status != 'normal') AS abnormal_count
FROM clock_records
GROUP BY workspace_id, employee_id, clock_date;

COMMENT ON VIEW v_attendance_daily IS '每日打卡彙總視圖（替代 attendance_daily 表、MVP 階段）';
