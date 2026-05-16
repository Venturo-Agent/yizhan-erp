-- RLS 效能優化：auth.uid() / auth.role() 包成 SELECT 子查詢
-- 修補 Supabase advisor auth_rls_initplan WARN（54 條）
-- 來源：Round 2 自主迭代優化
--
-- ⚠️ 動 RLS、apply 前必跑 tests/e2e/login-api.spec.ts
--
-- 影響：
-- - 純改寫、語意等價（只是 planner 改用 InitPlan、每 row 不再 re-eval）
-- - SELECT 大量資料時效能線性改善
-- - 不影響 anon / authenticated 訪問權

BEGIN;

-- ============================================================================
-- cis_clients (4 policies)
-- ============================================================================
DROP POLICY IF EXISTS "cis_clients_delete" ON public.cis_clients;
CREATE POLICY "cis_clients_delete" ON public.cis_clients
  AS PERMISSIVE
  FOR DELETE
  TO public
  USING (workspace_id IN (
    SELECT employees.workspace_id
    FROM employees
    WHERE employees.user_id = (SELECT auth.uid())
  ));

DROP POLICY IF EXISTS "cis_clients_insert" ON public.cis_clients;
CREATE POLICY "cis_clients_insert" ON public.cis_clients
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK (workspace_id IN (
    SELECT employees.workspace_id
    FROM employees
    WHERE employees.user_id = (SELECT auth.uid())
  ));

DROP POLICY IF EXISTS "cis_clients_select" ON public.cis_clients;
CREATE POLICY "cis_clients_select" ON public.cis_clients
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (workspace_id IN (
    SELECT employees.workspace_id
    FROM employees
    WHERE employees.user_id = (SELECT auth.uid())
  ));

DROP POLICY IF EXISTS "cis_clients_update" ON public.cis_clients;
CREATE POLICY "cis_clients_update" ON public.cis_clients
  AS PERMISSIVE
  FOR UPDATE
  TO public
  USING (workspace_id IN (
    SELECT employees.workspace_id
    FROM employees
    WHERE employees.user_id = (SELECT auth.uid())
  ));

-- ============================================================================
-- cis_pricing_items (4 policies)
-- ============================================================================
DROP POLICY IF EXISTS "cis_pricing_items_delete" ON public.cis_pricing_items;
CREATE POLICY "cis_pricing_items_delete" ON public.cis_pricing_items
  AS PERMISSIVE
  FOR DELETE
  TO public
  USING (workspace_id IN (
    SELECT employees.workspace_id
    FROM employees
    WHERE employees.user_id = (SELECT auth.uid())
  ));

DROP POLICY IF EXISTS "cis_pricing_items_insert" ON public.cis_pricing_items;
CREATE POLICY "cis_pricing_items_insert" ON public.cis_pricing_items
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK (workspace_id IN (
    SELECT employees.workspace_id
    FROM employees
    WHERE employees.user_id = (SELECT auth.uid())
  ));

DROP POLICY IF EXISTS "cis_pricing_items_select" ON public.cis_pricing_items;
CREATE POLICY "cis_pricing_items_select" ON public.cis_pricing_items
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (workspace_id IN (
    SELECT employees.workspace_id
    FROM employees
    WHERE employees.user_id = (SELECT auth.uid())
  ));

DROP POLICY IF EXISTS "cis_pricing_items_update" ON public.cis_pricing_items;
CREATE POLICY "cis_pricing_items_update" ON public.cis_pricing_items
  AS PERMISSIVE
  FOR UPDATE
  TO public
  USING (workspace_id IN (
    SELECT employees.workspace_id
    FROM employees
    WHERE employees.user_id = (SELECT auth.uid())
  ));

-- ============================================================================
-- cis_visits (4 policies)
-- ============================================================================
DROP POLICY IF EXISTS "cis_visits_delete" ON public.cis_visits;
CREATE POLICY "cis_visits_delete" ON public.cis_visits
  AS PERMISSIVE
  FOR DELETE
  TO public
  USING (workspace_id IN (
    SELECT employees.workspace_id
    FROM employees
    WHERE employees.user_id = (SELECT auth.uid())
  ));

DROP POLICY IF EXISTS "cis_visits_insert" ON public.cis_visits;
CREATE POLICY "cis_visits_insert" ON public.cis_visits
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK (workspace_id IN (
    SELECT employees.workspace_id
    FROM employees
    WHERE employees.user_id = (SELECT auth.uid())
  ));

