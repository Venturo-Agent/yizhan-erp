-- RLS 真修補：合併 multiple_permissive + 修 _service 穿幫
-- Round 6 自主迭代優化
--
-- 目標：advisor 通過 + 真正關上 anon 訪問
--
-- 改動範圍：
--   - DROP *_service 系列（service_role 自帶 BYPASSRLS、不需要 policy）
--   - 合併 cmd-specific policy 到單條（advisor multiple_permissive 通過）
--   - 拿掉 OR true（修 *_service 穿幫）
--   - TO public → TO authenticated（anon 不該訪問這些業務表）
--   - auth.uid() → (SELECT auth.uid())（順便繼承 initplan 優化）
--
-- ⚠️ 動 RLS、apply 前必跑 tests/e2e/login-api.spec.ts
-- ⚠️ 此 migration 改 RLS 行為、若 prod 有 anon 在用會被擋
--    src/ grep 確認結果：
--      cis_clients/cis_pricing_items/cis_visits → 用 createEntityHook + browser client（authenticated cookie session、(main) 路由）
--      clock_records/missed_clock_requests/overtime_requests → 全 admin client（service_role、BYPASSRLS、不受影響）
--      leave_balances/leave_requests/leave_types/payroll_runs/payslips → 全 admin client
--      knowledge_base → 全 admin client（/api/line/knowledge）
--      tour_meal_settings → tour_dependency.service.ts 用 browser client（(main) 路由 authenticated）
--      workspace_attendance_settings → /hr/settings/page.tsx 用 browser client + admin client（兩種都 OK）
--    結論：所有 anon 訪問點都已在 authenticated session、TO public → TO authenticated 不影響業務
--
-- 取代並廢棄：20260503700000_merge_multiple_permissive_policies.sql
--   ↑ Round 3 草稿保留 `OR true`、advisor 通過但 SECURITY 沒解。本檔取代之。

BEGIN;

-- ============================================================================
-- cis_clients：drop _service + 合併 cmd-specific（每 cmd 已只有一條、TO public→authenticated）
-- ============================================================================
DROP POLICY IF EXISTS "cis_clients_service" ON public.cis_clients;
DROP POLICY IF EXISTS "cis_clients_select" ON public.cis_clients;
DROP POLICY IF EXISTS "cis_clients_insert" ON public.cis_clients;
DROP POLICY IF EXISTS "cis_clients_update" ON public.cis_clients;
DROP POLICY IF EXISTS "cis_clients_delete" ON public.cis_clients;

CREATE POLICY "cis_clients_select" ON public.cis_clients
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.employees WHERE user_id = (SELECT auth.uid())));

CREATE POLICY "cis_clients_insert" ON public.cis_clients
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.employees WHERE user_id = (SELECT auth.uid())));

CREATE POLICY "cis_clients_update" ON public.cis_clients
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.employees WHERE user_id = (SELECT auth.uid())))
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.employees WHERE user_id = (SELECT auth.uid())));

CREATE POLICY "cis_clients_delete" ON public.cis_clients
  AS PERMISSIVE FOR DELETE TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.employees WHERE user_id = (SELECT auth.uid())));

-- ============================================================================
-- cis_pricing_items
-- ============================================================================
DROP POLICY IF EXISTS "cis_pricing_items_service" ON public.cis_pricing_items;
DROP POLICY IF EXISTS "cis_pricing_items_select" ON public.cis_pricing_items;
DROP POLICY IF EXISTS "cis_pricing_items_insert" ON public.cis_pricing_items;
DROP POLICY IF EXISTS "cis_pricing_items_update" ON public.cis_pricing_items;
DROP POLICY IF EXISTS "cis_pricing_items_delete" ON public.cis_pricing_items;

CREATE POLICY "cis_pricing_items_select" ON public.cis_pricing_items
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.employees WHERE user_id = (SELECT auth.uid())));

CREATE POLICY "cis_pricing_items_insert" ON public.cis_pricing_items
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.employees WHERE user_id = (SELECT auth.uid())));

