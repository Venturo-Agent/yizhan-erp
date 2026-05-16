-- Round 9：砍 api_usage / cron_execution_logs 的 RLS 穿幫 policies
-- 修補 advisor rls_policy_always_true（這 8 條）
--
-- 業務邏輯：
-- - api_usage 是 system log、所有 caller（src/app/api/ + src/lib/api-usage.ts）都用 getSupabaseAdminClient()（service_role、BYPASSRLS）
-- - cron_execution_logs 整 src/ 零 caller、純 system log
-- - 兩表不該開放給 anon/authenticated client、砍 policy = RLS deny by default、admin client 仍能用
--
-- 不修：
-- - 業務表 8 條（hotels / restaurants / tasks / supplier_categories / tour_destinations / tour_leaders / vendor_costs / cost_templates）TO authenticated USING true
--   要 William 拍板：這些表是不是真的全 workspace 共用？若否、要 narrow 到 workspace_id
-- - profiles_insert（TO public WITH CHECK true）—— 影響 supabase auth signup flow、要拍板
-- - ref_*_public_read 4 條（airports/cities/countries/destinations）—— 字典表、authenticated 看全部合理

DROP POLICY IF EXISTS "api_usage_select" ON public.api_usage;
DROP POLICY IF EXISTS "api_usage_insert" ON public.api_usage;
DROP POLICY IF EXISTS "api_usage_update" ON public.api_usage;
DROP POLICY IF EXISTS "api_usage_delete" ON public.api_usage;

DROP POLICY IF EXISTS "cron_execution_logs_select" ON public.cron_execution_logs;
DROP POLICY IF EXISTS "cron_execution_logs_insert" ON public.cron_execution_logs;
DROP POLICY IF EXISTS "cron_execution_logs_update" ON public.cron_execution_logs;
DROP POLICY IF EXISTS "cron_execution_logs_delete" ON public.cron_execution_logs;
