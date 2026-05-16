-- ===========================================
-- Phase 2 Patch: 對齊「沒有特權」鐵律（William 2026-05-10 拍板）
-- ===========================================
-- 砍 is_super_admin() function + 14 處 RLS 引用
-- 砍 workspaces.type 欄位（platform_owner / agency 之分）
-- 砍 platform.* capability rows、加 workspaces.read / workspaces.write
-- 改 workspaces SELECT/UPDATE 改吃 tenants feature 而不是 super_admin
-- ===========================================

BEGIN;

-- ============ 1. 改寫 check_tour_member_modify_lock trigger 砍 super_admin 救援 ============
CREATE OR REPLACE FUNCTION public.check_tour_member_modify_lock() RETURNS trigger
  LANGUAGE plpgsql SECURITY DEFINER
  AS $$
DECLARE
  v_tour_status text;
  v_caller_role_name text;
  v_target_order_id text;
BEGIN
  v_target_order_id := COALESCE(NEW.order_id, OLD.order_id);

  SELECT t.status INTO v_tour_status
  FROM public.tours t
  JOIN public.orders o ON o.tour_id = t.id::text
  WHERE o.id::text = v_target_order_id;

  IF v_tour_status IS DISTINCT FROM 'ongoing' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- 鐵律：沒有 super_admin 救援、ongoing 團只允許領隊改團員
  SELECT wr.name INTO v_caller_role_name
  FROM public.employees e
  JOIN public.workspace_roles wr ON wr.id = e.role_id
  WHERE e.user_id = auth.uid()
  LIMIT 1;

  IF v_caller_role_name IS DISTINCT FROM '領隊' THEN
    RAISE EXCEPTION '出團當天 (tour status=ongoing) 只有領隊能修改團員資料、當前職務: %',
      COALESCE(v_caller_role_name, '無');
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ============ 2. 改寫 14 處 RLS policy（砍 OR is_super_admin()）============

-- driver_tasks
DROP POLICY IF EXISTS driver_tasks_delete ON public.driver_tasks;
CREATE POLICY driver_tasks_delete ON public.driver_tasks FOR DELETE
  USING ((workspace_id)::text = (public.get_current_user_workspace())::text);

DROP POLICY IF EXISTS driver_tasks_insert ON public.driver_tasks;
CREATE POLICY driver_tasks_insert ON public.driver_tasks FOR INSERT
  WITH CHECK ((workspace_id)::text = (public.get_current_user_workspace())::text);

DROP POLICY IF EXISTS driver_tasks_select ON public.driver_tasks;
CREATE POLICY driver_tasks_select ON public.driver_tasks FOR SELECT
  USING ((workspace_id)::text = (public.get_current_user_workspace())::text);

DROP POLICY IF EXISTS driver_tasks_update ON public.driver_tasks;
CREATE POLICY driver_tasks_update ON public.driver_tasks FOR UPDATE
  USING ((workspace_id)::text = (public.get_current_user_workspace())::text);

-- employees
DROP POLICY IF EXISTS employees_insert ON public.employees;
CREATE POLICY employees_insert ON public.employees FOR INSERT
  WITH CHECK ((workspace_id)::text = (public.get_current_user_workspace())::text);

-- suppliers
DROP POLICY IF EXISTS suppliers_delete ON public.suppliers;
CREATE POLICY suppliers_delete ON public.suppliers FOR DELETE
  USING (workspace_id = public.get_current_user_workspace());

DROP POLICY IF EXISTS suppliers_select ON public.suppliers;
CREATE POLICY suppliers_select ON public.suppliers FOR SELECT
  USING (workspace_id = public.get_current_user_workspace());

DROP POLICY IF EXISTS suppliers_update ON public.suppliers;
CREATE POLICY suppliers_update ON public.suppliers FOR UPDATE
  USING (workspace_id = public.get_current_user_workspace());

-- workspace_features
DROP POLICY IF EXISTS workspace_features_insert ON public.workspace_features;
CREATE POLICY workspace_features_insert ON public.workspace_features FOR INSERT
  WITH CHECK ((workspace_id)::text = (public.get_current_user_workspace())::text);

-- workspace_roles
DROP POLICY IF EXISTS workspace_roles_insert ON public.workspace_roles;
CREATE POLICY workspace_roles_insert ON public.workspace_roles FOR INSERT
  WITH CHECK ((workspace_id)::text = (public.get_current_user_workspace())::text);

-- workspaces (跨 workspace 操作改吃 tenants feature)
DROP POLICY IF EXISTS workspaces_insert ON public.workspaces;
CREATE POLICY workspaces_insert ON public.workspaces FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspace_features wf
      WHERE wf.workspace_id = public.get_current_user_workspace()
        AND wf.feature_code = 'tenants'
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
        AND wf.feature_code = 'tenants'
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
        AND wf.feature_code = 'tenants'
        AND wf.enabled = true
    )
  );

-- ============ 3. 砍 is_super_admin function ============
DROP FUNCTION IF EXISTS public.is_super_admin();

-- ============ 4. 砍 workspaces.type 欄位 ============
ALTER TABLE public.workspaces DROP COLUMN IF EXISTS type;

-- ============ 5. 砍 platform.* capability rows、加 workspaces.read/write ============
DELETE FROM public.role_capabilities WHERE capability_code LIKE 'platform.%';

-- 給漫途的「系統主管」role 加 workspaces.read / workspaces.write capability
-- 對齊 src/lib/permissions/capabilities.ts 新加的 WORKSPACES_READ / WORKSPACES_WRITE
INSERT INTO public.role_capabilities (role_id, capability_code, enabled)
VALUES
  ('7829922c-dcdf-4d31-871a-d8780b8cfc52', 'workspaces.read', true),
  ('7829922c-dcdf-4d31-871a-d8780b8cfc52', 'workspaces.write', true)
ON CONFLICT (role_id, capability_code) DO UPDATE SET enabled = true;

COMMIT;
