-- 假別類型表
-- 公司可自訂的假別類型：特休、病假、事假、婚假、喪假、產假、陪產假等

BEGIN;

CREATE TABLE IF NOT EXISTS public.leave_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name varchar(50) NOT NULL,
  code varchar(20) NOT NULL,
  days_per_year numeric(4,1),
  is_paid boolean DEFAULT true,
  requires_proof boolean DEFAULT false,
  is_active boolean DEFAULT true,
  sort_order int DEFAULT 0,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- 每個 workspace 的假別代碼必須唯一
  UNIQUE(workspace_id, code)
);

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_leave_types_workspace ON public.leave_types(workspace_id);
CREATE INDEX IF NOT EXISTS idx_leave_types_active ON public.leave_types(workspace_id, is_active);

-- 欄位說明
COMMENT ON TABLE public.leave_types IS '假別類型';
COMMENT ON COLUMN public.leave_types.name IS '假別名稱，如：特休、病假、事假';
COMMENT ON COLUMN public.leave_types.code IS '假別代碼，如：ANNUAL, SICK, PERSONAL';
COMMENT ON COLUMN public.leave_types.days_per_year IS '年度配額天數（特休、病假等有限額的假別）';
COMMENT ON COLUMN public.leave_types.is_paid IS '是否給薪';
COMMENT ON COLUMN public.leave_types.requires_proof IS '是否需要證明文件';
COMMENT ON COLUMN public.leave_types.is_active IS '是否啟用';
COMMENT ON COLUMN public.leave_types.sort_order IS '排序順序';

-- 啟用 RLS
ALTER TABLE public.leave_types ENABLE ROW LEVEL SECURITY;

-- RLS 政策
DROP POLICY IF EXISTS "leave_types_select" ON public.leave_types;
CREATE POLICY "leave_types_select" ON public.leave_types
  FOR SELECT USING (workspace_id = get_current_user_workspace() OR is_super_admin());

DROP POLICY IF EXISTS "leave_types_insert" ON public.leave_types;
CREATE POLICY "leave_types_insert" ON public.leave_types
  FOR INSERT WITH CHECK (workspace_id = get_current_user_workspace());

DROP POLICY IF EXISTS "leave_types_update" ON public.leave_types;
CREATE POLICY "leave_types_update" ON public.leave_types
  FOR UPDATE USING (workspace_id = get_current_user_workspace() OR is_super_admin());

DROP POLICY IF EXISTS "leave_types_delete" ON public.leave_types;
CREATE POLICY "leave_types_delete" ON public.leave_types
  FOR DELETE USING (workspace_id = get_current_user_workspace() OR is_super_admin());

-- 插入預設假別類型的函數（workspace 建立時呼叫）
CREATE OR REPLACE FUNCTION public.create_default_leave_types(p_workspace_id uuid)
RETURNS void AS $$
BEGIN
  INSERT INTO public.leave_types (workspace_id, name, code, days_per_year, is_paid, requires_proof, sort_order)
  VALUES
    (p_workspace_id, '特休', 'ANNUAL', NULL, true, false, 1),
    (p_workspace_id, '病假', 'SICK', 30, true, true, 2),
    (p_workspace_id, '事假', 'PERSONAL', 14, false, false, 3),
    (p_workspace_id, '婚假', 'MARRIAGE', 8, true, true, 4),
    (p_workspace_id, '喪假', 'FUNERAL', 8, true, true, 5),
    (p_workspace_id, '產假', 'MATERNITY', 56, true, true, 6),
    (p_workspace_id, '陪產假', 'PATERNITY', 7, true, true, 7),
    (p_workspace_id, '公假', 'OFFICIAL', NULL, true, true, 8)
  ON CONFLICT (workspace_id, code) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.create_default_leave_types IS '為 workspace 建立預設假別類型';

COMMIT;
