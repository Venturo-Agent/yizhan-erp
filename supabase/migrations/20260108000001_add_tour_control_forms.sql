-- 團控表資料表
-- Tour Control Forms Table

BEGIN;

-- 建立團控表資料表
CREATE TABLE IF NOT EXISTS public.tour_control_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid NOT NULL REFERENCES public.proposal_packages(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id),

  -- 所有團控表資料以 JSONB 儲存
  form_data jsonb NOT NULL DEFAULT '{}',

  -- 時間戳記
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),

  -- 確保每個 package 只有一筆團控表
  UNIQUE(package_id)
);

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_tour_control_forms_package_id ON public.tour_control_forms(package_id);
CREATE INDEX IF NOT EXISTS idx_tour_control_forms_workspace_id ON public.tour_control_forms(workspace_id);

-- 啟用 RLS
ALTER TABLE public.tour_control_forms ENABLE ROW LEVEL SECURITY;

-- 建立 RLS 政策
DROP POLICY IF EXISTS "tour_control_forms_select" ON public.tour_control_forms;
CREATE POLICY "tour_control_forms_select" ON public.tour_control_forms FOR SELECT
USING (workspace_id = get_current_user_workspace() OR is_super_admin());

DROP POLICY IF EXISTS "tour_control_forms_insert" ON public.tour_control_forms;
CREATE POLICY "tour_control_forms_insert" ON public.tour_control_forms FOR INSERT
WITH CHECK (workspace_id = get_current_user_workspace());

DROP POLICY IF EXISTS "tour_control_forms_update" ON public.tour_control_forms;
CREATE POLICY "tour_control_forms_update" ON public.tour_control_forms FOR UPDATE
USING (workspace_id = get_current_user_workspace() OR is_super_admin());

DROP POLICY IF EXISTS "tour_control_forms_delete" ON public.tour_control_forms;
CREATE POLICY "tour_control_forms_delete" ON public.tour_control_forms FOR DELETE
USING (workspace_id = get_current_user_workspace() OR is_super_admin());

-- 新增註解
COMMENT ON TABLE public.tour_control_forms IS '團控表資料';
COMMENT ON COLUMN public.tour_control_forms.package_id IS '關聯的套件 ID';
COMMENT ON COLUMN public.tour_control_forms.form_data IS '團控表完整資料 (JSONB)';

COMMIT;
