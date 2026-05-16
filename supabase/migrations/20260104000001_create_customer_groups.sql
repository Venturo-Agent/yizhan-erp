-- Customer Groups Migration
-- 客戶群組功能：用於管理家庭、公司、社團等客戶關係

BEGIN;

-- 1. 創建 customer_groups 表
CREATE TABLE IF NOT EXISTS public.customer_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'other' CHECK (type IN ('family', 'company', 'club', 'other')),
  note text,
  created_by uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. 創建 customer_group_members 表
CREATE TABLE IF NOT EXISTS public.customer_group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.customer_groups(id) ON DELETE CASCADE,
  customer_id text NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  role text DEFAULT 'member' CHECK (role IN ('leader', 'member')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(group_id, customer_id)
);

-- 3. 創建索引
CREATE INDEX IF NOT EXISTS idx_customer_groups_workspace_id ON public.customer_groups(workspace_id);
CREATE INDEX IF NOT EXISTS idx_customer_groups_type ON public.customer_groups(type);
CREATE INDEX IF NOT EXISTS idx_customer_groups_created_by ON public.customer_groups(created_by);
CREATE INDEX IF NOT EXISTS idx_customer_group_members_group_id ON public.customer_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_customer_group_members_customer_id ON public.customer_group_members(customer_id);

-- 4. 啟用 RLS
ALTER TABLE public.customer_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_group_members ENABLE ROW LEVEL SECURITY;

-- 5. 創建 RLS Policies for customer_groups
DROP POLICY IF EXISTS "customer_groups_select" ON public.customer_groups;
CREATE POLICY "customer_groups_select" ON public.customer_groups FOR SELECT
USING (workspace_id = get_current_user_workspace() OR is_super_admin());

DROP POLICY IF EXISTS "customer_groups_insert" ON public.customer_groups;
CREATE POLICY "customer_groups_insert" ON public.customer_groups FOR INSERT
WITH CHECK (workspace_id = get_current_user_workspace());

DROP POLICY IF EXISTS "customer_groups_update" ON public.customer_groups;
CREATE POLICY "customer_groups_update" ON public.customer_groups FOR UPDATE
USING (workspace_id = get_current_user_workspace() OR is_super_admin());

DROP POLICY IF EXISTS "customer_groups_delete" ON public.customer_groups;
CREATE POLICY "customer_groups_delete" ON public.customer_groups FOR DELETE
USING (workspace_id = get_current_user_workspace() OR is_super_admin());

-- 6. 創建 RLS Policies for customer_group_members
-- 通過 group_id 關聯到 customer_groups 來檢查 workspace
DROP POLICY IF EXISTS "customer_group_members_select" ON public.customer_group_members;
CREATE POLICY "customer_group_members_select" ON public.customer_group_members FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.customer_groups g
    WHERE g.id = group_id
    AND (g.workspace_id = get_current_user_workspace() OR is_super_admin())
  )
);

DROP POLICY IF EXISTS "customer_group_members_insert" ON public.customer_group_members;
CREATE POLICY "customer_group_members_insert" ON public.customer_group_members FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.customer_groups g
    WHERE g.id = group_id
    AND g.workspace_id = get_current_user_workspace()
  )
);

DROP POLICY IF EXISTS "customer_group_members_update" ON public.customer_group_members;
CREATE POLICY "customer_group_members_update" ON public.customer_group_members FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.customer_groups g
    WHERE g.id = group_id
    AND (g.workspace_id = get_current_user_workspace() OR is_super_admin())
  )
);

DROP POLICY IF EXISTS "customer_group_members_delete" ON public.customer_group_members;
CREATE POLICY "customer_group_members_delete" ON public.customer_group_members FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.customer_groups g
    WHERE g.id = group_id
    AND (g.workspace_id = get_current_user_workspace() OR is_super_admin())
  )
);

-- 7. 添加註解
COMMENT ON TABLE public.customer_groups IS '客戶群組：用於管理家庭、公司、社團等客戶關係';
COMMENT ON COLUMN public.customer_groups.type IS '群組類型：family=家庭, company=公司, club=社團, other=其他';
COMMENT ON COLUMN public.customer_groups.created_by IS '建立者（員工ID）';

COMMENT ON TABLE public.customer_group_members IS '客戶群組成員';
COMMENT ON COLUMN public.customer_group_members.role IS '成員角色：leader=負責人, member=成員';

COMMIT;
