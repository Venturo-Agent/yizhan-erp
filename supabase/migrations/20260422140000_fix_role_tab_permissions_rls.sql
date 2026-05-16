-- =========================================================================
-- P010 FIX: role_tab_permissions RLS tenant isolation
--
-- 問題：4 條 policy 全部 USING/WITH CHECK = true，等於沒有租戶隔離。
-- 目標：聯查 workspace_roles，確保 CRUD 只能碰自家 workspace 的 role。
-- 參考：workspace_roles 自己的 RLS（workspace_id = get_current_user_workspace()）
--       employee_route_overrides 的 service_role_manage policy 樣板
--
-- 對應 pattern-map 的 P010（🔴 上線前必改）
-- 幕僚會議：docs/PATTERN_HEAL_REPORT_2026-04-22/P010/
-- =========================================================================

BEGIN;

-- -----------------------------------------------------------------------
-- STEP 0: 預檢 — 有髒資料就中止、避免合法 UPDATE/INSERT 被新 policy 擋
-- -----------------------------------------------------------------------
DO $$
DECLARE
  v_null_ws_roles int;
  v_orphan_rtp int;
BEGIN
  SELECT count(*) INTO v_null_ws_roles
  FROM public.workspace_roles
  WHERE workspace_id IS NULL;

  SELECT count(*) INTO v_orphan_rtp
  FROM public.role_tab_permissions rtp
  LEFT JOIN public.workspace_roles wr ON wr.id = rtp.role_id
  WHERE wr.id IS NULL;

  IF v_null_ws_roles > 0 THEN
    RAISE EXCEPTION 'Abort: % workspace_roles rows have NULL workspace_id', v_null_ws_roles;
  END IF;

  IF v_orphan_rtp > 0 THEN
    RAISE EXCEPTION 'Abort: % orphan role_tab_permissions rows (role_id not in workspace_roles)', v_orphan_rtp;
  END IF;
END $$;

-- -----------------------------------------------------------------------
-- STEP 1: DROP 舊 4 policy
-- -----------------------------------------------------------------------
DROP POLICY IF EXISTS role_tab_permissions_select ON public.role_tab_permissions;
DROP POLICY IF EXISTS role_tab_permissions_insert ON public.role_tab_permissions;
DROP POLICY IF EXISTS role_tab_permissions_update ON public.role_tab_permissions;
DROP POLICY IF EXISTS role_tab_permissions_delete ON public.role_tab_permissions;

-- 兼容：新 policy 若已存在也先清（repeat-safe）
DROP POLICY IF EXISTS role_tab_permissions_service_role ON public.role_tab_permissions;
DROP POLICY IF EXISTS role_tab_permissions_tenant_select ON public.role_tab_permissions;
DROP POLICY IF EXISTS role_tab_permissions_tenant_insert ON public.role_tab_permissions;
DROP POLICY IF EXISTS role_tab_permissions_tenant_update ON public.role_tab_permissions;
DROP POLICY IF EXISTS role_tab_permissions_tenant_delete ON public.role_tab_permissions;

-- -----------------------------------------------------------------------
-- STEP 2: 確保 RLS 開、FORCE 關（service_role 要能繞）
-- -----------------------------------------------------------------------
ALTER TABLE public.role_tab_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_tab_permissions NO FORCE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------
-- STEP 3: 新 5 policy（service_role + CRUD 各 1）
-- -----------------------------------------------------------------------

-- 3.1 service_role 管道（後端 admin client 用；樣板來自 employee_route_overrides）
CREATE POLICY role_tab_permissions_service_role ON public.role_tab_permissions
  FOR ALL
  USING (auth.role() = 'service_role'::text)
  WITH CHECK (auth.role() = 'service_role'::text);

COMMENT ON POLICY role_tab_permissions_service_role ON public.role_tab_permissions IS
  'Service role (backend admin client) can do anything. Mirrors employee_route_overrides.service_role_manage.';

-- 3.2 SELECT：只看自家 workspace 的 role 的 permission
CREATE POLICY role_tab_permissions_tenant_select ON public.role_tab_permissions
  FOR SELECT
  USING (
    role_id IN (
      SELECT id FROM public.workspace_roles
      WHERE workspace_id = public.get_current_user_workspace()
    )
  );

COMMENT ON POLICY role_tab_permissions_tenant_select ON public.role_tab_permissions IS
  'P010 fix: tenant isolation via workspace_roles join. Only sees perms of roles in same workspace.';

-- 3.3 INSERT：只能塞到自家 workspace 的 role（WITH CHECK only，無 USING）
CREATE POLICY role_tab_permissions_tenant_insert ON public.role_tab_permissions
  FOR INSERT
  WITH CHECK (
    role_id IN (
      SELECT id FROM public.workspace_roles
      WHERE workspace_id = public.get_current_user_workspace()
    )
  );

COMMENT ON POLICY role_tab_permissions_tenant_insert ON public.role_tab_permissions IS
  'P010 fix: INSERT only allowed when target role belongs to current user workspace.';

-- 3.4 UPDATE：USING 擋讀取 + WITH CHECK 擋改寫後的狀態
--     沒寫 WITH CHECK 會被人把 role_id UPDATE 到別家 workspace 的 role，繞過隔離
CREATE POLICY role_tab_permissions_tenant_update ON public.role_tab_permissions
  FOR UPDATE
  USING (
    role_id IN (
      SELECT id FROM public.workspace_roles
      WHERE workspace_id = public.get_current_user_workspace()
    )
  )
  WITH CHECK (
    role_id IN (
      SELECT id FROM public.workspace_roles
      WHERE workspace_id = public.get_current_user_workspace()
    )
  );

COMMENT ON POLICY role_tab_permissions_tenant_update ON public.role_tab_permissions IS
  'P010 fix: UPDATE requires BOTH USING (read row) AND WITH CHECK (post-update row) in same workspace, so role_id cannot be moved across tenants.';

-- 3.5 DELETE：只能刪自家 workspace 的 role 的 permission
CREATE POLICY role_tab_permissions_tenant_delete ON public.role_tab_permissions
  FOR DELETE
  USING (
    role_id IN (
      SELECT id FROM public.workspace_roles
      WHERE workspace_id = public.get_current_user_workspace()
    )
  );

COMMENT ON POLICY role_tab_permissions_tenant_delete ON public.role_tab_permissions IS
  'P010 fix: DELETE only allowed when target role belongs to current user workspace.';

COMMIT;
