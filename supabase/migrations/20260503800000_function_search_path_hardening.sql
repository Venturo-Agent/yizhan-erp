-- 加固 function search_path 防止 search_path injection
-- 修補 advisor function_search_path_mutable WARN（129 條）
-- Round 4 自主迭代優化
--
-- 為什麼用 SET search_path = 'public' 而非 SET search_path = ''
--   - '' 強制所有 reference qualified、會 break 那些用 unqualified table reference 的 function
--   - 'public' 保留 public schema、但 attacker 不能 prepend 自己的 schema 注入
--   - Supabase 官方推薦的保守做法
--
-- ⚠️ 雖然 ALTER FUNCTION SET search_path 是純加法、但可能影響 trigger 內部 reference 解析
-- 建議：apply 前跑 e2e + 用測試租戶驗證一輪、再 apply 到 prod
--
-- 範圍：
--   - 只動 venturo 自己寫的 public schema function（pg_depend 不指向 extension）
--   - 排除 pgvector / pgcrypto / pg_net / pg_graphql 等 extension 內部 function
--
-- 對應 advisor: function_search_path_mutable
-- 不影響：function 行為、return value、trigger 觸發時機

BEGIN;

-- =============================================================
-- ALTER FUNCTION ... SET search_path = 'public' (129 條)
-- =============================================================