CREATE POLICY "cis_pricing_items_update" ON public.cis_pricing_items
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.employees WHERE user_id = (SELECT auth.uid())))
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.employees WHERE user_id = (SELECT auth.uid())));

CREATE POLICY "cis_pricing_items_delete" ON public.cis_pricing_items
  AS PERMISSIVE FOR DELETE TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.employees WHERE user_id = (SELECT auth.uid())));

-- ============================================================================
-- cis_visits
-- ============================================================================
DROP POLICY IF EXISTS "cis_visits_service" ON public.cis_visits;
DROP POLICY IF EXISTS "cis_visits_select" ON public.cis_visits;
DROP POLICY IF EXISTS "cis_visits_insert" ON public.cis_visits;
DROP POLICY IF EXISTS "cis_visits_update" ON public.cis_visits;
DROP POLICY IF EXISTS "cis_visits_delete" ON public.cis_visits;

CREATE POLICY "cis_visits_select" ON public.cis_visits
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.employees WHERE user_id = (SELECT auth.uid())));

CREATE POLICY "cis_visits_insert" ON public.cis_visits
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.employees WHERE user_id = (SELECT auth.uid())));

CREATE POLICY "cis_visits_update" ON public.cis_visits
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.employees WHERE user_id = (SELECT auth.uid())))
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.employees WHERE user_id = (SELECT auth.uid())));

CREATE POLICY "cis_visits_delete" ON public.cis_visits
  AS PERMISSIVE FOR DELETE TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.employees WHERE user_id = (SELECT auth.uid())));

-- ============================================================================
-- clock_records：DB 現況有 select/insert/update + _service（沒 delete cmd-specific）
--   _service 砍了之後 DELETE 由 admin 端走（src 都用 admin client）、不開 authenticated DELETE policy
-- ============================================================================
DROP POLICY IF EXISTS "clock_records_service" ON public.clock_records;
DROP POLICY IF EXISTS "clock_records_select" ON public.clock_records;
DROP POLICY IF EXISTS "clock_records_insert" ON public.clock_records;
DROP POLICY IF EXISTS "clock_records_update" ON public.clock_records;

CREATE POLICY "clock_records_select" ON public.clock_records
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.employees WHERE user_id = (SELECT auth.uid())));

CREATE POLICY "clock_records_insert" ON public.clock_records
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.employees WHERE user_id = (SELECT auth.uid())));

CREATE POLICY "clock_records_update" ON public.clock_records
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.employees WHERE user_id = (SELECT auth.uid())))
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.employees WHERE user_id = (SELECT auth.uid())));

-- ============================================================================
-- missed_clock_requests
-- ============================================================================
DROP POLICY IF EXISTS "missed_clock_service" ON public.missed_clock_requests;
DROP POLICY IF EXISTS "missed_clock_select" ON public.missed_clock_requests;
DROP POLICY IF EXISTS "missed_clock_insert" ON public.missed_clock_requests;
DROP POLICY IF EXISTS "missed_clock_update" ON public.missed_clock_requests;

CREATE POLICY "missed_clock_select" ON public.missed_clock_requests
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.employees WHERE user_id = (SELECT auth.uid())));

CREATE POLICY "missed_clock_insert" ON public.missed_clock_requests
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.employees WHERE user_id = (SELECT auth.uid())));

CREATE POLICY "missed_clock_update" ON public.missed_clock_requests
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.employees WHERE user_id = (SELECT auth.uid())))
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.employees WHERE user_id = (SELECT auth.uid())));

-- ============================================================================
-- overtime_requests
-- ============================================================================
DROP POLICY IF EXISTS "overtime_service" ON public.overtime_requests;
DROP POLICY IF EXISTS "overtime_select" ON public.overtime_requests;
DROP POLICY IF EXISTS "overtime_insert" ON public.overtime_requests;
DROP POLICY IF EXISTS "overtime_update" ON public.overtime_requests;

