-- P018 (2026-04-22): employee_permission_overrides 4 條 USING:true policy 提權漏洞修復
-- 加 workspace_id 欄位 + 重寫 RLS policy 比照 role_tab_permissions tenant scoped 模式
-- 表 0 rows（Corner/JINGYAO/YUFEN/TESTUX 全空）、零資料風險

BEGIN;

-- 1. 加 workspace_id column（NOT NULL safe because table is empty）
ALTER TABLE public.employee_permission_overrides
  ADD COLUMN workspace_id uuid NOT NULL
  REFERENCES public.workspaces(id) ON DELETE CASCADE;

-- 2. Index for FK lookup
CREATE INDEX idx_employee_permission_overrides_workspace_id
  ON public.employee_permission_overrides(workspace_id);

-- 3. Drop 4 old USING:true policies
DROP POLICY IF EXISTS employee_permission_overrides_select ON public.employee_permission_overrides;
DROP POLICY IF EXISTS employee_permission_overrides_insert ON public.employee_permission_overrides;
DROP POLICY IF EXISTS employee_permission_overrides_update ON public.employee_permission_overrides;
DROP POLICY IF EXISTS employee_permission_overrides_delete ON public.employee_permission_overrides;

-- 4. 5 new policies（service_role + 4 tenant scoped、跟 role_tab_permissions 同 pattern）
CREATE POLICY employee_permission_overrides_service_role
  ON public.employee_permission_overrides
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY employee_permission_overrides_tenant_select
  ON public.employee_permission_overrides
  FOR SELECT
  USING (workspace_id = get_current_user_workspace());

CREATE POLICY employee_permission_overrides_tenant_insert
  ON public.employee_permission_overrides
  FOR INSERT
  WITH CHECK (workspace_id = get_current_user_workspace());

CREATE POLICY employee_permission_overrides_tenant_update
  ON public.employee_permission_overrides
  FOR UPDATE
  USING (workspace_id = get_current_user_workspace())
  WITH CHECK (workspace_id = get_current_user_workspace());

CREATE POLICY employee_permission_overrides_tenant_delete
  ON public.employee_permission_overrides
  FOR DELETE
  USING (workspace_id = get_current_user_workspace());

COMMIT;