DROP POLICY IF EXISTS "cis_visits_select" ON public.cis_visits;
CREATE POLICY "cis_visits_select" ON public.cis_visits
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (workspace_id IN (
    SELECT employees.workspace_id
    FROM employees
    WHERE employees.user_id = (SELECT auth.uid())
  ));

DROP POLICY IF EXISTS "cis_visits_update" ON public.cis_visits;
CREATE POLICY "cis_visits_update" ON public.cis_visits
  AS PERMISSIVE
  FOR UPDATE
  TO public
  USING (workspace_id IN (
    SELECT employees.workspace_id
    FROM employees
    WHERE employees.user_id = (SELECT auth.uid())
  ));

-- ============================================================================
-- clock_records (3 policies)
-- ============================================================================
DROP POLICY IF EXISTS "clock_records_insert" ON public.clock_records;
CREATE POLICY "clock_records_insert" ON public.clock_records
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK (workspace_id IN (
    SELECT employees.workspace_id
    FROM employees
    WHERE employees.user_id = (SELECT auth.uid())
  ));

DROP POLICY IF EXISTS "clock_records_select" ON public.clock_records;
CREATE POLICY "clock_records_select" ON public.clock_records
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (workspace_id IN (
    SELECT employees.workspace_id
    FROM employees
    WHERE employees.user_id = (SELECT auth.uid())
  ));

DROP POLICY IF EXISTS "clock_records_update" ON public.clock_records;
CREATE POLICY "clock_records_update" ON public.clock_records
  AS PERMISSIVE
  FOR UPDATE
  TO public
  USING (workspace_id IN (
    SELECT employees.workspace_id
    FROM employees
    WHERE employees.user_id = (SELECT auth.uid())
  ));