CREATE POLICY "overtime_select" ON public.overtime_requests
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.employees WHERE user_id = (SELECT auth.uid())));

CREATE POLICY "overtime_insert" ON public.overtime_requests
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.employees WHERE user_id = (SELECT auth.uid())));

CREATE POLICY "overtime_update" ON public.overtime_requests
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.employees WHERE user_id = (SELECT auth.uid())))
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.employees WHERE user_id = (SELECT auth.uid())));

-- ============================================================================
-- leave_balances：DB 現況只有 select cmd-specific + _service（讀靠 cmd-specific、寫全靠 _service）
--   砍 _service 後寫操作只能由 admin client 走（src 確認都用 admin、OK）
-- ============================================================================
DROP POLICY IF EXISTS "leave_balances_service" ON public.leave_balances;
DROP POLICY IF EXISTS "leave_balances_select" ON public.leave_balances;

CREATE POLICY "leave_balances_select" ON public.leave_balances
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.employees WHERE user_id = (SELECT auth.uid())));

-- ============================================================================
-- leave_requests
-- ============================================================================
DROP POLICY IF EXISTS "leave_requests_service" ON public.leave_requests;
DROP POLICY IF EXISTS "leave_requests_select" ON public.leave_requests;
DROP POLICY IF EXISTS "leave_requests_insert" ON public.leave_requests;
DROP POLICY IF EXISTS "leave_requests_update" ON public.leave_requests;

CREATE POLICY "leave_requests_select" ON public.leave_requests
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.employees WHERE user_id = (SELECT auth.uid())));

CREATE POLICY "leave_requests_insert" ON public.leave_requests
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.employees WHERE user_id = (SELECT auth.uid())));

CREATE POLICY "leave_requests_update" ON public.leave_requests
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.employees WHERE user_id = (SELECT auth.uid())))
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.employees WHERE user_id = (SELECT auth.uid())));

-- ============================================================================
-- leave_types：只有 select cmd-specific + _service
-- ============================================================================
DROP POLICY IF EXISTS "leave_types_service" ON public.leave_types;
DROP POLICY IF EXISTS "leave_types_select" ON public.leave_types;

CREATE POLICY "leave_types_select" ON public.leave_types
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.employees WHERE user_id = (SELECT auth.uid())));

-- ============================================================================
-- payroll_runs：只有 select cmd-specific + _service
-- ============================================================================
DROP POLICY IF EXISTS "payroll_runs_service" ON public.payroll_runs;
DROP POLICY IF EXISTS "payroll_runs_select" ON public.payroll_runs;

CREATE POLICY "payroll_runs_select" ON public.payroll_runs
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.employees WHERE user_id = (SELECT auth.uid())));

-- ============================================================================
-- payslips：只有 select cmd-specific + _service
-- ============================================================================
DROP POLICY IF EXISTS "payslips_service" ON public.payslips;
DROP POLICY IF EXISTS "payslips_select" ON public.payslips;

CREATE POLICY "payslips_select" ON public.payslips
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.employees WHERE user_id = (SELECT auth.uid())));

-- ============================================================================
-- knowledge_base：沒 _service、是中文名 4 條 policy（用 profiles 走 workspace 過濾）
--   無 multiple_permissive、純改 TO public→authenticated + 統一改名
-- ============================================================================
DROP POLICY IF EXISTS "Users can view knowledge base in their workspace" ON public.knowledge_base;
DROP POLICY IF EXISTS "Users can insert knowledge base in their workspace" ON public.knowledge_base;
DROP POLICY IF EXISTS "Users can update knowledge base in their workspace" ON public.knowledge_base;
DROP POLICY IF EXISTS "Users can delete knowledge base in their workspace" ON public.knowledge_base;

CREATE POLICY "knowledge_base_select" ON public.knowledge_base
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    (workspace_id IN (SELECT workspace_id FROM public.profiles WHERE id = (SELECT auth.uid())))
    OR (workspace_id IS NULL)
  );

CREATE POLICY "knowledge_base_insert" ON public.knowledge_base
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.profiles WHERE id = (SELECT auth.uid())));

