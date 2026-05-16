-- 請假申請表
-- 記錄員工的請假申請與審核狀態

BEGIN;

CREATE TABLE IF NOT EXISTS public.leave_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  leave_type_id uuid NOT NULL REFERENCES public.leave_types(id) ON DELETE RESTRICT,
  start_date date NOT NULL,
  end_date date NOT NULL,
  start_time time,
  end_time time,
  days numeric(4,1) NOT NULL,
  reason text,
  proof_url text,
  status varchar(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  approved_by uuid REFERENCES public.employees(id),
  approved_at timestamptz,
  reject_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- 確保結束日期不早於開始日期
  CONSTRAINT leave_requests_date_check CHECK (end_date >= start_date)
);

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_leave_requests_workspace ON public.leave_requests(workspace_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_employee ON public.leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON public.leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_leave_requests_dates ON public.leave_requests(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_leave_requests_employee_dates
  ON public.leave_requests(employee_id, start_date, end_date);

-- 欄位說明
COMMENT ON TABLE public.leave_requests IS '請假申請';
COMMENT ON COLUMN public.leave_requests.start_date IS '開始日期';
COMMENT ON COLUMN public.leave_requests.end_date IS '結束日期';
COMMENT ON COLUMN public.leave_requests.start_time IS '開始時間（半天假用）';
COMMENT ON COLUMN public.leave_requests.end_time IS '結束時間（半天假用）';
COMMENT ON COLUMN public.leave_requests.days IS '請假天數';
COMMENT ON COLUMN public.leave_requests.reason IS '請假事由';
COMMENT ON COLUMN public.leave_requests.proof_url IS '證明文件 URL';
COMMENT ON COLUMN public.leave_requests.status IS '狀態: pending=待審核, approved=已核准, rejected=已駁回, cancelled=已取消';
COMMENT ON COLUMN public.leave_requests.approved_by IS '審核人';
COMMENT ON COLUMN public.leave_requests.approved_at IS '審核時間';
COMMENT ON COLUMN public.leave_requests.reject_reason IS '駁回原因';

-- 啟用 RLS
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

-- RLS 政策
DROP POLICY IF EXISTS "leave_requests_select" ON public.leave_requests;
CREATE POLICY "leave_requests_select" ON public.leave_requests
  FOR SELECT USING (workspace_id = get_current_user_workspace() OR is_super_admin());

DROP POLICY IF EXISTS "leave_requests_insert" ON public.leave_requests;
CREATE POLICY "leave_requests_insert" ON public.leave_requests
  FOR INSERT WITH CHECK (workspace_id = get_current_user_workspace());

DROP POLICY IF EXISTS "leave_requests_update" ON public.leave_requests;
CREATE POLICY "leave_requests_update" ON public.leave_requests
  FOR UPDATE USING (workspace_id = get_current_user_workspace() OR is_super_admin());

DROP POLICY IF EXISTS "leave_requests_delete" ON public.leave_requests;
CREATE POLICY "leave_requests_delete" ON public.leave_requests
  FOR DELETE USING (workspace_id = get_current_user_workspace() OR is_super_admin());

-- 更新 updated_at 的觸發器
DROP TRIGGER IF EXISTS trigger_leave_requests_updated_at ON public.leave_requests;
CREATE TRIGGER trigger_leave_requests_updated_at
  BEFORE UPDATE ON public.leave_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_leave_balances_updated_at();

-- 請假核准時自動更新假別餘額的函數
CREATE OR REPLACE FUNCTION public.update_leave_balance_on_approval()
RETURNS TRIGGER AS $$
BEGIN
  -- 只有當狀態從其他狀態變為 approved 時才更新餘額
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    UPDATE public.leave_balances
    SET used_days = used_days + NEW.days,
        updated_at = now()
    WHERE employee_id = NEW.employee_id
      AND leave_type_id = NEW.leave_type_id
      AND year = EXTRACT(YEAR FROM NEW.start_date);
  END IF;

  -- 如果從 approved 變為其他狀態（取消核准），要扣回
  IF OLD.status = 'approved' AND NEW.status != 'approved' THEN
    UPDATE public.leave_balances
    SET used_days = GREATEST(0, used_days - OLD.days),
        updated_at = now()
    WHERE employee_id = OLD.employee_id
      AND leave_type_id = OLD.leave_type_id
      AND year = EXTRACT(YEAR FROM OLD.start_date);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_leave_balance_on_approval ON public.leave_requests;
CREATE TRIGGER trigger_leave_balance_on_approval
  AFTER UPDATE ON public.leave_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_leave_balance_on_approval();

COMMIT;