-- ============================================================================
-- expense_categories (4 policies)
-- ============================================================================
DROP POLICY IF EXISTS "expense_categories_delete" ON public.expense_categories;
CREATE POLICY "expense_categories_delete" ON public.expense_categories
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING (is_super_admin() OR (user_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "expense_categories_insert" ON public.expense_categories;
CREATE POLICY "expense_categories_insert" ON public.expense_categories
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (is_super_admin() OR (user_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "expense_categories_select" ON public.expense_categories;
CREATE POLICY "expense_categories_select" ON public.expense_categories
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (is_super_admin() OR (user_id IS NULL) OR (user_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "expense_categories_update" ON public.expense_categories;
CREATE POLICY "expense_categories_update" ON public.expense_categories
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (is_super_admin() OR (user_id = (SELECT auth.uid())))
  WITH CHECK (is_super_admin() OR (user_id = (SELECT auth.uid())));

-- ============================================================================
-- itineraries (1 policy)
-- ============================================================================
DROP POLICY IF EXISTS "itineraries_select" ON public.itineraries;
CREATE POLICY "itineraries_select" ON public.itineraries
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (
    is_super_admin()
    OR has_capability_for_workspace(workspace_id, 'tours.read'::text)
    OR (workspace_id = (
      SELECT e.workspace_id
      FROM employees e
      WHERE e.user_id = (SELECT auth.uid())
      LIMIT 1
    ))
  );

-- ============================================================================
-- knowledge_base (4 policies)
-- ============================================================================
DROP POLICY IF EXISTS "Users can delete knowledge base in their workspace" ON public.knowledge_base;
CREATE POLICY "Users can delete knowledge base in their workspace" ON public.knowledge_base
  AS PERMISSIVE
  FOR DELETE
  TO public
  USING (workspace_id IN (
    SELECT profiles.workspace_id
    FROM profiles
    WHERE profiles.id = (SELECT auth.uid())
  ));

DROP POLICY IF EXISTS "Users can insert knowledge base in their workspace" ON public.knowledge_base;
CREATE POLICY "Users can insert knowledge base in their workspace" ON public.knowledge_base
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK (workspace_id IN (
    SELECT profiles.workspace_id
    FROM profiles
    WHERE profiles.id = (SELECT auth.uid())
  ));

DROP POLICY IF EXISTS "Users can update knowledge base in their workspace" ON public.knowledge_base;
CREATE POLICY "Users can update knowledge base in their workspace" ON public.knowledge_base
  AS PERMISSIVE
  FOR UPDATE
  TO public
  USING (workspace_id IN (
    SELECT profiles.workspace_id
    FROM profiles
    WHERE profiles.id = (SELECT auth.uid())
  ));

DROP POLICY IF EXISTS "Users can view knowledge base in their workspace" ON public.knowledge_base;
CREATE POLICY "Users can view knowledge base in their workspace" ON public.knowledge_base
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (
    (workspace_id IN (
      SELECT profiles.workspace_id
      FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
    ))
    OR (workspace_id IS NULL)
  );

-- ============================================================================
-- leave_balances (1 policy)
-- ============================================================================
DROP POLICY IF EXISTS "leave_balances_select" ON public.leave_balances;
CREATE POLICY "leave_balances_select" ON public.leave_balances
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (workspace_id IN (
    SELECT employees.workspace_id
    FROM employees
    WHERE employees.user_id = (SELECT auth.uid())
  ));

-- ============================================================================
-- leave_requests (3 policies)
-- ============================================================================
DROP POLICY IF EXISTS "leave_requests_insert" ON public.leave_requests;
CREATE POLICY "leave_requests_insert" ON public.leave_requests
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK (workspace_id IN (
    SELECT employees.workspace_id
    FROM employees
    WHERE employees.user_id = (SELECT auth.uid())
  ));

DROP POLICY IF EXISTS "leave_requests_select" ON public.leave_requests;
CREATE POLICY "leave_requests_select" ON public.leave_requests
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (workspace_id IN (
    SELECT employees.workspace_id
    FROM employees
    WHERE employees.user_id = (SELECT auth.uid())
  ));

DROP POLICY IF EXISTS "leave_requests_update" ON public.leave_requests;
CREATE POLICY "leave_requests_update" ON public.leave_requests
  AS PERMISSIVE
  FOR UPDATE
  TO public
  USING (workspace_id IN (
    SELECT employees.workspace_id
    FROM employees
    WHERE employees.user_id = (SELECT auth.uid())
  ));

-- ============================================================================
-- leave_types (1 policy)
-- ============================================================================
DROP POLICY IF EXISTS "leave_types_select" ON public.leave_types;
CREATE POLICY "leave_types_select" ON public.leave_types
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (workspace_id IN (
    SELECT employees.workspace_id
    FROM employees
    WHERE employees.user_id = (SELECT auth.uid())
  ));

-- ============================================================================
-- missed_clock_requests (3 policies)
-- ============================================================================
DROP POLICY IF EXISTS "missed_clock_insert" ON public.missed_clock_requests;
CREATE POLICY "missed_clock_insert" ON public.missed_clock_requests
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK (workspace_id IN (
    SELECT employees.workspace_id
    FROM employees
    WHERE employees.user_id = (SELECT auth.uid())
  ));

DROP POLICY IF EXISTS "missed_clock_select" ON public.missed_clock_requests;
CREATE POLICY "missed_clock_select" ON public.missed_clock_requests
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (workspace_id IN (
    SELECT employees.workspace_id
    FROM employees
    WHERE employees.user_id = (SELECT auth.uid())
  ));

DROP POLICY IF EXISTS "missed_clock_update" ON public.missed_clock_requests;
CREATE POLICY "missed_clock_update" ON public.missed_clock_requests
  AS PERMISSIVE
  FOR UPDATE
  TO public
  USING (workspace_id IN (
    SELECT employees.workspace_id
    FROM employees
    WHERE employees.user_id = (SELECT auth.uid())
  ));

-- ============================================================================
-- notifications (2 policies)
-- ============================================================================
DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
CREATE POLICY "notifications_select_own" ON public.notifications
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (recipient_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
CREATE POLICY "notifications_update_own" ON public.notifications
  AS PERMISSIVE
  FOR UPDATE
  TO public
  USING (recipient_id = (SELECT auth.uid()))
  WITH CHECK (recipient_id = (SELECT auth.uid()));

-- ============================================================================
-- overtime_requests (3 policies)
-- ============================================================================
DROP POLICY IF EXISTS "overtime_insert" ON public.overtime_requests;
CREATE POLICY "overtime_insert" ON public.overtime_requests
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK (workspace_id IN (
    SELECT employees.workspace_id
    FROM employees
    WHERE employees.user_id = (SELECT auth.uid())
  ));

DROP POLICY IF EXISTS "overtime_select" ON public.overtime_requests;
CREATE POLICY "overtime_select" ON public.overtime_requests
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (workspace_id IN (
    SELECT employees.workspace_id
    FROM employees
    WHERE employees.user_id = (SELECT auth.uid())
  ));

DROP POLICY IF EXISTS "overtime_update" ON public.overtime_requests;
CREATE POLICY "overtime_update" ON public.overtime_requests
  AS PERMISSIVE
  FOR UPDATE
  TO public
  USING (workspace_id IN (
    SELECT employees.workspace_id
    FROM employees
    WHERE employees.user_id = (SELECT auth.uid())
  ));

-- ============================================================================
-- payroll_runs (1 policy)
-- ============================================================================
DROP POLICY IF EXISTS "payroll_runs_select" ON public.payroll_runs;
CREATE POLICY "payroll_runs_select" ON public.payroll_runs
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (workspace_id IN (
    SELECT employees.workspace_id
    FROM employees
    WHERE employees.user_id = (SELECT auth.uid())
  ));

-- ============================================================================
-- payslips (1 policy)
-- ============================================================================
DROP POLICY IF EXISTS "payslips_select" ON public.payslips;
CREATE POLICY "payslips_select" ON public.payslips
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (workspace_id IN (
    SELECT employees.workspace_id
    FROM employees
    WHERE employees.user_id = (SELECT auth.uid())
  ));

-- ============================================================================
-- premium_experiences (1 policy)
-- ============================================================================
DROP POLICY IF EXISTS "premium_experiences_select" ON public.premium_experiences;
CREATE POLICY "premium_experiences_select" ON public.premium_experiences
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (
    is_super_admin()
    OR has_capability_for_workspace(workspace_id, 'database.read'::text)
    OR (workspace_id = (
      SELECT e.workspace_id
      FROM employees e
      WHERE e.user_id = (SELECT auth.uid())
      LIMIT 1
    ))
  );

-- ============================================================================
-- role_capabilities (1 policy)
-- ============================================================================
DROP POLICY IF EXISTS "rc_member_read" ON public.role_capabilities;
CREATE POLICY "rc_member_read" ON public.role_capabilities
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (role_id IN (
    SELECT wr.id
    FROM workspace_roles wr
    WHERE wr.workspace_id IN (
      SELECT e.workspace_id
      FROM employees e
      WHERE e.user_id = (SELECT auth.uid())
    )
  ));

-- ============================================================================
-- todo_columns (1 policy)
-- ============================================================================
DROP POLICY IF EXISTS "todo_columns_select" ON public.todo_columns;
CREATE POLICY "todo_columns_select" ON public.todo_columns
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (
    is_super_admin()
    OR has_capability_for_workspace(workspace_id, 'todos.read'::text)
    OR (workspace_id = (
      SELECT e.workspace_id
      FROM employees e
      WHERE e.user_id = (SELECT auth.uid())
      LIMIT 1
    ))
  );

-- ============================================================================
-- tour_custom_cost_fields (1 policy)
-- ============================================================================
DROP POLICY IF EXISTS "tour_custom_cost_fields_select" ON public.tour_custom_cost_fields;
CREATE POLICY "tour_custom_cost_fields_select" ON public.tour_custom_cost_fields
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (
    is_super_admin()
    OR EXISTS (
      SELECT 1
      FROM tours t
      WHERE t.id = tour_custom_cost_fields.tour_id
        AND (
          has_capability_for_workspace(t.workspace_id, 'tours.read'::text)
          OR (t.workspace_id = (
            SELECT e.workspace_id
            FROM employees e
            WHERE e.user_id = (SELECT auth.uid())
            LIMIT 1
          ))
        )
    )
  );

-- ============================================================================
-- tour_departure_data (1 policy)
-- ============================================================================
DROP POLICY IF EXISTS "tour_departure_data_select" ON public.tour_departure_data;
CREATE POLICY "tour_departure_data_select" ON public.tour_departure_data
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (
    is_super_admin()
    OR EXISTS (
      SELECT 1
      FROM tours t
      WHERE t.id = tour_departure_data.tour_id
        AND (
          has_capability_for_workspace(t.workspace_id, 'tours.read'::text)
          OR (t.workspace_id = (
            SELECT e.workspace_id
            FROM employees e
            WHERE e.user_id = (SELECT auth.uid())
            LIMIT 1
          ))
        )
    )
  );

-- ============================================================================
-- tour_meal_settings (4 policies)
-- ============================================================================
DROP POLICY IF EXISTS "Users can delete meal settings in their workspace" ON public.tour_meal_settings;
CREATE POLICY "Users can delete meal settings in their workspace" ON public.tour_meal_settings
  AS PERMISSIVE
  FOR DELETE
  TO public
  USING (workspace_id IN (
    SELECT profiles.workspace_id
    FROM profiles
    WHERE profiles.id = (SELECT auth.uid())
  ));

DROP POLICY IF EXISTS "Users can insert meal settings in their workspace" ON public.tour_meal_settings;
CREATE POLICY "Users can insert meal settings in their workspace" ON public.tour_meal_settings
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK (workspace_id IN (
    SELECT profiles.workspace_id
    FROM profiles
    WHERE profiles.id = (SELECT auth.uid())
  ));

DROP POLICY IF EXISTS "Users can update meal settings in their workspace" ON public.tour_meal_settings;
CREATE POLICY "Users can update meal settings in their workspace" ON public.tour_meal_settings
  AS PERMISSIVE
  FOR UPDATE
  TO public
  USING (workspace_id IN (
    SELECT profiles.workspace_id
    FROM profiles
    WHERE profiles.id = (SELECT auth.uid())
  ));

DROP POLICY IF EXISTS "Users can view meal settings in their workspace" ON public.tour_meal_settings;
CREATE POLICY "Users can view meal settings in their workspace" ON public.tour_meal_settings
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (workspace_id IN (
    SELECT profiles.workspace_id
    FROM profiles
    WHERE profiles.id = (SELECT auth.uid())
  ));

-- ============================================================================
-- tour_member_fields (1 policy)
-- ============================================================================
DROP POLICY IF EXISTS "tour_member_fields_select" ON public.tour_member_fields;
CREATE POLICY "tour_member_fields_select" ON public.tour_member_fields
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (
    is_super_admin()
    OR EXISTS (
      SELECT 1
      FROM tours t
      WHERE t.id = tour_member_fields.tour_id
        AND (
          has_capability_for_workspace(t.workspace_id, 'tours.read'::text)
          OR (t.workspace_id = (
            SELECT e.workspace_id
            FROM employees e
            WHERE e.user_id = (SELECT auth.uid())
            LIMIT 1
          ))
        )
    )
  );

-- ============================================================================
-- user_preferences (1 policy)
-- ============================================================================
DROP POLICY IF EXISTS "user_preferences_all" ON public.user_preferences;
CREATE POLICY "user_preferences_all" ON public.user_preferences
  AS PERMISSIVE
  FOR ALL
  TO public
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- ============================================================================
-- workspace_attendance_settings (2 policies)
-- 注意：這兩條原 qual 用的是 employees.id = auth.uid()（不是 user_id）、保持原邏輯
-- ============================================================================
DROP POLICY IF EXISTS "workspace_attendance_settings_all" ON public.workspace_attendance_settings;
CREATE POLICY "workspace_attendance_settings_all" ON public.workspace_attendance_settings
  AS PERMISSIVE
  FOR ALL
  TO public
  USING (workspace_id IN (
    SELECT employees.workspace_id
    FROM employees
    WHERE employees.id = (SELECT auth.uid())
  ));

DROP POLICY IF EXISTS "workspace_attendance_settings_select" ON public.workspace_attendance_settings;
CREATE POLICY "workspace_attendance_settings_select" ON public.workspace_attendance_settings
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (workspace_id IN (
    SELECT employees.workspace_id
    FROM employees
    WHERE employees.id = (SELECT auth.uid())
  ));

COMMIT;

-- 驗證 SQL（apply 後手動跑、或交給 advisor 確認）：
-- SELECT count(*) FROM pg_policies
-- WHERE schemaname = 'public'
--   AND (
--     (qual ~ 'auth\.uid\(\)' AND qual !~ '\(\s*SELECT\s+auth\.uid\(\)\s*\)')
--     OR
--     (with_check ~ 'auth\.uid\(\)' AND with_check !~ '\(\s*SELECT\s+auth\.uid\(\)\s*\)')
--   );
-- 預期回傳 0
