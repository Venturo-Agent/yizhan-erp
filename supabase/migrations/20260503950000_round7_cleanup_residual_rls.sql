-- Round 7：清掉 Round 6 沒涵蓋的 RLS 殘留
-- 修補：
--   1. notifications 兩條 _service 穿幫（INSERT + DELETE TO public USING true）
--   2. 6 條 auth_rls_initplan 殘留（auth.role() 沒包成 (SELECT auth.role())）
--
-- 純改寫（DROP + CREATE 等價、語意完全不變）+ DROP 穿幫（service_role BYPASSRLS、不需要 policy）
-- 不影響 prod 行為、advisor 全消

BEGIN;

-- notifications：service_role 自帶 BYPASSRLS、不需要明文 INSERT/DELETE policy
-- INSERT 由 trigger 建 notification、走 service_role
-- DELETE 應由 user 刪自己（業務拍板：要不要新增 limited DELETE policy 限 recipient_id = auth.uid()）
DROP POLICY IF EXISTS "notifications_insert_service" ON public.notifications;
DROP POLICY IF EXISTS "notifications_delete_service" ON public.notifications;

-- ref_airlines：auth.role() → (SELECT auth.role())
DROP POLICY IF EXISTS "ref_airlines_authenticated_access" ON public.ref_airlines;
CREATE POLICY "ref_airlines_authenticated_access" ON public.ref_airlines
  AS PERMISSIVE FOR ALL TO public
  USING ((SELECT auth.role()) = 'authenticated'::text);

-- ref_booking_classes
DROP POLICY IF EXISTS "ref_booking_classes_authenticated_access" ON public.ref_booking_classes;
CREATE POLICY "ref_booking_classes_authenticated_access" ON public.ref_booking_classes
  AS PERMISSIVE FOR ALL TO public
  USING ((SELECT auth.role()) = 'authenticated'::text);

-- ref_ssr_codes
DROP POLICY IF EXISTS "ref_ssr_codes_authenticated_access" ON public.ref_ssr_codes;
CREATE POLICY "ref_ssr_codes_authenticated_access" ON public.ref_ssr_codes
  AS PERMISSIVE FOR ALL TO public
  USING ((SELECT auth.role()) = 'authenticated'::text);

-- ref_status_codes
DROP POLICY IF EXISTS "ref_status_codes_authenticated_access" ON public.ref_status_codes;
CREATE POLICY "ref_status_codes_authenticated_access" ON public.ref_status_codes
  AS PERMISSIVE FOR ALL TO public
  USING ((SELECT auth.role()) = 'authenticated'::text);

-- rate_limits
DROP POLICY IF EXISTS "rate_limits_service_role_only" ON public.rate_limits;
CREATE POLICY "rate_limits_service_role_only" ON public.rate_limits
  AS PERMISSIVE FOR ALL TO public
  USING ((SELECT auth.role()) = 'service_role'::text)
  WITH CHECK ((SELECT auth.role()) = 'service_role'::text);

-- workspaces_delete（紅線 #1 不准 FORCE RLS、本 migration 不動 FORCE flag、純改 policy 寫法）
DROP POLICY IF EXISTS "workspaces_delete" ON public.workspaces;
CREATE POLICY "workspaces_delete" ON public.workspaces
  AS PERMISSIVE FOR DELETE TO public
  USING ((SELECT auth.role()) = 'service_role'::text);

COMMIT;
