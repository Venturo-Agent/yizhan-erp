-- =============================================
-- 加班申請 + 補打卡申請 + 公司公告
-- =============================================

BEGIN;

-- 加班申請
CREATE TABLE IF NOT EXISTS overtime_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  hours NUMERIC(4,2) NOT NULL,
  reason TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  approved_by UUID REFERENCES employees(id),
  approved_at TIMESTAMPTZ,
  reject_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_overtime_requests_employee ON overtime_requests(employee_id);
CREATE INDEX idx_overtime_requests_status ON overtime_requests(status);
CREATE INDEX idx_overtime_requests_date ON overtime_requests(date);

ALTER TABLE overtime_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "overtime_requests_select" ON overtime_requests FOR SELECT USING (true);
CREATE POLICY "overtime_requests_insert" ON overtime_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "overtime_requests_update" ON overtime_requests FOR UPDATE USING (true);

COMMENT ON TABLE overtime_requests IS '加班申請';

-- 補打卡申請
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
  approved_by UUID REFERENCES employees(id),
  approved_at TIMESTAMPTZ,
  reject_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_missed_clock_requests_employee ON missed_clock_requests(employee_id);
CREATE INDEX idx_missed_clock_requests_status ON missed_clock_requests(status);

ALTER TABLE missed_clock_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "missed_clock_requests_select" ON missed_clock_requests FOR SELECT USING (true);
CREATE POLICY "missed_clock_requests_insert" ON missed_clock_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "missed_clock_requests_update" ON missed_clock_requests FOR UPDATE USING (true);

COMMENT ON TABLE missed_clock_requests IS '補打卡申請';

-- 公司公告
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  content TEXT,
  category VARCHAR(50) DEFAULT 'general',
  -- general, policy, event, urgent
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_announcements_workspace ON announcements(workspace_id);
CREATE INDEX idx_announcements_published ON announcements(published_at DESC);

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "announcements_select" ON announcements FOR SELECT USING (true);
CREATE POLICY "announcements_insert" ON announcements FOR INSERT WITH CHECK (true);
CREATE POLICY "announcements_update" ON announcements FOR UPDATE USING (true);
CREATE POLICY "announcements_delete" ON announcements FOR DELETE USING (true);

COMMENT ON TABLE announcements IS '公司公告';

-- 薪資扣款類型（租戶可自訂）
CREATE TABLE IF NOT EXISTS payroll_deduction_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  code VARCHAR(50) NOT NULL,
  -- labor_insurance, health_insurance, pension, custom_*
  name VARCHAR(100) NOT NULL,
  calc_method VARCHAR(20) NOT NULL DEFAULT 'fixed'
    CHECK (calc_method IN ('fixed', 'percentage', 'bracket')),
  calc_config JSONB DEFAULT '{}',
  is_employer_paid BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id, code)
);

ALTER TABLE payroll_deduction_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payroll_deduction_types_select" ON payroll_deduction_types FOR SELECT USING (true);
CREATE POLICY "payroll_deduction_types_all" ON payroll_deduction_types FOR ALL USING (true);

COMMENT ON TABLE payroll_deduction_types IS '薪資扣款類型（租戶設定）';
COMMENT ON COLUMN payroll_deduction_types.calc_method IS 'fixed=固定金額, percentage=費率, bracket=級距表';
COMMENT ON COLUMN payroll_deduction_types.calc_config IS '計算參數 JSON（費率、級距表等）';

-- 津貼類型（租戶可自訂）
CREATE TABLE IF NOT EXISTS payroll_allowance_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  default_amount NUMERIC(10,2) DEFAULT 0,
  is_taxable BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id, code)
);

ALTER TABLE payroll_allowance_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payroll_allowance_types_select" ON payroll_allowance_types FOR SELECT USING (true);
CREATE POLICY "payroll_allowance_types_all" ON payroll_allowance_types FOR ALL USING (true);

COMMENT ON TABLE payroll_allowance_types IS '津貼類型（租戶設定）';

-- 員工薪資設定（投保薪資、個人扣款覆寫等）
CREATE TABLE IF NOT EXISTS employee_payroll_config (
  employee_id UUID PRIMARY KEY REFERENCES employees(id) ON DELETE CASCADE,
  insured_salary NUMERIC(10,2),
  -- 投保薪資
  health_dependents INTEGER NOT NULL DEFAULT 0,
  -- 健保眷屬人數
  deduction_overrides JSONB DEFAULT '{}',
  -- 特殊扣款覆寫
  allowance_overrides JSONB DEFAULT '{}',
  -- 個人津貼覆寫
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE employee_payroll_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "employee_payroll_config_select" ON employee_payroll_config FOR SELECT USING (true);
CREATE POLICY "employee_payroll_config_all" ON employee_payroll_config FOR ALL USING (true);

COMMENT ON TABLE employee_payroll_config IS '員工薪資設定（投保薪資、眷屬等）';

COMMIT;
