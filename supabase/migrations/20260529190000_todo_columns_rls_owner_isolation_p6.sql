-- ─────────────────────────────────────────────────────────────────────────────
-- 代辦看板個人化 P6：todo_columns RLS 收緊成「個人隔離」
--
-- 寫於：2026-05-29
-- 對應：workspace/架構整理/2026-05-29-代辦看板個人化-spec.md（P6）
-- Why：欄位已改 per-user，但 RLS 還停在 workspace 級（同公司 DB 層互相可見）。
--   API 已過濾 owner=本人、但 RLS 是「繞過 App 直連 DB」的最後防線、應與 API 對齊。
--   退役舊 workspace 級 policy、換成「workspace（紅線 H）+ owner=本人」。
--
-- 註：舊共用欄（owner NULL）已於 P3 backfill 刪除、無殘留。
-- 紀律：P4 trigger / seed 走 SECURITY DEFINER / admin client、不受此 user RLS 影響。
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- 退役舊「同公司可見」policy
DROP POLICY IF EXISTS tc_all ON public.todo_columns;
DROP POLICY IF EXISTS tc_select ON public.todo_columns;

-- 新：個人隔離（先過 workspace、再過 owner=本人）。FOR ALL 涵蓋 select/insert/update/delete。
CREATE POLICY tc_owner ON public.todo_columns
  FOR ALL
  USING (
    workspace_id = get_current_user_workspace()
    AND owner_employee_id = get_current_employee_id()
  )
  WITH CHECK (
    workspace_id = get_current_user_workspace()
    AND owner_employee_id = get_current_employee_id()
  );

NOTIFY pgrst, 'reload schema';

COMMIT;

-- ════ Rollback（回到 workspace 級可見）════
-- BEGIN;
-- DROP POLICY IF EXISTS tc_owner ON public.todo_columns;
-- CREATE POLICY tc_all ON public.todo_columns FOR ALL
--   USING (workspace_id = get_current_user_workspace())
--   WITH CHECK (workspace_id = get_current_user_workspace());
-- CREATE POLICY tc_select ON public.todo_columns FOR SELECT
--   USING (workspace_id = get_current_user_workspace());
-- COMMIT;
