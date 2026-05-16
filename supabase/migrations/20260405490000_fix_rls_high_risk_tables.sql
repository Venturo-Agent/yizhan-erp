-- ============================================
-- 修復 5 張高風險表格的 RLS 政策
-- 問題：使用 USING(true) 或缺乏 workspace 隔離
-- 日期：2026-04-05
-- ============================================


-- 1. tour_requests（跳過：表不存在）
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='tour_requests' AND table_schema='public') THEN
    RAISE NOTICE 'tour_requests not found, skipping';
    RETURN;
  END IF;
  ALTER TABLE public.tour_requests ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.tour_requests FORCE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "tour_requests_select" ON public.tour_requests;
  DROP POLICY IF EXISTS "tour_requests_insert" ON public.tour_requests;
  DROP POLICY IF EXISTS "tour_requests_update" ON public.tour_requests;
  DROP POLICY IF EXISTS "tour_requests_delete" ON public.tour_requests;
  DROP POLICY IF EXISTS "tour_requests_all" ON public.tour_requests;
  CREATE POLICY "tour_requests_select" ON public.tour_requests FOR SELECT USING (workspace_id = get_current_user_workspace() OR is_super_admin());
  CREATE POLICY "tour_requests_insert" ON public.tour_requests FOR INSERT WITH CHECK (workspace_id = get_current_user_workspace());
  CREATE POLICY "tour_requests_update" ON public.tour_requests FOR UPDATE USING (workspace_id = get_current_user_workspace() OR is_super_admin());
  CREATE POLICY "tour_requests_delete" ON public.tour_requests FOR DELETE USING (workspace_id = get_current_user_workspace() OR is_super_admin());
END $$;

-- ============================================
-- 2. payment_request_items — 無 workspace_id，透過 payment_requests 子查詢隔離
--    FK: request_id (TEXT) → payment_requests.id
-- ============================================

ALTER TABLE public.payment_request_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_request_items FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payment_request_items_select" ON public.payment_request_items;
DROP POLICY IF EXISTS "payment_request_items_insert" ON public.payment_request_items;
DROP POLICY IF EXISTS "payment_request_items_update" ON public.payment_request_items;
DROP POLICY IF EXISTS "payment_request_items_delete" ON public.payment_request_items;
DROP POLICY IF EXISTS "payment_request_items_all" ON public.payment_request_items;

CREATE POLICY "payment_request_items_select" ON public.payment_request_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.payment_requests
      WHERE payment_requests.id = payment_request_items.request_id
        AND payment_requests.workspace_id = get_current_user_workspace()
    ) OR is_super_admin()
  );

CREATE POLICY "payment_request_items_insert" ON public.payment_request_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.payment_requests
      WHERE payment_requests.id = payment_request_items.request_id
        AND payment_requests.workspace_id = get_current_user_workspace()
    )
  );

CREATE POLICY "payment_request_items_update" ON public.payment_request_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.payment_requests
      WHERE payment_requests.id = payment_request_items.request_id
        AND payment_requests.workspace_id = get_current_user_workspace()
    ) OR is_super_admin()
  );

CREATE POLICY "payment_request_items_delete" ON public.payment_request_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.payment_requests
      WHERE payment_requests.id = payment_request_items.request_id
        AND payment_requests.workspace_id = get_current_user_workspace()
    ) OR is_super_admin()
  );

-- ============================================
-- 3. employee_job_roles — 無 workspace_id，透過 employees 子查詢隔離
--    FK: employee_id (UUID) → employees.id
-- ============================================

ALTER TABLE public.employee_job_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_job_roles FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "employee_job_roles_select" ON public.employee_job_roles;
DROP POLICY IF EXISTS "employee_job_roles_insert" ON public.employee_job_roles;
DROP POLICY IF EXISTS "employee_job_roles_update" ON public.employee_job_roles;
DROP POLICY IF EXISTS "employee_job_roles_delete" ON public.employee_job_roles;
DROP POLICY IF EXISTS "employee_job_roles_all" ON public.employee_job_roles;

