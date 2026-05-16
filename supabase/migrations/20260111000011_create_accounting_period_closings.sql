-- 會計期末結轉記錄表
-- 用於記錄每個期間的結轉歷史，避免重複結轉

BEGIN;

CREATE TABLE IF NOT EXISTS public.accounting_period_closings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  period_type varchar(10) NOT NULL CHECK (period_type IN ('month', 'quarter', 'year')),
  period_start date NOT NULL,
  period_end date NOT NULL,
  closing_voucher_id uuid REFERENCES public.journal_vouchers(id),
  net_income numeric(15,2) NOT NULL DEFAULT 0,
  closed_by uuid REFERENCES public.employees(id),
  closed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),

  -- 確保每個 workspace 的每個期間只能結轉一次
  UNIQUE(workspace_id, period_type, period_start, period_end)
);

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_accounting_period_closings_workspace
  ON public.accounting_period_closings(workspace_id);
CREATE INDEX IF NOT EXISTS idx_accounting_period_closings_period
  ON public.accounting_period_closings(period_start, period_end);

-- 欄位說明
COMMENT ON TABLE public.accounting_period_closings IS '會計期末結轉記錄';
COMMENT ON COLUMN public.accounting_period_closings.period_type IS '期間類型: month=月結, quarter=季結, year=年結';
COMMENT ON COLUMN public.accounting_period_closings.period_start IS '期間開始日期';
COMMENT ON COLUMN public.accounting_period_closings.period_end IS '期間結束日期';
COMMENT ON COLUMN public.accounting_period_closings.closing_voucher_id IS '結轉傳票 ID';
COMMENT ON COLUMN public.accounting_period_closings.net_income IS '本期損益';
COMMENT ON COLUMN public.accounting_period_closings.closed_by IS '結轉執行人';
COMMENT ON COLUMN public.accounting_period_closings.closed_at IS '結轉時間';

-- 啟用 RLS
ALTER TABLE public.accounting_period_closings ENABLE ROW LEVEL SECURITY;

-- RLS 政策
DROP POLICY IF EXISTS "accounting_period_closings_select" ON public.accounting_period_closings;
CREATE POLICY "accounting_period_closings_select" ON public.accounting_period_closings
  FOR SELECT USING (workspace_id = get_current_user_workspace() OR is_super_admin());

DROP POLICY IF EXISTS "accounting_period_closings_insert" ON public.accounting_period_closings;
CREATE POLICY "accounting_period_closings_insert" ON public.accounting_period_closings
  FOR INSERT WITH CHECK (workspace_id = get_current_user_workspace());

DROP POLICY IF EXISTS "accounting_period_closings_update" ON public.accounting_period_closings;
CREATE POLICY "accounting_period_closings_update" ON public.accounting_period_closings
  FOR UPDATE USING (workspace_id = get_current_user_workspace() OR is_super_admin());

DROP POLICY IF EXISTS "accounting_period_closings_delete" ON public.accounting_period_closings;
CREATE POLICY "accounting_period_closings_delete" ON public.accounting_period_closings
  FOR DELETE USING (workspace_id = get_current_user_workspace() OR is_super_admin());

COMMIT;