ALTER FUNCTION public.add_employee_to_tour_conversation(p_tour_id text, p_employee_id uuid, p_role text) SET search_path = 'public';
ALTER FUNCTION public.archive_heroic_summon_result() SET search_path = 'public';
ALTER FUNCTION public.auto_build_cache_on_id_bind() SET search_path = 'public';
ALTER FUNCTION public.auto_categorize_file() SET search_path = 'public';
ALTER FUNCTION public.auto_compute_request_item_subtotal() SET search_path = 'public';
ALTER FUNCTION public.auto_create_lead() SET search_path = 'public';
ALTER FUNCTION public.auto_increment_version_number() SET search_path = 'public';
ALTER FUNCTION public.auto_link_email_contacts() SET search_path = 'public';
ALTER FUNCTION public.auto_move_file_to_folder() SET search_path = 'public';
ALTER FUNCTION public.auto_open_tour_conversations() SET search_path = 'public';
ALTER FUNCTION public.auto_open_tour_conversations_with_logging() SET search_path = 'public';
ALTER FUNCTION public.auto_post_customer_receipt() SET search_path = 'public';
ALTER FUNCTION public.auto_post_supplier_payment() SET search_path = 'public';
ALTER FUNCTION public.auto_set_workspace_id() SET search_path = 'public';
ALTER FUNCTION public.calculate_confirmation_item_subtotal() SET search_path = 'public';
ALTER FUNCTION public.calculate_payroll_totals() SET search_path = 'public';
ALTER FUNCTION public.calculate_quote_balance() SET search_path = 'public';
ALTER FUNCTION public.calculate_work_hours() SET search_path = 'public';
ALTER FUNCTION public.cascade_disbursement_paid_to_requests() SET search_path = 'public';
ALTER FUNCTION public.cascade_items_to_parent_amount() SET search_path = 'public';
ALTER FUNCTION public.cascade_supplier_rename() SET search_path = 'public';
ALTER FUNCTION public.cascade_tour_departure_date_to_orders() SET search_path = 'public';
ALTER FUNCTION public.cascade_tour_rename() SET search_path = 'public';
ALTER FUNCTION public.check_leader_schedule_conflict(p_leader_id uuid, p_start_date date, p_end_date date, p_exclude_id uuid) SET search_path = 'public';
ALTER FUNCTION public.check_member_upgrade() SET search_path = 'public';
ALTER FUNCTION public.check_my_tours_updates(p_last_synced_at timestamp with time zone) SET search_path = 'public';
ALTER FUNCTION public.check_tour_member_modify_lock() SET search_path = 'public';
ALTER FUNCTION public.check_vehicle_schedule_conflict(p_vehicle_id uuid, p_start_date date, p_end_date date, p_exclude_id uuid) SET search_path = 'public';
ALTER FUNCTION public.compute_member_age_and_type() SET search_path = 'public';
ALTER FUNCTION public.confirm_quote_by_customer(p_token text, p_name text, p_email text, p_phone text, p_notes text, p_ip_address text, p_user_agent text) SET search_path = 'public';
ALTER FUNCTION public.confirm_quote_by_staff(p_quote_id text, p_staff_id uuid, p_staff_name text, p_notes text) SET search_path = 'public';
ALTER FUNCTION public.create_atomic_transaction(p_account_id uuid, p_amount numeric, p_transaction_type text, p_description text, p_category_id uuid, p_transaction_date timestamp with time zone) SET search_path = 'public';
ALTER FUNCTION public.create_default_finance_settings() SET search_path = 'public';
ALTER FUNCTION public.create_default_leave_types(p_workspace_id uuid) SET search_path = 'public';
ALTER FUNCTION public.create_default_payment_methods() SET search_path = 'public';
ALTER FUNCTION public.create_default_todo_columns() SET search_path = 'public';
ALTER FUNCTION public.create_tour_conversations() SET search_path = 'public';
ALTER FUNCTION public.create_tour_folders() SET search_path = 'public';
ALTER FUNCTION public.enforce_disbursement_order_lock() SET search_path = 'public';
ALTER FUNCTION public.enforce_payment_request_items_lock() SET search_path = 'public';
ALTER FUNCTION public.enforce_payment_request_lock() SET search_path = 'public';
ALTER FUNCTION public.ensure_conversation_exists(p_workspace_id uuid, p_conversation_type text, p_target_id text, p_target_name text) SET search_path = 'public';
ALTER FUNCTION public.ensure_single_default_payment_account() SET search_path = 'public';
ALTER FUNCTION public.generate_confirmation_token() SET search_path = 'public';
ALTER FUNCTION public.generate_disbursement_no(p_workspace_id uuid, p_disbursement_date date) SET search_path = 'public';
ALTER FUNCTION public.generate_inquiry_code() SET search_path = 'public';
ALTER FUNCTION public.generate_quote_code() SET search_path = 'public';
ALTER FUNCTION public.generate_receipt_no(p_tour_id text) SET search_path = 'public';
ALTER FUNCTION public.generate_request_no(p_tour_code text) SET search_path = 'public';
ALTER FUNCTION public.generate_tour_code(p_workspace_id uuid, p_city_code text, p_departure_date date) SET search_path = 'public';
ALTER FUNCTION public.generate_voucher_no(p_workspace_id uuid, p_voucher_date date) SET search_path = 'public';
ALTER FUNCTION public.get_account_id_by_code(p_workspace_id uuid, p_code text) SET search_path = 'public';
ALTER FUNCTION public.get_cron_job_status() SET search_path = 'public';
ALTER FUNCTION public.get_current_employee_id() SET search_path = 'public';
ALTER FUNCTION public.get_my_tour_details(p_tour_code text) SET search_path = 'public';
ALTER FUNCTION public.get_or_create_direct_conversation(other_user_id uuid) SET search_path = 'public';
ALTER FUNCTION public.get_person_workload(person_name text) SET search_path = 'public';
ALTER FUNCTION public.get_projects_overview() SET search_path = 'public';
ALTER FUNCTION public.get_tour_conversations(p_workspace_id uuid) SET search_path = 'public';
ALTER FUNCTION public.get_tour_pnl(p_workspace_id uuid, p_year_start date, p_year_end date) SET search_path = 'public';
ALTER FUNCTION public.get_unread_count(p_conversation_id uuid) SET search_path = 'public';
ALTER FUNCTION public.get_unread_counts_batch(p_conversation_ids uuid[]) SET search_path = 'public';
ALTER FUNCTION public.get_user_permission(p_user_id uuid, p_itinerary_id text) SET search_path = 'public';
ALTER FUNCTION public.get_user_project_ids(uid uuid) SET search_path = 'public';
ALTER FUNCTION public.get_user_workspace_id() SET search_path = 'public';
ALTER FUNCTION public.handle_user_update() SET search_path = 'public';
ALTER FUNCTION public.increment_points(customer_id_param text, points_param integer) SET search_path = 'public';
ALTER FUNCTION public.is_admin(p_user_id uuid) SET search_path = 'public';
ALTER FUNCTION public.is_admin() SET search_path = 'public';
ALTER FUNCTION public.is_country_enabled(p_workspace uuid, p_code text) SET search_path = 'public';
ALTER FUNCTION public.is_employee() SET search_path = 'public';
ALTER FUNCTION public.is_service_role() SET search_path = 'public';
ALTER FUNCTION public.log_file_changes() SET search_path = 'public';
ALTER FUNCTION public.log_file_download(p_file_id uuid) SET search_path = 'public';
ALTER FUNCTION public.mark_conversation_read(p_conversation_id uuid) SET search_path = 'public';
ALTER FUNCTION public.notify_ai_message() SET search_path = 'public';
ALTER FUNCTION public.recalculate_order_totals(p_order_id text) SET search_path = 'public';
ALTER FUNCTION public.receipt_confirmed_immutable() SET search_path = 'public';
ALTER FUNCTION public.refresh_all_region_stats() SET search_path = 'public';
ALTER FUNCTION public.revoke_quote_confirmation(p_quote_id text, p_staff_id uuid, p_staff_name text, p_reason text) SET search_path = 'public';
ALTER FUNCTION public.run_auto_open_now() SET search_path = 'public';
ALTER FUNCTION public.seed_tenant_base_data(source_workspace_id uuid, target_workspace_id uuid) SET search_path = 'public';
ALTER FUNCTION public.send_quote_confirmation(p_quote_id text, p_expires_in_days integer, p_staff_id uuid) SET search_path = 'public';
ALTER FUNCTION public.send_tour_message(p_conversation_id uuid, p_content text, p_type text, p_attachments jsonb) SET search_path = 'public';
ALTER FUNCTION public.set_current_workspace(p_workspace_id text) SET search_path = 'public';
ALTER FUNCTION public.set_itinerary_workspace() SET search_path = 'public';
ALTER FUNCTION public.set_updated_at() SET search_path = 'public';
ALTER FUNCTION public.sync_confirmation_from_request() SET search_path = 'public';
ALTER FUNCTION public.sync_country_code_from_id() SET search_path = 'public';
ALTER FUNCTION public.sync_customer_passport_to_members() SET search_path = 'public';
ALTER FUNCTION public.sync_my_tours() SET search_path = 'public';
ALTER FUNCTION public.sync_order_departure_date() SET search_path = 'public';
ALTER FUNCTION public.sync_passport_to_order_members(p_customer_id text, p_passport_number text, p_passport_name text, p_passport_expiry text, p_passport_image_url text, p_birth_date text, p_gender text, p_id_number text) SET search_path = 'public';
ALTER FUNCTION public.toggle_tour_conversation(p_tour_id text, p_is_open boolean, p_send_welcome boolean) SET search_path = 'public';
ALTER FUNCTION public.trigger_recalc_order_on_member_change() SET search_path = 'public';
ALTER FUNCTION public.trigger_update_stats_on_quote_region_change() SET search_path = 'public';
ALTER FUNCTION public.update_account_balance() SET search_path = 'public';
ALTER FUNCTION public.update_attendance_records_updated_at() SET search_path = 'public';
ALTER FUNCTION public.update_city_stats(p_city_id text) SET search_path = 'public';
ALTER FUNCTION public.update_company_assets_updated_at() SET search_path = 'public';
ALTER FUNCTION public.update_confirmation_sheet_totals() SET search_path = 'public';
ALTER FUNCTION public.update_confirmations_updated_at() SET search_path = 'public';
ALTER FUNCTION public.update_conversation_last_message() SET search_path = 'public';
ALTER FUNCTION public.update_conversation_timestamp() SET search_path = 'public';
ALTER FUNCTION public.update_customer_stats() SET search_path = 'public';
ALTER FUNCTION public.update_customer_total_points() SET search_path = 'public';
ALTER FUNCTION public.update_designer_drafts_updated_at() SET search_path = 'public';
ALTER FUNCTION public.update_driver_tasks_updated_at() SET search_path = 'public';
ALTER FUNCTION public.update_emails_updated_at() SET search_path = 'public';
ALTER FUNCTION public.update_expense_streak() SET search_path = 'public';
ALTER FUNCTION public.update_files_updated_at() SET search_path = 'public';
ALTER FUNCTION public.update_folders_updated_at() SET search_path = 'public';
ALTER FUNCTION public.update_heroic_summon_updated_at() SET search_path = 'public';
ALTER FUNCTION public.update_itineraries_updated_at() SET search_path = 'public';
ALTER FUNCTION public.update_leave_balance_on_approval() SET search_path = 'public';
ALTER FUNCTION public.update_leave_balances_updated_at() SET search_path = 'public';
ALTER FUNCTION public.update_luxury_hotels_updated_at() SET search_path = 'public';
ALTER FUNCTION public.update_message_reply_stats() SET search_path = 'public';
ALTER FUNCTION public.update_online_trip_members_updated_at() SET search_path = 'public';
ALTER FUNCTION public.update_payment_request_total() SET search_path = 'public';
ALTER FUNCTION public.update_payroll_periods_updated_at() SET search_path = 'public';
ALTER FUNCTION public.update_payroll_records_updated_at() SET search_path = 'public';
ALTER FUNCTION public.update_pnr_queue_count() SET search_path = 'public';
ALTER FUNCTION public.update_pnrs_updated_at() SET search_path = 'public';
ALTER FUNCTION public.update_quote_regions_updated_at() SET search_path = 'public';
ALTER FUNCTION public.update_request_on_response() SET search_path = 'public';
ALTER FUNCTION public.update_tour_requests_updated_at() SET search_path = 'public';
ALTER FUNCTION public.update_tour_tables_updated_at() SET search_path = 'public';
ALTER FUNCTION public.update_updated_at() SET search_path = 'public';

COMMIT;

-- 驗證：應回傳 0 列
-- SELECT p.proname, pg_get_function_identity_arguments(p.oid)
-- FROM pg_proc p
-- JOIN pg_namespace n ON n.oid = p.pronamespace
-- WHERE n.nspname = 'public' AND p.prokind = 'f'
--   AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = p.oid AND d.deptype='e')
--   AND (p.proconfig IS NULL OR NOT (p.proconfig::text ~ 'search_path'));
