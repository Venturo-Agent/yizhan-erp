-- ===========================================
-- 統一 workspaces 命名（William 2026-05-10 拍板）
-- ===========================================
-- 之前混了 tenants.* / workspaces.* / workspace.* 三組命名、容易踩錯
-- 統一用 workspaces.*（複數、對齊 route /workspaces）、砍其他兩組
-- ===========================================

BEGIN;

-- 1. 砍 capability rows（tenants.* + workspace.* 單數）
DELETE FROM public.role_capabilities
WHERE capability_code IN ('tenants.read', 'tenants.write', 'workspace.read', 'workspace.write');

-- 2. 加 workspaces.* 給漫途系統主管 role
INSERT INTO public.role_capabilities (role_id, capability_code, enabled)
VALUES
  ('7829922c-dcdf-4d31-871a-d8780b8cfc52', 'workspaces.read', true),
  ('7829922c-dcdf-4d31-871a-d8780b8cfc52', 'workspaces.write', true)
ON CONFLICT (role_id, capability_code) DO UPDATE SET enabled = true;

-- 3. workspace_features 砍 'tenants' row、保留 'workspaces' row
DELETE FROM public.workspace_features
WHERE workspace_id = 'b2222222-2222-2222-2222-222222222222'
  AND feature_code = 'tenants';

-- 4. workspaces 表 RLS policy 改吃 feature_code='workspaces'（之前是 'tenants'）
DROP POLICY IF EXISTS workspaces_insert ON public.workspaces;
CREATE POLICY workspaces_insert ON public.workspaces FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspace_features wf
      WHERE wf.workspace_id = public.get_current_user_workspace()
        AND wf.feature_code = 'workspaces'
        AND wf.enabled = true
    )
  );

DROP POLICY IF EXISTS workspaces_select ON public.workspaces;
CREATE POLICY workspaces_select ON public.workspaces FOR SELECT
  USING (
    id = public.get_current_user_workspace()
    OR EXISTS (
      SELECT 1 FROM public.workspace_features wf
      WHERE wf.workspace_id = public.get_current_user_workspace()
        AND wf.feature_code = 'workspaces'
        AND wf.enabled = true
    )
  );

DROP POLICY IF EXISTS workspaces_update ON public.workspaces;
CREATE POLICY workspaces_update ON public.workspaces FOR UPDATE
  USING (
    id = public.get_current_user_workspace()
    OR EXISTS (
      SELECT 1 FROM public.workspace_features wf
      WHERE wf.workspace_id = public.get_current_user_workspace()
        AND wf.feature_code = 'workspaces'
        AND wf.enabled = true
    )
  );

COMMIT;
