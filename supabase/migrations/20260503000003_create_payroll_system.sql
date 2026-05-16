-- =============================================
-- 薪資系統兩表（2026-05-03 建、純加法）
-- payroll_runs（月份批次）+ payslips（每員工每月薪資 snapshot、immutable）
--
-- 設計決策（vault: erp/modules/hr/decisions/2026-05-03_three_flows_ux.md）：
--   - payroll_runs：每月一筆批次、status: draft → reviewing → finalized
--   - payslips：每員工每月一筆、finalized 後不可改（snapshot）
--   - 計算結果用 JSONB 存 breakdown、所有明細留下供勞檢查核
-- =============================================

-- 1. 薪資批次
CREATE TABLE IF NOT EXISTS payroll_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  period_year INTEGER NOT NULL,
  period_month INTEGER NOT NULL CHECK (period_month >= 1 AND period_month <= 12),
  status VARCHAR(20) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'reviewing', 'finalized', 'paid')),
  total_employees INTEGER NOT NULL DEFAULT 0,
  total_gross_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_deduction_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_net_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  law_version VARCHAR(20),
  note TEXT,
  finalized_at TIMESTAMPTZ,
  finalized_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  UNIQUE(workspace_id, period_year, period_month)
);

CREATE INDEX IF NOT EXISTS idx_payroll_runs_workspace_period
  ON payroll_runs(workspace_id, period_year DESC, period_month DESC);

ALTER TABLE payroll_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payroll_runs_select" ON payroll_runs
  FOR SELECT USING (workspace_id IN (SELECT workspace_id FROM employees WHERE user_id = auth.uid()));
CREATE POLICY "payroll_runs_service" ON payroll_runs FOR ALL USING (true) WITH CHECK (true);

COMMENT ON TABLE payroll_runs IS '薪資批次（每月一筆）';

-- 2. 員工薪資單（snapshot）
CREATE TABLE IF NOT EXISTS payslips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  payroll_run_id UUID NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  period_year INTEGER NOT NULL,
  period_month INTEGER NOT NULL,
  employee_snapshot JSONB NOT NULL DEFAULT '{}',
  gross_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  base_salary NUMERIC(12,2) NOT NULL DEFAULT 0,
  overtime_pay NUMERIC(12,2) NOT NULL DEFAULT 0,
  attendance_bonus NUMERIC(12,2) NOT NULL DEFAULT 0,
  other_allowances NUMERIC(12,2) NOT NULL DEFAULT 0,
  leave_deduction NUMERIC(12,2) NOT NULL DEFAULT 0,
  attendance_bonus_deduction NUMERIC(12,2) NOT NULL DEFAULT 0,
  labor_insurance_employee NUMERIC(12,2) NOT NULL DEFAULT 0,
  health_insurance_employee NUMERIC(12,2) NOT NULL DEFAULT 0,
  pension_voluntary NUMERIC(12,2) NOT NULL DEFAULT 0,
  income_tax NUMERIC(12,2) NOT NULL DEFAULT 0,
  other_deductions NUMERIC(12,2) NOT NULL DEFAULT 0,
  labor_insurance_employer NUMERIC(12,2) NOT NULL DEFAULT 0,
  health_insurance_employer NUMERIC(12,2) NOT NULL DEFAULT 0,
  pension_employer NUMERIC(12,2) NOT NULL DEFAULT 0,
  calc_breakdown JSONB NOT NULL DEFAULT '{}',
  has_warnings BOOLEAN NOT NULL DEFAULT false,
  warnings JSONB NOT NULL DEFAULT '[]',
  net_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  note TEXT,
  sent_to_employee_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  UNIQUE(payroll_run_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_payslips_run ON payslips(payroll_run_id);
CREATE INDEX IF NOT EXISTS idx_payslips_employee_period
  ON payslips(employee_id, period_year DESC, period_month DESC);
CREATE INDEX IF NOT EXISTS idx_payslips_warnings
  ON payslips(workspace_id) WHERE has_warnings = true;

ALTER TABLE payslips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payslips_select" ON payslips
  FOR SELECT USING (workspace_id IN (SELECT workspace_id FROM employees WHERE user_id = auth.uid()));
CREATE POLICY "payslips_service" ON payslips FOR ALL USING (true) WITH CHECK (true);

COMMENT ON TABLE payslips IS '員工薪資單（每員工每月一筆、finalized 後 immutable）';
