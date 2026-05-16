-- 薪資期間表
-- 記錄每月薪資計算的期間資訊

BEGIN;

CREATE TABLE IF NOT EXISTS public.payroll_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  year int NOT NULL,
  month int NOT NULL CHECK (month BETWEEN 1 AND 12),
  start_date date NOT NULL,
  end_date date NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'processing', 'confirmed', 'paid')),
  confirmed_by uuid REFERENCES public.employees(id),
  confirmed_at timestamptz,
  paid_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- 每個 workspace 每年每月只有一個薪資期間
  UNIQUE(workspace_id, year, month),

  -- 確保結束日期不早於開始日期
  CONSTRAINT payroll_periods_date_check CHECK (end_date >= start_date)
);

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_payroll_periods_workspace ON public.payroll_periods(workspace_id);
CREATE INDEX IF NOT EXISTS idx_payroll_periods_year_month ON public.payroll_periods(year, month);
CREATE INDEX IF NOT EXISTS idx_payroll_periods_status ON public.payroll_periods(status);

-- 欄位說明
COMMENT ON TABLE public.payroll_periods IS '薪資期間';
COMMENT ON COLUMN public.payroll_periods.year IS '年度';
COMMENT ON COLUMN public.payroll_periods.month IS '月份';
COMMENT ON COLUMN public.payroll_periods.start_date IS '期間開始日期';
COMMENT ON COLUMN public.payroll_periods.end_date IS '期間結束日期';
COMMENT ON COLUMN public.payroll_periods.status IS '狀態: draft=草稿, processing=計算中, confirmed=已確認, paid=已發放';
COMMENT ON COLUMN public.payroll_periods.confirmed_by IS '確認人';
COMMENT ON COLUMN public.payroll_periods.confirmed_at IS '確認時間';
COMMENT ON COLUMN public.payroll_periods.paid_at IS '發放時間';

-- 啟用 RLS
ALTER TABLE public.payroll_periods ENABLE ROW LEVEL SECURITY;

-- RLS 政策
DROP POLICY IF EXISTS "payroll_periods_select" ON public.payroll_periods;
CREATE POLICY "payroll_periods_select" ON public.payroll_periods
  FOR SELECT USING (workspace_id = get_current_user_workspace() OR is_super_admin());

DROP POLICY IF EXISTS "payroll_periods_insert" ON public.payroll_periods;
CREATE POLICY "payroll_periods_insert" ON public.payroll_periods
  FOR INSERT WITH CHECK (workspace_id = get_current_user_workspace());

DROP POLICY IF EXISTS "payroll_periods_update" ON public.payroll_periods;
CREATE POLICY "payroll_periods_update" ON public.payroll_periods
  FOR UPDATE USING (workspace_id = get_current_user_workspace() OR is_super_admin());

DROP POLICY IF EXISTS "payroll_periods_delete" ON public.payroll_periods;
CREATE POLICY "payroll_periods_delete" ON public.payroll_periods
  FOR DELETE USING (workspace_id = get_current_user_workspace() OR is_super_admin());

-- 更新 updated_at 的觸發器
CREATE OR REPLACE FUNCTION public.update_payroll_periods_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_payroll_periods_updated_at ON public.payroll_periods;
CREATE TRIGGER trigger_payroll_periods_updated_at
  BEFORE UPDATE ON public.payroll_periods
  FOR EACH ROW
  EXECUTE FUNCTION public.update_payroll_periods_updated_at();

COMMIT;
