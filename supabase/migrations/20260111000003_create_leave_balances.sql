-- 員工假別餘額表
-- 記錄每位員工各年度各假別的配額與使用情況

BEGIN;

CREATE TABLE IF NOT EXISTS public.leave_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  leave_type_id uuid NOT NULL REFERENCES public.leave_types(id) ON DELETE CASCADE,
  year int NOT NULL,
  entitled_days numeric(4,1) NOT NULL DEFAULT 0,
  used_days numeric(4,1) NOT NULL DEFAULT 0,
  remaining_days numeric(4,1) GENERATED ALWAYS AS (entitled_days - used_days) STORED,
  carry_over_days numeric(4,1) DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- 每位員工每個假別每年只有一筆記錄
  UNIQUE(employee_id, leave_type_id, year)
);

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_leave_balances_workspace ON public.leave_balances(workspace_id);
CREATE INDEX IF NOT EXISTS idx_leave_balances_employee ON public.leave_balances(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_balances_year ON public.leave_balances(year);
CREATE INDEX IF NOT EXISTS idx_leave_balances_employee_year ON public.leave_balances(employee_id, year);

-- 欄位說明
COMMENT ON TABLE public.leave_balances IS '員工假別餘額';
COMMENT ON COLUMN public.leave_balances.year IS '年度';
COMMENT ON COLUMN public.leave_balances.entitled_days IS '應有天數（配額）';
COMMENT ON COLUMN public.leave_balances.used_days IS '已使用天數';
COMMENT ON COLUMN public.leave_balances.remaining_days IS '剩餘天數（自動計算）';
COMMENT ON COLUMN public.leave_balances.carry_over_days IS '前一年遞延天數';

-- 啟用 RLS
ALTER TABLE public.leave_balances ENABLE ROW LEVEL SECURITY;

-- RLS 政策
DROP POLICY IF EXISTS "leave_balances_select" ON public.leave_balances;
CREATE POLICY "leave_balances_select" ON public.leave_balances
  FOR SELECT USING (workspace_id = get_current_user_workspace() OR is_super_admin());

DROP POLICY IF EXISTS "leave_balances_insert" ON public.leave_balances;
CREATE POLICY "leave_balances_insert" ON public.leave_balances
  FOR INSERT WITH CHECK (workspace_id = get_current_user_workspace());

DROP POLICY IF EXISTS "leave_balances_update" ON public.leave_balances;
CREATE POLICY "leave_balances_update" ON public.leave_balances
  FOR UPDATE USING (workspace_id = get_current_user_workspace() OR is_super_admin());

DROP POLICY IF EXISTS "leave_balances_delete" ON public.leave_balances;
CREATE POLICY "leave_balances_delete" ON public.leave_balances
  FOR DELETE USING (workspace_id = get_current_user_workspace() OR is_super_admin());

-- 更新 updated_at 的觸發器
CREATE OR REPLACE FUNCTION public.update_leave_balances_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_leave_balances_updated_at ON public.leave_balances;
CREATE TRIGGER trigger_leave_balances_updated_at
  BEFORE UPDATE ON public.leave_balances
  FOR EACH ROW
  EXECUTE FUNCTION public.update_leave_balances_updated_at();

COMMIT;
