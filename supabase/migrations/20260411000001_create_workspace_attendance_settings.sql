-- 租戶打卡設定
CREATE TABLE IF NOT EXISTS workspace_attendance_settings (
  workspace_id UUID PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
  work_start_time TIME NOT NULL DEFAULT '09:00',
  work_end_time TIME NOT NULL DEFAULT '18:00',
  late_threshold_minutes INTEGER NOT NULL DEFAULT 0,
  early_leave_threshold_minutes INTEGER NOT NULL DEFAULT 0,
  standard_work_hours NUMERIC(4,2) NOT NULL DEFAULT 8.00,
  allow_missed_clock_request BOOLEAN NOT NULL DEFAULT true,
  require_gps BOOLEAN NOT NULL DEFAULT false,
  gps_latitude NUMERIC(10,7),
  gps_longitude NUMERIC(10,7),
  gps_radius_meters INTEGER DEFAULT 500,
  enable_line_clock BOOLEAN NOT NULL DEFAULT true,
  enable_web_clock BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE workspace_attendance_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_attendance_settings_select" ON workspace_attendance_settings
  FOR SELECT USING (workspace_id IN (
    SELECT workspace_id FROM employees WHERE id = auth.uid()
  ));

CREATE POLICY "workspace_attendance_settings_all" ON workspace_attendance_settings
  FOR ALL USING (workspace_id IN (
    SELECT workspace_id FROM employees WHERE id = auth.uid()
  ));

-- 也允許 service role 存取（API 用）
CREATE POLICY "workspace_attendance_settings_service" ON workspace_attendance_settings
  FOR ALL USING (true) WITH CHECK (true);

COMMENT ON TABLE workspace_attendance_settings IS '租戶打卡設定';
COMMENT ON COLUMN workspace_attendance_settings.late_threshold_minutes IS '遲到寬限分鐘數（0=準時算遲到）';
COMMENT ON COLUMN workspace_attendance_settings.gps_radius_meters IS 'GPS 打卡允許半徑（公尺）';