CREATE POLICY "knowledge_base_update" ON public.knowledge_base
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.profiles WHERE id = (SELECT auth.uid())))
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.profiles WHERE id = (SELECT auth.uid())));

CREATE POLICY "knowledge_base_delete" ON public.knowledge_base
  AS PERMISSIVE FOR DELETE TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.profiles WHERE id = (SELECT auth.uid())));

-- ============================================================================
-- tour_meal_settings：兩組 policy（中文名 + 短名）兩兩重複、merged 到單條
--   一組用 profiles、一組用 get_current_user_workspace()、INSERT 多 is_super_admin
--   合併原則：OR 兩 qual、保留 super_admin bypass
-- ============================================================================
DROP POLICY IF EXISTS "Users can view meal settings in their workspace" ON public.tour_meal_settings;
DROP POLICY IF EXISTS "Users can insert meal settings in their workspace" ON public.tour_meal_settings;
DROP POLICY IF EXISTS "Users can update meal settings in their workspace" ON public.tour_meal_settings;
DROP POLICY IF EXISTS "Users can delete meal settings in their workspace" ON public.tour_meal_settings;
DROP POLICY IF EXISTS "tour_meal_settings_select" ON public.tour_meal_settings;
DROP POLICY IF EXISTS "tour_meal_settings_insert" ON public.tour_meal_settings;
DROP POLICY IF EXISTS "tour_meal_settings_update" ON public.tour_meal_settings;
DROP POLICY IF EXISTS "tour_meal_settings_delete" ON public.tour_meal_settings;

CREATE POLICY "tour_meal_settings_select" ON public.tour_meal_settings
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    (workspace_id IN (SELECT workspace_id FROM public.profiles WHERE id = (SELECT auth.uid())))
    OR ((workspace_id)::text = (get_current_user_workspace())::text)
  );

CREATE POLICY "tour_meal_settings_insert" ON public.tour_meal_settings
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (
    (workspace_id IN (SELECT workspace_id FROM public.profiles WHERE id = (SELECT auth.uid())))
    OR is_super_admin()
    OR ((workspace_id)::text = (get_current_user_workspace())::text)
  );

CREATE POLICY "tour_meal_settings_update" ON public.tour_meal_settings
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (
    (workspace_id IN (SELECT workspace_id FROM public.profiles WHERE id = (SELECT auth.uid())))
    OR ((workspace_id)::text = (get_current_user_workspace())::text)
  )
  WITH CHECK (
    (workspace_id IN (SELECT workspace_id FROM public.profiles WHERE id = (SELECT auth.uid())))
    OR ((workspace_id)::text = (get_current_user_workspace())::text)
  );

CREATE POLICY "tour_meal_settings_delete" ON public.tour_meal_settings
  AS PERMISSIVE FOR DELETE TO authenticated
  USING (
    (workspace_id IN (SELECT workspace_id FROM public.profiles WHERE id = (SELECT auth.uid())))
    OR ((workspace_id)::text = (get_current_user_workspace())::text)
  );

-- ============================================================================
-- workspace_attendance_settings：FOR ALL + FOR SELECT（同 qual 重複）
--   合併到 4 條 cmd-specific
-- ============================================================================
DROP POLICY IF EXISTS "workspace_attendance_settings_all" ON public.workspace_attendance_settings;
DROP POLICY IF EXISTS "workspace_attendance_settings_select" ON public.workspace_attendance_settings;

CREATE POLICY "workspace_attendance_settings_select" ON public.workspace_attendance_settings
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.employees WHERE id = (SELECT auth.uid())));

CREATE POLICY "workspace_attendance_settings_insert" ON public.workspace_attendance_settings
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.employees WHERE id = (SELECT auth.uid())));

CREATE POLICY "workspace_attendance_settings_update" ON public.workspace_attendance_settings
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.employees WHERE id = (SELECT auth.uid())))
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.employees WHERE id = (SELECT auth.uid())));

