-- ════════════════════════════════════════════════════════════════════════════
-- 簡化 attractions / hotels / restaurants RLS（2026-05-27 William 拍板）
--
-- 為什麼：
--   公共池資料已歸還角落（見 20260527140000）、不再有 created_by_workspace_id IS NULL
--   的「無主公共池」row。原 4 個 policy 的「OR (IS NULL AND 有 shared_data_content
--   feature / shared_data.X.write capability)」分支從此永遠 false、空轉。
--   移除該分支、改回標準 workspace 隔離（created_by_workspace_id = 自己 workspace）。
--
-- 行為中性論證：
--   無 NULL row → 第二分支對任何 row 都 false → 移除不改變任何 user 現在能看 / 能做的。
--   唯一語意變化：角落員工管這批資料改走第一分支（workspace match），不再需要公共池
--   時代的 shared_data.X.write capability（公共池沒了、該 capability 失去原意，第 4 步收）。
--
-- 不動：workspaces RLS（紅線 A）、其他表。本 migration 僅這 3 張表。
-- ════════════════════════════════════════════════════════════════════════════
BEGIN;

-- ─── attractions ───
DROP POLICY IF EXISTS attractions_select ON public.attractions;
CREATE POLICY attractions_select ON public.attractions FOR SELECT
  USING (created_by_workspace_id = public.get_current_user_workspace());
DROP POLICY IF EXISTS attractions_insert ON public.attractions;
CREATE POLICY attractions_insert ON public.attractions FOR INSERT
  WITH CHECK (created_by_workspace_id = public.get_current_user_workspace());
DROP POLICY IF EXISTS attractions_update ON public.attractions;
CREATE POLICY attractions_update ON public.attractions FOR UPDATE
  USING (created_by_workspace_id = public.get_current_user_workspace())
  WITH CHECK (created_by_workspace_id = public.get_current_user_workspace());
DROP POLICY IF EXISTS attractions_delete ON public.attractions;
CREATE POLICY attractions_delete ON public.attractions FOR DELETE
  USING (created_by_workspace_id = public.get_current_user_workspace());

-- ─── hotels ───
DROP POLICY IF EXISTS hotels_select ON public.hotels;
CREATE POLICY hotels_select ON public.hotels FOR SELECT
  USING (created_by_workspace_id = public.get_current_user_workspace());
DROP POLICY IF EXISTS hotels_insert ON public.hotels;
CREATE POLICY hotels_insert ON public.hotels FOR INSERT
  WITH CHECK (created_by_workspace_id = public.get_current_user_workspace());
DROP POLICY IF EXISTS hotels_update ON public.hotels;
CREATE POLICY hotels_update ON public.hotels FOR UPDATE
  USING (created_by_workspace_id = public.get_current_user_workspace())
  WITH CHECK (created_by_workspace_id = public.get_current_user_workspace());
DROP POLICY IF EXISTS hotels_delete ON public.hotels;
CREATE POLICY hotels_delete ON public.hotels FOR DELETE
  USING (created_by_workspace_id = public.get_current_user_workspace());

-- ─── restaurants ───
DROP POLICY IF EXISTS restaurants_select ON public.restaurants;
CREATE POLICY restaurants_select ON public.restaurants FOR SELECT
  USING (created_by_workspace_id = public.get_current_user_workspace());
DROP POLICY IF EXISTS restaurants_insert ON public.restaurants;
CREATE POLICY restaurants_insert ON public.restaurants FOR INSERT
  WITH CHECK (created_by_workspace_id = public.get_current_user_workspace());
DROP POLICY IF EXISTS restaurants_update ON public.restaurants;
CREATE POLICY restaurants_update ON public.restaurants FOR UPDATE
  USING (created_by_workspace_id = public.get_current_user_workspace())
  WITH CHECK (created_by_workspace_id = public.get_current_user_workspace());
DROP POLICY IF EXISTS restaurants_delete ON public.restaurants;
CREATE POLICY restaurants_delete ON public.restaurants FOR DELETE
  USING (created_by_workspace_id = public.get_current_user_workspace());

COMMIT;

-- ════ Rollback（萬一要還原舊「公共池」policy、複製貼上跑）════════════════════
-- BEGIN;
-- -- attractions（select 看 shared_data_content feature；寫看 shared_data.attractions.write capability）
-- DROP POLICY IF EXISTS attractions_select ON public.attractions;
-- CREATE POLICY attractions_select ON public.attractions FOR SELECT USING (
--   (created_by_workspace_id = public.get_current_user_workspace())
--   OR ((created_by_workspace_id IS NULL) AND EXISTS (
--     SELECT 1 FROM public.workspace_features wf
--     WHERE wf.workspace_id = public.get_current_user_workspace()
--       AND wf.feature_code = 'shared_data_content' AND wf.enabled = true)));
-- DROP POLICY IF EXISTS attractions_insert ON public.attractions;
-- CREATE POLICY attractions_insert ON public.attractions FOR INSERT WITH CHECK (
--   (created_by_workspace_id = public.get_current_user_workspace())
--   OR ((created_by_workspace_id IS NULL) AND EXISTS (
--     SELECT 1 FROM public.employees e JOIN public.role_capabilities rc ON rc.role_id = e.role_id
--     WHERE e.user_id = (SELECT auth.uid()) AND rc.capability_code = 'shared_data.attractions.write' AND rc.enabled = true)));
-- DROP POLICY IF EXISTS attractions_update ON public.attractions;
-- CREATE POLICY attractions_update ON public.attractions FOR UPDATE USING (
--   (created_by_workspace_id = public.get_current_user_workspace())
--   OR ((created_by_workspace_id IS NULL) AND EXISTS (
--     SELECT 1 FROM public.employees e JOIN public.role_capabilities rc ON rc.role_id = e.role_id
--     WHERE e.user_id = (SELECT auth.uid()) AND rc.capability_code = 'shared_data.attractions.write' AND rc.enabled = true)))
--   WITH CHECK (
--   (created_by_workspace_id = public.get_current_user_workspace())
--   OR ((created_by_workspace_id IS NULL) AND EXISTS (
--     SELECT 1 FROM public.employees e JOIN public.role_capabilities rc ON rc.role_id = e.role_id
--     WHERE e.user_id = (SELECT auth.uid()) AND rc.capability_code = 'shared_data.attractions.write' AND rc.enabled = true)));
-- DROP POLICY IF EXISTS attractions_delete ON public.attractions;
-- CREATE POLICY attractions_delete ON public.attractions FOR DELETE USING (
--   (created_by_workspace_id = public.get_current_user_workspace())
--   OR ((created_by_workspace_id IS NULL) AND EXISTS (
--     SELECT 1 FROM public.employees e JOIN public.role_capabilities rc ON rc.role_id = e.role_id
--     WHERE e.user_id = (SELECT auth.uid()) AND rc.capability_code = 'shared_data.attractions.write' AND rc.enabled = true)));
-- -- hotels / restaurants 同 pattern（capability 換 shared_data.hotels.write / shared_data.restaurants.write）
-- COMMIT;
