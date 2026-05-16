-- 對 schema repair 加的表補 RLS policy
-- pattern: workspace_id-based filter via get_current_user_workspace()
-- service_role 自動 bypass、policy 不影響

BEGIN;

-- ============ workspace_id-filtered tables ============
DO $$
DECLARE
  t text;
  ws_tables text[] := ARRAY[
    'quotes','contracts','chart_of_accounts','bank_accounts',
    'journal_vouchers','accounting_period_closings','payment_requests',
    'disbursement_orders','receipts','checks',
    'attractions','hotels','restaurants','companies','company_contacts',
    'tour_itinerary_items','tour_bonus_settings','tour_documents','image_library',
    'tasks','todos','calendar_events','workspace_countries','workspace_selector_fields',
    'ref_countries','background_tasks','tour_meal_settings','airport_images'
  ];
BEGIN
  FOREACH t IN ARRAY ws_tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I_select ON public.%I', t, t);
    EXECUTE format('CREATE POLICY %I_select ON public.%I FOR SELECT USING (workspace_id IS NULL OR workspace_id = get_current_user_workspace())', t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I_insert ON public.%I', t, t);
    EXECUTE format('CREATE POLICY %I_insert ON public.%I FOR INSERT WITH CHECK (true)', t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I_update ON public.%I', t, t);
    EXECUTE format('CREATE POLICY %I_update ON public.%I FOR UPDATE USING (workspace_id IS NULL OR workspace_id = get_current_user_workspace())', t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I_delete ON public.%I', t, t);
    EXECUTE format('CREATE POLICY %I_delete ON public.%I FOR DELETE USING (workspace_id IS NULL OR workspace_id = get_current_user_workspace())', t, t);
  END LOOP;
END $$;

-- ============ shared / global ref tables (read-all) ============
DO $$
DECLARE
  t text;
  shared_tables text[] := ARRAY['cities','countries','regions','ref_destinations'];
BEGIN
  FOREACH t IN ARRAY shared_tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I_select_all ON public.%I', t, t);
    EXECUTE format('CREATE POLICY %I_select_all ON public.%I FOR SELECT USING (true)', t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I_write_admin ON public.%I', t, t);
    EXECUTE format('CREATE POLICY %I_write_admin ON public.%I FOR ALL USING (true) WITH CHECK (true)', t, t);
  END LOOP;
END $$;

-- ============ child tables (filter via parent) ============
-- journal_lines via journal_vouchers
DROP POLICY IF EXISTS journal_lines_select ON public.journal_lines;
CREATE POLICY journal_lines_select ON public.journal_lines FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.journal_vouchers v WHERE v.id = voucher_id AND v.workspace_id = get_current_user_workspace())
);
DROP POLICY IF EXISTS journal_lines_insert ON public.journal_lines;
CREATE POLICY journal_lines_insert ON public.journal_lines FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS journal_lines_update ON public.journal_lines;
CREATE POLICY journal_lines_update ON public.journal_lines FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.journal_vouchers v WHERE v.id = voucher_id AND v.workspace_id = get_current_user_workspace())
);
DROP POLICY IF EXISTS journal_lines_delete ON public.journal_lines;
CREATE POLICY journal_lines_delete ON public.journal_lines FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.journal_vouchers v WHERE v.id = voucher_id AND v.workspace_id = get_current_user_workspace())
);

-- selector_field_roles via workspace_selector_fields
DROP POLICY IF EXISTS selector_field_roles_select ON public.selector_field_roles;
CREATE POLICY selector_field_roles_select ON public.selector_field_roles FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.workspace_selector_fields f WHERE f.id = field_id AND f.workspace_id = get_current_user_workspace())
);
DROP POLICY IF EXISTS selector_field_roles_insert ON public.selector_field_roles;
CREATE POLICY selector_field_roles_insert ON public.selector_field_roles FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS selector_field_roles_delete ON public.selector_field_roles;
CREATE POLICY selector_field_roles_delete ON public.selector_field_roles FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.workspace_selector_fields f WHERE f.id = field_id AND f.workspace_id = get_current_user_workspace())
);

-- tour_member_fields via tours
DROP POLICY IF EXISTS tour_member_fields_select ON public.tour_member_fields;
CREATE POLICY tour_member_fields_select ON public.tour_member_fields FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.tours t WHERE t.id = tour_id AND t.workspace_id = get_current_user_workspace())
);
DROP POLICY IF EXISTS tour_member_fields_insert ON public.tour_member_fields;
CREATE POLICY tour_member_fields_insert ON public.tour_member_fields FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS tour_member_fields_update ON public.tour_member_fields;
CREATE POLICY tour_member_fields_update ON public.tour_member_fields FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.tours t WHERE t.id = tour_id AND t.workspace_id = get_current_user_workspace())
);

-- tour_custom_cost_fields, tour_role_assignments, tour_departure_data via tours
DO $$
DECLARE
  t text;
  child_tables text[] := ARRAY['tour_custom_cost_fields','tour_role_assignments','tour_departure_data'];
BEGIN
  FOREACH t IN ARRAY child_tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I_select ON public.%I', t, t);
    EXECUTE format('CREATE POLICY %I_select ON public.%I FOR SELECT USING (EXISTS (SELECT 1 FROM public.tours tt WHERE tt.id = tour_id AND tt.workspace_id = get_current_user_workspace()))', t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I_insert ON public.%I', t, t);
    EXECUTE format('CREATE POLICY %I_insert ON public.%I FOR INSERT WITH CHECK (true)', t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I_update ON public.%I', t, t);
    EXECUTE format('CREATE POLICY %I_update ON public.%I FOR UPDATE USING (EXISTS (SELECT 1 FROM public.tours tt WHERE tt.id = tour_id AND tt.workspace_id = get_current_user_workspace()))', t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I_delete ON public.%I', t, t);
    EXECUTE format('CREATE POLICY %I_delete ON public.%I FOR DELETE USING (EXISTS (SELECT 1 FROM public.tours tt WHERE tt.id = tour_id AND tt.workspace_id = get_current_user_workspace()))', t, t);
  END LOOP;
END $$;

-- user_preferences (user-owned)
DROP POLICY IF EXISTS user_preferences_self ON public.user_preferences;
CREATE POLICY user_preferences_self ON public.user_preferences FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- notes (user-owned but workspace scoped)
DROP POLICY IF EXISTS notes_self ON public.notes;
CREATE POLICY notes_self ON public.notes FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============ expense_categories FK to chart_of_accounts ============
-- 看現有 schema、補 FK 讓 PostgREST relationship 認得
DO $$ BEGIN
  ALTER TABLE public.expense_categories
    ADD CONSTRAINT expense_categories_debit_account_id_fkey
    FOREIGN KEY (debit_account_id) REFERENCES public.chart_of_accounts(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.expense_categories
    ADD CONSTRAINT expense_categories_credit_account_id_fkey
    FOREIGN KEY (credit_account_id) REFERENCES public.chart_of_accounts(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_column THEN NULL; END $$;

NOTIFY pgrst, 'reload schema';

COMMIT;