CREATE POLICY "workspace_attendance_settings_delete" ON public.workspace_attendance_settings
  AS PERMISSIVE FOR DELETE TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.employees WHERE id = (SELECT auth.uid())));

-- ============================================================================
-- role_capabilities：rc_hr_write (FOR ALL, has_capability) + rc_member_read (FOR SELECT, membership)
--   現況已 TO authenticated。SELECT 兩條 → merge OR；其他 cmd 維持 has_capability
-- ============================================================================
DROP POLICY IF EXISTS "rc_hr_write" ON public.role_capabilities;
DROP POLICY IF EXISTS "rc_member_read" ON public.role_capabilities;

CREATE POLICY "rc_select" ON public.role_capabilities
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    has_capability_for_workspace(
      (SELECT workspace_id FROM public.workspace_roles WHERE id = role_capabilities.role_id),
      'hr.roles.write'::text
    )
    OR (role_id IN (
      SELECT wr.id FROM public.workspace_roles wr
      WHERE wr.workspace_id IN (
        SELECT e.workspace_id FROM public.employees e WHERE e.user_id = (SELECT auth.uid())
      )
    ))
  );

CREATE POLICY "rc_insert" ON public.role_capabilities
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (
    has_capability_for_workspace(
      (SELECT workspace_id FROM public.workspace_roles WHERE id = role_capabilities.role_id),
      'hr.roles.write'::text
    )
  );

CREATE POLICY "rc_update" ON public.role_capabilities
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (
    has_capability_for_workspace(
      (SELECT workspace_id FROM public.workspace_roles WHERE id = role_capabilities.role_id),
      'hr.roles.write'::text
    )
  )
  WITH CHECK (
    has_capability_for_workspace(
      (SELECT workspace_id FROM public.workspace_roles WHERE id = role_capabilities.role_id),
      'hr.roles.write'::text
    )
  );

CREATE POLICY "rc_delete" ON public.role_capabilities
  AS PERMISSIVE FOR DELETE TO authenticated
  USING (
    has_capability_for_workspace(
      (SELECT workspace_id FROM public.workspace_roles WHERE id = role_capabilities.role_id),
      'hr.roles.write'::text
    )
  );

COMMIT;

-- ============================================================================
-- 驗收 SQL（手動跑、不在 transaction 內）
-- ============================================================================
-- 1) 確認本檔涉及的表沒有 multiple_permissive 重複
-- WITH expanded AS (
--   SELECT tablename, policyname, roles,
--     unnest(CASE WHEN cmd='ALL' THEN ARRAY['SELECT','INSERT','UPDATE','DELETE'] ELSE ARRAY[cmd] END) eff
--   FROM pg_policies WHERE schemaname='public'
--     AND tablename IN ('cis_clients','cis_pricing_items','cis_visits','clock_records',
--       'missed_clock_requests','overtime_requests','leave_balances','leave_requests',
--       'leave_types','payroll_runs','payslips','knowledge_base','tour_meal_settings',
--       'workspace_attendance_settings','role_capabilities')
-- )
-- SELECT tablename, eff, roles, count(*)
-- FROM expanded
-- GROUP BY 1,2,3
-- HAVING count(*) > 1;
-- → 預期 0 行
--
-- 2) 確認沒有 *_service policy 殘留
-- SELECT tablename, policyname FROM pg_policies
-- WHERE schemaname='public' AND policyname LIKE '%_service';
-- → 預期 0 行
--
-- 3) 確認沒有 TO public 在這批表上殘留
-- SELECT tablename, policyname, roles FROM pg_policies
-- WHERE schemaname='public' AND 'public' = ANY(roles)
--   AND tablename IN ('cis_clients','cis_pricing_items','cis_visits','clock_records',
--     'missed_clock_requests','overtime_requests','leave_balances','leave_requests',
--     'leave_types','payroll_runs','payslips','knowledge_base','tour_meal_settings',
--     'workspace_attendance_settings','role_capabilities');
-- → 預期 0 行
