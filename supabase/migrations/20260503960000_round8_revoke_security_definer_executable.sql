-- Round 8：收斂 SECURITY DEFINER function 的 EXECUTE 權限
-- 修補 advisor *_security_definer_function_executable WARN（118 = 59 × 2 roles）
--
-- 原理：PostgreSQL 預設 GRANT EXECUTE TO PUBLIC、anon/authenticated 透過 PUBLIC 繼承
-- 正確做法：REVOKE FROM PUBLIC + GRANT TO 該保留的 role
--
-- 分類來源：Round 4 agent classification
-- - A. trigger function（return type=trigger、client 不該也不能直接執行）→ service_role only
-- - B. cron / 系統初始化（內部用）→ service_role only
-- - C. RLS helper（policy 內部呼叫）→ service_role + authenticated
-- - D. 已登入員工 RPC → service_role + authenticated
-- - E. 真正 public（confirm_quote_by_customer）→ 保留 PUBLIC（不在本 migration 動）

DO $$
DECLARE
  rec RECORD;
BEGIN
  -- A + B: trigger + cron/system → REVOKE FROM PUBLIC, anon, authenticated + GRANT TO service_role only
  FOR rec IN
    SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
      AND (
        p.prorettype = 'trigger'::regtype
        OR p.proname IN (
          'auto_open_tour_conversations', 'auto_open_tour_conversations_with_logging',
          'run_auto_open_now', 'cleanup_rate_limits', 'check_rate_limit',
          'seed_default_roles_for_workspace', 'seed_tenant_base_data'
        )
      )
      AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = p.oid AND d.deptype = 'e')
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM PUBLIC, anon, authenticated',
                   rec.proname, rec.args);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO service_role',
                   rec.proname, rec.args);
  END LOOP;

  -- C + D: RLS helper + employee RPC → REVOKE FROM PUBLIC, anon + GRANT TO service_role + authenticated
  FOR rec IN
    SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
      AND p.proname IN (
        -- C: RLS helper
        'is_admin', 'is_super_admin', 'is_employee', 'is_service_role',
        'has_capability', 'has_capability_for_workspace', 'has_permission',
        'has_attraction_license', 'can_manage_workspace',
        'get_current_employee_id', 'get_current_user_workspace',
        'get_user_workspace_id', 'get_user_project_ids', 'get_user_permission',
        -- D: employee RPC
        'add_employee_to_tour_conversation', 'get_or_create_direct_conversation',
        'get_tour_conversations', 'get_unread_count', 'get_unread_counts_batch',
        'mark_conversation_read', 'send_tour_message', 'toggle_tour_conversation',
        'confirm_quote_by_staff', 'revoke_quote_confirmation', 'send_quote_confirmation',
        'check_my_tours_updates', 'get_my_tour_details', 'sync_my_tours',
        'create_atomic_transaction', 'recalculate_order_totals', 'increment_points',
        'sync_passport_to_order_members',
        'get_cron_job_status', 'log_file_download', 'set_current_workspace'
      )
      AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = p.oid AND d.deptype = 'e')
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM PUBLIC, anon',
                   rec.proname, rec.args);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO service_role, authenticated',
                   rec.proname, rec.args);
  END LOOP;
END$$;
