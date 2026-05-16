-- ════════════════════════════════════════════════════════════════════════════
-- 修 payment_request_items SELECT RLS 過嚴 bug
-- spec: Logan-Workspace/2026-05-15-bug-PR-detail-明細不見-handoff.md
--
-- Bug：
--   payment_requests SELECT 寬鬆（workspace 一致就看）
--   payment_request_items SELECT 用 scope_visible 嚴格（自己建 OR tour 同 scope）
--   結果 user 看得到 PR 但撈不到 items、明細 dialog 空白。
--
-- 修法：
--   把 items SELECT policy 對齊 parent PR SELECT policy（workspace 一致即可）
--   UPDATE / INSERT / DELETE policy 不動、維持嚴格（編輯仍要 scope_visible）。
--
-- 業務直覺：「我看得到請款單、就該看得到它的明細」。
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

DROP POLICY IF EXISTS payment_request_items_select ON public.payment_request_items;

CREATE POLICY payment_request_items_select ON public.payment_request_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.payment_requests pr
      WHERE pr.id = payment_request_items.request_id
        AND (pr.workspace_id IS NULL OR pr.workspace_id = public.get_current_user_workspace())
    )
  );

COMMENT ON POLICY payment_request_items_select ON public.payment_request_items IS
  '2026-05-15 修：SELECT 對齊 parent PR 的 workspace 規則、不再走 scope_visible 嚴格規則。
   UPDATE/INSERT/DELETE 維持 scope_visible + is_row_editable 嚴格、編輯不會破窗。';

NOTIFY pgrst, 'reload schema';

COMMIT;

-- ════════ Rollback（萬一爆炸、回 5/14 嚴格版）════════
-- BEGIN;
-- DROP POLICY IF EXISTS payment_request_items_select ON public.payment_request_items;
-- CREATE POLICY payment_request_items_select ON public.payment_request_items
--   FOR SELECT TO authenticated
--   USING (EXISTS (
--     SELECT 1 FROM public.payment_requests pr
--     WHERE pr.id = payment_request_items.request_id
--       AND public.scope_visible('payment_requests'::text, pr.id::text)
--   ));
-- NOTIFY pgrst, 'reload schema';
-- COMMIT;