CREATE POLICY "employee_job_roles_select" ON public.employee_job_roles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.employees
      WHERE employees.id = employee_job_roles.employee_id
        AND employees.workspace_id = get_current_user_workspace()
    ) OR is_super_admin()
  );

CREATE POLICY "employee_job_roles_insert" ON public.employee_job_roles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.employees
      WHERE employees.id = employee_job_roles.employee_id
        AND employees.workspace_id = get_current_user_workspace()
    )
  );

CREATE POLICY "employee_job_roles_update" ON public.employee_job_roles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.employees
      WHERE employees.id = employee_job_roles.employee_id
        AND employees.workspace_id = get_current_user_workspace()
    ) OR is_super_admin()
  );

CREATE POLICY "employee_job_roles_delete" ON public.employee_job_roles FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.employees
      WHERE employees.id = employee_job_roles.employee_id
        AND employees.workspace_id = get_current_user_workspace()
    ) OR is_super_admin()
  );

-- ============================================
-- 4. tour_role_assignments — 無 workspace_id，透過 tours 子查詢隔離
--    FK: tour_id (TEXT) → tours.id
-- ============================================

ALTER TABLE public.tour_role_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tour_role_assignments FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tour_role_assignments_select" ON public.tour_role_assignments;
DROP POLICY IF EXISTS "tour_role_assignments_insert" ON public.tour_role_assignments;
DROP POLICY IF EXISTS "tour_role_assignments_update" ON public.tour_role_assignments;
DROP POLICY IF EXISTS "tour_role_assignments_delete" ON public.tour_role_assignments;
DROP POLICY IF EXISTS "tour_role_assignments_all" ON public.tour_role_assignments;

CREATE POLICY "tour_role_assignments_select" ON public.tour_role_assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tours
      WHERE tours.id = tour_role_assignments.tour_id
        AND tours.workspace_id = get_current_user_workspace()
    ) OR is_super_admin()
  );

CREATE POLICY "tour_role_assignments_insert" ON public.tour_role_assignments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tours
      WHERE tours.id = tour_role_assignments.tour_id
        AND tours.workspace_id = get_current_user_workspace()
    )
  );

CREATE POLICY "tour_role_assignments_update" ON public.tour_role_assignments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.tours
      WHERE tours.id = tour_role_assignments.tour_id
        AND tours.workspace_id = get_current_user_workspace()
    ) OR is_super_admin()
  );

CREATE POLICY "tour_role_assignments_delete" ON public.tour_role_assignments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.tours
      WHERE tours.id = tour_role_assignments.tour_id
        AND tours.workspace_id = get_current_user_workspace()
    ) OR is_super_admin()
  );

-- ============================================
-- 5. channel_members — 無 workspace_id，透過 channels 子查詢隔離
--    FK: channel_id → channels.id
-- ============================================

ALTER TABLE public.channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_members FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "channel_members_select" ON public.channel_members;
DROP POLICY IF EXISTS "channel_members_insert" ON public.channel_members;
DROP POLICY IF EXISTS "channel_members_update" ON public.channel_members;
DROP POLICY IF EXISTS "channel_members_delete" ON public.channel_members;
DROP POLICY IF EXISTS "channel_members_all" ON public.channel_members;

CREATE POLICY "channel_members_select" ON public.channel_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.channels
      WHERE channels.id = channel_members.channel_id
        AND channels.workspace_id = get_current_user_workspace()
    ) OR is_super_admin()
  );

CREATE POLICY "channel_members_insert" ON public.channel_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.channels
      WHERE channels.id = channel_members.channel_id
        AND channels.workspace_id = get_current_user_workspace()
    )
  );

CREATE POLICY "channel_members_update" ON public.channel_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.channels
      WHERE channels.id = channel_members.channel_id
        AND channels.workspace_id = get_current_user_workspace()
    ) OR is_super_admin()
  );

CREATE POLICY "channel_members_delete" ON public.channel_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.channels
      WHERE channels.id = channel_members.channel_id
        AND channels.workspace_id = get_current_user_workspace()
    ) OR is_super_admin()
  );

