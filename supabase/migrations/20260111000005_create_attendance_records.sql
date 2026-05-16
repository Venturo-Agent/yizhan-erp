-- 出勤紀錄表
-- 記錄員工每日的出勤狀況

BEGIN;

CREATE TABLE IF NOT EXISTS public.attendance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  date date NOT NULL,
  clock_in time,
  clock_out time,
  work_hours numeric(4,2),
  overtime_hours numeric(4,2) DEFAULT 0,
  status varchar(20) NOT NULL DEFAULT 'present'
    CHECK (status IN ('present', 'absent', 'late', 'early_leave', 'on_leave', 'holiday', 'weekend')),
  leave_request_id uuid REFERENCES public.leave_requests(id),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- 每位員工每天只有一筆出勤紀錄
  UNIQUE(employee_id, date)
);

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_attendance_records_workspace ON public.attendance_records(workspace_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_employee ON public.attendance_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_date ON public.attendance_records(date);
CREATE INDEX IF NOT EXISTS idx_attendance_records_employee_date
  ON public.attendance_records(employee_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_records_status ON public.attendance_records(status);

-- 欄位說明
COMMENT ON TABLE public.attendance_records IS '出勤紀錄';
COMMENT ON COLUMN public.attendance_records.date IS '出勤日期';
COMMENT ON COLUMN public.attendance_records.clock_in IS '上班打卡時間';
COMMENT ON COLUMN public.attendance_records.clock_out IS '下班打卡時間';
COMMENT ON COLUMN public.attendance_records.work_hours IS '實際工時';
COMMENT ON COLUMN public.attendance_records.overtime_hours IS '加班時數';
COMMENT ON COLUMN public.attendance_records.status IS '出勤狀態: present=出勤, absent=缺勤, late=遲到, early_leave=早退, on_leave=請假, holiday=國定假日, weekend=週末';
COMMENT ON COLUMN public.attendance_records.leave_request_id IS '關聯的請假申請（若是請假狀態）';

-- 啟用 RLS
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

-- RLS 政策
DROP POLICY IF EXISTS "attendance_records_select" ON public.attendance_records;
CREATE POLICY "attendance_records_select" ON public.attendance_records
  FOR SELECT USING (workspace_id = get_current_user_workspace() OR is_super_admin());

DROP POLICY IF EXISTS "attendance_records_insert" ON public.attendance_records;
CREATE POLICY "attendance_records_insert" ON public.attendance_records
  FOR INSERT WITH CHECK (workspace_id = get_current_user_workspace());

DROP POLICY IF EXISTS "attendance_records_update" ON public.attendance_records;
CREATE POLICY "attendance_records_update" ON public.attendance_records
  FOR UPDATE USING (workspace_id = get_current_user_workspace() OR is_super_admin());

DROP POLICY IF EXISTS "attendance_records_delete" ON public.attendance_records;
CREATE POLICY "attendance_records_delete" ON public.attendance_records
  FOR DELETE USING (workspace_id = get_current_user_workspace() OR is_super_admin());

-- 更新 updated_at 的觸發器
CREATE OR REPLACE FUNCTION public.update_attendance_records_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_attendance_records_updated_at ON public.attendance_records;
CREATE TRIGGER trigger_attendance_records_updated_at
  BEFORE UPDATE ON public.attendance_records
  FOR EACH ROW
  EXECUTE FUNCTION public.update_attendance_records_updated_at();

-- 自動計算工時的函數
CREATE OR REPLACE FUNCTION public.calculate_work_hours()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.clock_in IS NOT NULL AND NEW.clock_out IS NOT NULL THEN
    -- 計算工時（以小時為單位）
    NEW.work_hours = EXTRACT(EPOCH FROM (NEW.clock_out - NEW.clock_in)) / 3600;

    -- 如果工時超過 8 小時，計算加班時數
    IF NEW.work_hours > 8 THEN
      NEW.overtime_hours = NEW.work_hours - 8;
    ELSE
      NEW.overtime_hours = 0;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_calculate_work_hours ON public.attendance_records;
CREATE TRIGGER trigger_calculate_work_hours
  BEFORE INSERT OR UPDATE ON public.attendance_records
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_work_hours();

COMMIT;
