-- =============================================
-- 請假系統三表（2026-05-03 建、純加法）
-- leave_types / leave_balances / leave_requests
--
-- 設計決策（vault: erp/modules/hr/decisions/2026-05-03_three_flows_ux.md）：
--   - leave_types tenant 隔離、預設 9 種假別 seed 進去
--   - leave_balances 一員工一假別一年度一筆、used_days 即時扣
--   - leave_requests 單級審批 + 2026 新制（病假 10 日保護期、家庭照顧假小時、全勤比例扣）
--   - 最小單位：以 minutes 整數儲存（家庭照顧假小時制必須）
-- =============================================

-- 1. 假別主檔
CREATE TABLE IF NOT EXISTS leave_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  pay_type VARCHAR(20) NOT NULL DEFAULT 'unpaid'
    CHECK (pay_type IN ('full', 'half', 'unpaid')),
  quota_type VARCHAR(30) NOT NULL DEFAULT 'annual_fixed'
    CHECK (quota_type IN ('annual_seniority', 'annual_fixed', 'event_based', 'no_limit', 'monthly_fixed')),
  default_days_per_year NUMERIC(5,2),
  attendance_bonus_flag VARCHAR(20) NOT NULL DEFAULT 'deductible'
    CHECK (attendance_bonus_flag IN ('protected', 'proportional', 'deductible')),
  legal_basis TEXT,
  requires_attachment BOOLEAN NOT NULL DEFAULT false,
  attachment_threshold_days NUMERIC(5,2),
  supports_hourly BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, code)
);

ALTER TABLE leave_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "leave_types_select" ON leave_types
  FOR SELECT USING (workspace_id IN (SELECT workspace_id FROM employees WHERE user_id = auth.uid()));
CREATE POLICY "leave_types_service" ON leave_types FOR ALL USING (true) WITH CHECK (true);

COMMENT ON TABLE leave_types IS '假別主檔（tenant 隔離、預設 9 種）';

-- 2. 假額餘額
CREATE TABLE IF NOT EXISTS leave_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  leave_type_id UUID NOT NULL REFERENCES leave_types(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  total_days NUMERIC(5,2) NOT NULL DEFAULT 0,
  used_days NUMERIC(5,2) NOT NULL DEFAULT 0,
  pending_days NUMERIC(5,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(employee_id, leave_type_id, year)
);

CREATE INDEX IF NOT EXISTS idx_leave_balances_employee_year
  ON leave_balances(employee_id, year);

ALTER TABLE leave_balances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "leave_balances_select" ON leave_balances
  FOR SELECT USING (workspace_id IN (SELECT workspace_id FROM employees WHERE user_id = auth.uid()));
CREATE POLICY "leave_balances_service" ON leave_balances FOR ALL USING (true) WITH CHECK (true);

COMMENT ON TABLE leave_balances IS '員工假額餘額（年度）';

-- 3. 請假申請
CREATE TABLE IF NOT EXISTS leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  leave_type_id UUID NOT NULL REFERENCES leave_types(id) ON DELETE RESTRICT,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  total_minutes INTEGER NOT NULL,
  total_days NUMERIC(5,2) NOT NULL,
  reason TEXT NOT NULL,
  attachments JSONB NOT NULL DEFAULT '[]',
  estimated_deduction_amount NUMERIC(10,2),
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('draft', 'pending', 'approved', 'rejected', 'cancelled')),
  approver_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  approver_note TEXT,
  reject_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID REFERENCES employees(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_leave_requests_employee
  ON leave_requests(employee_id, start_at DESC);
CREATE INDEX IF NOT EXISTS idx_leave_requests_workspace_status
  ON leave_requests(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_leave_requests_pending
  ON leave_requests(workspace_id) WHERE status = 'pending';

ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "leave_requests_select" ON leave_requests
  FOR SELECT USING (workspace_id IN (SELECT workspace_id FROM employees WHERE user_id = auth.uid()));
CREATE POLICY "leave_requests_insert" ON leave_requests
  FOR INSERT WITH CHECK (workspace_id IN (SELECT workspace_id FROM employees WHERE user_id = auth.uid()));
CREATE POLICY "leave_requests_update" ON leave_requests
  FOR UPDATE USING (workspace_id IN (SELECT workspace_id FROM employees WHERE user_id = auth.uid()));
CREATE POLICY "leave_requests_service" ON leave_requests FOR ALL USING (true) WITH CHECK (true);

COMMENT ON TABLE leave_requests IS '請假申請（單級審批、含 2026 新制）';

-- 4. Seed 9 大假別到所有現存 workspace
INSERT INTO leave_types (workspace_id, code, name, pay_type, quota_type, default_days_per_year, attendance_bonus_flag, legal_basis, requires_attachment, attachment_threshold_days, supports_hourly, sort_order)
SELECT
  w.id,
  v.code, v.name, v.pay_type, v.quota_type, v.default_days, v.bonus_flag, v.basis, v.req_attach, v.attach_threshold, v.hourly, v.sort
FROM workspaces w
CROSS JOIN (VALUES
  ('annual',          '特別休假',     'full',   'annual_seniority', 7,    'protected',    '勞基法第 38 條',                false, NULL,  true,  10),
  ('sick',            '普通傷病假',   'half',   'annual_fixed',     30,   'proportional', '勞工請假規則第 4 條（2026 新制：10 日內禁不利處分）', true,  1.0,   true,  20),
  ('personal',        '事假',         'unpaid', 'annual_fixed',     14,   'deductible',   '勞工請假規則第 7 條',           false, NULL,  true,  30),
  ('marriage',        '婚假',         'full',   'event_based',      8,    'protected',    '勞工請假規則第 2 條',           false, NULL,  false, 40),
  ('bereavement',     '喪假',         'full',   'event_based',      8,    'protected',    '勞工請假規則第 3 條（依親等 3-8 日）', true, 0, false, 50),
  ('official',        '公假',         'full',   'no_limit',         NULL, 'protected',    '勞工請假規則第 8 條',           false, NULL,  false, 60),
  ('official_injury', '公傷病假',     'full',   'no_limit',         NULL, 'protected',    '勞工請假規則第 6 條 / 勞基法第 59 條', true, 0, false, 70),
  ('menstrual',       '生理假',       'half',   'monthly_fixed',    1,    'protected',    '性別平等工作法第 14 條（每月 1 日、年逾 3 日併入病假）', false, NULL, false, 80),
  ('family_care',     '家庭照顧假',   'unpaid', 'annual_fixed',     7,    'protected',    '性別平等工作法第 20 條（2026 新制：可小時為單位）', false, NULL, true, 90)
) AS v(code, name, pay_type, quota_type, default_days, bonus_flag, basis, req_attach, attach_threshold, hourly, sort)
ON CONFLICT (workspace_id, code) DO NOTHING;

-- 5. 初始化所有現存員工的本年度 leave_balances
INSERT INTO leave_balances (workspace_id, employee_id, leave_type_id, year, total_days)
SELECT
  e.workspace_id,
  e.id,
  lt.id,
  EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
  COALESCE(lt.default_days_per_year, 0)
FROM employees e
JOIN leave_types lt ON lt.workspace_id = e.workspace_id
WHERE e.status = 'active'
  AND lt.quota_type IN ('annual_fixed', 'annual_seniority', 'monthly_fixed')
ON CONFLICT (employee_id, leave_type_id, year) DO NOTHING;
