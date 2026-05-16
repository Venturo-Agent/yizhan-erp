-- Round 11：砍 idx_scan = 0 的 unused index
-- 修補 advisor unused_index（William 授權「全砍」）
--
-- 條件：
--   - public schema
--   - idx_scan = 0（PostgreSQL 自從 last stats reset 以來從未用過）
--   - 不是 primary key / unique constraint backing index
--   - 不是 constraint backing index
--   - 排除 Round 1 剛建的 65 條 FK index（剛建還沒被用、不該砍）
--
-- 砍 unused index 風險：
--   若 query pattern 變化、未來剛好需要這個 index、砍了會慢
--   但 William 授權砍、且 idx_scan = 0 表示真實 production load 上沒用過

DO $$
DECLARE
  rec RECORD;
  dropped_count INT := 0;
  excluded_indexes TEXT[] := ARRAY[
    'accounting_period_closings_closed_by_idx',
    'accounting_period_closings_closing_voucher_id_idx',
    'background_tasks_created_by_idx',
    'bulletins_author_id_idx',
    'bulletins_updated_by_idx',
    'cis_clients_created_by_idx',
    'cis_clients_updated_by_idx',
    'cis_pricing_items_created_by_idx',
    'cis_pricing_items_updated_by_idx',
    'cis_visits_created_by_idx',
    'cis_visits_updated_by_idx',
    'clock_records_created_by_idx',
    'clock_records_missed_clock_request_id_idx',
    'clock_records_updated_by_idx',
    'companies_created_by_idx',
    'companies_updated_by_idx',
    'company_announcements_created_by_idx',
    'company_announcements_updated_by_idx',
    'company_contacts_created_by_idx',
    'company_contacts_updated_by_idx',
    'cost_templates_created_by_idx',
    'cost_templates_updated_by_idx',
    'employees_terminated_by_idx',
    'image_library_country_code_idx',
    'image_library_created_by_idx',
    'leave_balances_leave_type_id_idx',
    'leave_balances_workspace_id_idx',
    'leave_requests_approver_id_idx',
    'leave_requests_cancelled_by_idx',
    'leave_requests_created_by_idx',
    'leave_requests_leave_type_id_idx',
    'leave_requests_updated_by_idx',
    'linkpay_logs_created_by_idx',
    'linkpay_logs_updated_by_idx',
    'linkpay_logs_workspace_receipt_number_idx',
    'missed_clock_requests_approved_by_idx',
    'missed_clock_requests_created_by_idx',
    'missed_clock_requests_updated_by_idx',
    'notifications_sender_id_idx',
    'order_members_roommate_id_idx',
    'overtime_requests_approved_by_idx',
    'overtime_requests_created_by_idx',
    'overtime_requests_updated_by_idx',
    'payment_request_items_payment_method_id_idx',
    'payroll_runs_created_by_idx',
    'payroll_runs_finalized_by_idx',
    'payroll_runs_updated_by_idx',
    'payslips_created_by_idx',
    'payslips_updated_by_idx',
    'pnr_records_created_by_idx',
    'quote_confirmation_logs_confirmed_by_staff_id_idx',
    'receipts_refunded_by_idx',
    'request_response_items_created_by_idx',
    'request_response_items_updated_by_idx',
    'rich_documents_created_by_idx',
    'rich_documents_updated_by_idx',
    'tour_role_assignments_employee_id_idx',
    'tour_role_assignments_role_id_idx',
    'transportation_rates_country_code_idx',
    'transportation_rates_created_by_idx',
    'transportation_rates_deleted_by_idx',
    'transportation_rates_updated_by_idx',
    'visas_created_by_idx',
    'visas_updated_by_idx',
    'workspace_countries_country_code_idx'
  ];
BEGIN
  FOR rec IN
    SELECT s.indexrelname
    FROM pg_stat_user_indexes s
    JOIN pg_index i ON i.indexrelid = s.indexrelid
    WHERE s.schemaname = 'public'
      AND s.idx_scan = 0
      AND NOT i.indisprimary
      AND NOT i.indisunique
      AND NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conindid = s.indexrelid)
      AND NOT (s.indexrelname = ANY(excluded_indexes))
  LOOP
    EXECUTE format('DROP INDEX IF EXISTS public.%I', rec.indexrelname);
    dropped_count := dropped_count + 1;
  END LOOP;
  RAISE NOTICE 'Round 11: dropped % unused indexes', dropped_count;
END$$;
