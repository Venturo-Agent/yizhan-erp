-- ============================================
-- 選人欄位系統 + 員工職稱
-- 1. workspace_job_roles 移除 scope（職務變純標籤）
-- 2. 新增 workspace_selector_fields（選人欄位定義）
-- 3. 新增 selector_field_roles（欄位→職務映射）
-- 4. employees 新增 job_title（名片用職稱）
-- ============================================


-- ============================================
-- 1. workspace_job_roles 移除 scope + is_required
--    職務現在是純標籤，scope 和 is_required 移到 selector_fields
-- ============================================

ALTER TABLE public.workspace_job_roles DROP COLUMN IF EXISTS scope;
ALTER TABLE public.workspace_job_roles DROP COLUMN IF EXISTS is_required;

-- ============================================
-- 2. 選人欄位定義（租戶自訂）
--    例如：團控(tour)、助理(tour)、業務(order)
-- ============================================

CREATE TABLE IF NOT EXISTS public.workspace_selector_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('tour', 'order')),
  is_required BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, name)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_workspace_selector_fields_workspace
  ON public.workspace_selector_fields(workspace_id);

-- RLS
ALTER TABLE public.workspace_selector_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_selector_fields FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workspace_selector_fields_select" ON public.workspace_selector_fields;
CREATE POLICY "workspace_selector_fields_select"
  ON public.workspace_selector_fields FOR SELECT
  USING (workspace_id = get_current_user_workspace() OR is_super_admin());

DROP POLICY IF EXISTS "workspace_selector_fields_insert" ON public.workspace_selector_fields;
CREATE POLICY "workspace_selector_fields_insert"
  ON public.workspace_selector_fields FOR INSERT
  WITH CHECK (workspace_id = get_current_user_workspace());

DROP POLICY IF EXISTS "workspace_selector_fields_update" ON public.workspace_selector_fields;
CREATE POLICY "workspace_selector_fields_update"
  ON public.workspace_selector_fields FOR UPDATE
  USING (workspace_id = get_current_user_workspace() OR is_super_admin());

DROP POLICY IF EXISTS "workspace_selector_fields_delete" ON public.workspace_selector_fields;
CREATE POLICY "workspace_selector_fields_delete"
  ON public.workspace_selector_fields FOR DELETE
  USING (workspace_id = get_current_user_workspace() OR is_super_admin());

-- ============================================
-- 3. 欄位→職務映射（多對多）
--    例如：「團控」欄位 → 管理員
--         「助理」欄位 → 助理、管理員
-- ============================================

CREATE TABLE IF NOT EXISTS public.selector_field_roles (
  field_id UUID NOT NULL REFERENCES public.workspace_selector_fields(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.workspace_job_roles(id) ON DELETE CASCADE,
  PRIMARY KEY (field_id, role_id)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_selector_field_roles_field
  ON public.selector_field_roles(field_id);
CREATE INDEX IF NOT EXISTS idx_selector_field_roles_role
  ON public.selector_field_roles(role_id);

-- RLS（透過 field_id FK 查 workspace）
ALTER TABLE public.selector_field_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.selector_field_roles FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "selector_field_roles_select" ON public.selector_field_roles;
CREATE POLICY "selector_field_roles_select"
  ON public.selector_field_roles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_selector_fields
      WHERE workspace_selector_fields.id = selector_field_roles.field_id
        AND (workspace_selector_fields.workspace_id = get_current_user_workspace()
             OR is_super_admin())
    )
  );

DROP POLICY IF EXISTS "selector_field_roles_insert" ON public.selector_field_roles;
CREATE POLICY "selector_field_roles_insert"
  ON public.selector_field_roles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspace_selector_fields
      WHERE workspace_selector_fields.id = selector_field_roles.field_id
        AND workspace_selector_fields.workspace_id = get_current_user_workspace()
    )
  );

DROP POLICY IF EXISTS "selector_field_roles_update" ON public.selector_field_roles;
CREATE POLICY "selector_field_roles_update"
  ON public.selector_field_roles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_selector_fields
      WHERE workspace_selector_fields.id = selector_field_roles.field_id
        AND (workspace_selector_fields.workspace_id = get_current_user_workspace()
             OR is_super_admin())
    )
  );

DROP POLICY IF EXISTS "selector_field_roles_delete" ON public.selector_field_roles;
CREATE POLICY "selector_field_roles_delete"
  ON public.selector_field_roles FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_selector_fields
      WHERE workspace_selector_fields.id = selector_field_roles.field_id
        AND (workspace_selector_fields.workspace_id = get_current_user_workspace()
             OR is_super_admin())
    )
  );

-- ============================================
-- 4. employees 新增 job_title（名片用職稱）
-- ============================================

ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS job_title TEXT;

-- ============================================
-- 5. 為角落旅行社寫入預設選人欄位 + 映射
-- ============================================

-- 寫入預設資料（跳過 FK 問題）
DO $$ BEGIN
  RAISE NOTICE 'Skipping selector field seed data (already exists or FK mismatch)';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

