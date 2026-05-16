-- 薪資紀錄表（薪資單）
-- 記錄每位員工每期的薪資明細

BEGIN;

CREATE TABLE IF NOT EXISTS public.payroll_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  payroll_period_id uuid NOT NULL REFERENCES public.payroll_periods(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,

  -- 基本資訊
  base_salary numeric(12,2) NOT NULL DEFAULT 0,

  -- 加項
  overtime_pay numeric(12,2) NOT NULL DEFAULT 0,
  bonus numeric(12,2) NOT NULL DEFAULT 0,
  allowances numeric(12,2) NOT NULL DEFAULT 0,
  meal_allowance numeric(12,2) NOT NULL DEFAULT 0,
  transportation_allowance numeric(12,2) NOT NULL DEFAULT 0,
  other_additions numeric(12,2) NOT NULL DEFAULT 0,

  -- 減項
  unpaid_leave_deduction numeric(12,2) NOT NULL DEFAULT 0,
  late_deduction numeric(12,2) NOT NULL DEFAULT 0,
  other_deductions numeric(12,2) NOT NULL DEFAULT 0,

  -- 計算結果
  gross_salary numeric(12,2) NOT NULL DEFAULT 0,
  total_deductions numeric(12,2) NOT NULL DEFAULT 0,
  net_salary numeric(12,2) NOT NULL DEFAULT 0,

  -- 出勤統計
  work_days int NOT NULL DEFAULT 0,
  actual_work_days int NOT NULL DEFAULT 0,
  overtime_hours numeric(5,2) NOT NULL DEFAULT 0,
  paid_leave_days numeric(4,1) NOT NULL DEFAULT 0,
  unpaid_leave_days numeric(4,1) NOT NULL DEFAULT 0,
  late_count int NOT NULL DEFAULT 0,

  -- 加班明細（JSON 格式）
  overtime_details jsonb,

  -- 津貼明細（JSON 格式）
  allowance_details jsonb,

  -- 扣款明細（JSON 格式）
  deduction_details jsonb,

  -- 備註
  notes text,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- 每位員工每期只有一筆薪資紀錄
  UNIQUE(payroll_period_id, employee_id)
);

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_payroll_records_workspace ON public.payroll_records(workspace_id);
CREATE INDEX IF NOT EXISTS idx_payroll_records_period ON public.payroll_records(payroll_period_id);
CREATE INDEX IF NOT EXISTS idx_payroll_records_employee ON public.payroll_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_records_period_employee
  ON public.payroll_records(payroll_period_id, employee_id);

-- 欄位說明
COMMENT ON TABLE public.payroll_records IS '薪資紀錄（薪資單）';
COMMENT ON COLUMN public.payroll_records.base_salary IS '底薪';
COMMENT ON COLUMN public.payroll_records.overtime_pay IS '加班費';
COMMENT ON COLUMN public.payroll_records.bonus IS '獎金';
COMMENT ON COLUMN public.payroll_records.allowances IS '津貼總額';
COMMENT ON COLUMN public.payroll_records.meal_allowance IS '伙食津貼';
COMMENT ON COLUMN public.payroll_records.transportation_allowance IS '交通津貼';
COMMENT ON COLUMN public.payroll_records.other_additions IS '其他加項';
COMMENT ON COLUMN public.payroll_records.unpaid_leave_deduction IS '無薪假扣款';
COMMENT ON COLUMN public.payroll_records.late_deduction IS '遲到扣款';
COMMENT ON COLUMN public.payroll_records.other_deductions IS '其他扣款';
COMMENT ON COLUMN public.payroll_records.gross_salary IS '應發薪資';
COMMENT ON COLUMN public.payroll_records.total_deductions IS '總扣款';
COMMENT ON COLUMN public.payroll_records.net_salary IS '實發薪資';
COMMENT ON COLUMN public.payroll_records.work_days IS '應出勤天數';
COMMENT ON COLUMN public.payroll_records.actual_work_days IS '實際出勤天數';
COMMENT ON COLUMN public.payroll_records.overtime_hours IS '加班時數';
COMMENT ON COLUMN public.payroll_records.paid_leave_days IS '有薪假天數';
COMMENT ON COLUMN public.payroll_records.unpaid_leave_days IS '無薪假天數';
COMMENT ON COLUMN public.payroll_records.late_count IS '遲到次數';
COMMENT ON COLUMN public.payroll_records.overtime_details IS '加班明細 JSON';
COMMENT ON COLUMN public.payroll_records.allowance_details IS '津貼明細 JSON';
COMMENT ON COLUMN public.payroll_records.deduction_details IS '扣款明細 JSON';

-- 啟用 RLS
ALTER TABLE public.payroll_records ENABLE ROW LEVEL SECURITY;

-- RLS 政策
DROP POLICY IF EXISTS "payroll_records_select" ON public.payroll_records;
CREATE POLICY "payroll_records_select" ON public.payroll_records
  FOR SELECT USING (workspace_id = get_current_user_workspace() OR is_super_admin());

DROP POLICY IF EXISTS "payroll_records_insert" ON public.payroll_records;
CREATE POLICY "payroll_records_insert" ON public.payroll_records
  FOR INSERT WITH CHECK (workspace_id = get_current_user_workspace());

DROP POLICY IF EXISTS "payroll_records_update" ON public.payroll_records;
CREATE POLICY "payroll_records_update" ON public.payroll_records
  FOR UPDATE USING (workspace_id = get_current_user_workspace() OR is_super_admin());

DROP POLICY IF EXISTS "payroll_records_delete" ON public.payroll_records;
CREATE POLICY "payroll_records_delete" ON public.payroll_records
  FOR DELETE USING (workspace_id = get_current_user_workspace() OR is_super_admin());

-- 更新 updated_at 的觸發器
CREATE OR REPLACE FUNCTION public.update_payroll_records_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_payroll_records_updated_at ON public.payroll_records;
CREATE TRIGGER trigger_payroll_records_updated_at
  BEFORE UPDATE ON public.payroll_records
  FOR EACH ROW
  EXECUTE FUNCTION public.update_payroll_records_updated_at();

-- 自動計算薪資總額的函數
CREATE OR REPLACE FUNCTION public.calculate_payroll_totals()
RETURNS TRIGGER AS $$
BEGIN
  -- 計算應發薪資
  NEW.gross_salary = NEW.base_salary
    + NEW.overtime_pay
    + NEW.bonus
    + NEW.allowances
    + NEW.meal_allowance
    + NEW.transportation_allowance
    + NEW.other_additions;

  -- 計算總扣款
  NEW.total_deductions = NEW.unpaid_leave_deduction
    + NEW.late_deduction
    + NEW.other_deductions;

  -- 計算實發薪資
  NEW.net_salary = NEW.gross_salary - NEW.total_deductions;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_calculate_payroll_totals ON public.payroll_records;
CREATE TRIGGER trigger_calculate_payroll_totals
  BEFORE INSERT OR UPDATE ON public.payroll_records
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_payroll_totals();

COMMIT;
