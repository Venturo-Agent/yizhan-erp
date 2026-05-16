-- ─────────────────────────────────────────────────────────────────────────────
-- 修復 payment_request_items FORCE RLS + 0 policy 漏洞
--
-- 背景：
--   B5 production snapshot 發現 payment_request_items 是 FORCE RLS + 0 policy。
--   意思：所有 user（含 service_role）都無法寫。
--   1437 rows 已存在（FORCE 之前進的）、但目前 frontend 2 處寫入會炸：
--   - payment-request.service.ts:377 DELETE
--   - AddRequestDialog.tsx:511 INSERT
--
--   schema：無 workspace_id 欄位、透過 request_id → payment_requests.workspace_id 對應。
--
-- 修法：
--   1. 加 4 條 policy（透過 payment_request join）
--   2. 解除 FORCE（admin client 不被擋、normal user 經 policy）
--
-- 風險：
--   - payment_requests RLS 已正確（Phase A3 改過）、本表 inherit 那層 scope
--   - 加 policy 不破現有 row、不刪資料
--   - 解 FORCE 讓 admin scripts 可以動、降低風險
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- 解 FORCE
ALTER TABLE public.payment_request_items NO FORCE ROW LEVEL SECURITY;

-- 加 4 條 policy：透過 request_id 對應 payment_request 的 scope
CREATE POLICY payment_request_items_select ON public.payment_request_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.payment_requests pr
      WHERE pr.id = payment_request_items.request_id
        AND public.scope_visible('payment_requests', pr.id::TEXT)
    )
  );

CREATE POLICY payment_request_items_insert ON public.payment_request_items
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.payment_requests pr
      WHERE pr.id = payment_request_items.request_id
        AND pr.workspace_id IN (SELECT workspace_id FROM public.employees WHERE user_id = auth.uid())
    )
  );

CREATE POLICY payment_request_items_update ON public.payment_request_items
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.payment_requests pr
      WHERE pr.id = payment_request_items.request_id
        AND public.scope_visible('payment_requests', pr.id::TEXT)
        AND public.is_row_editable('payment_requests', pr.id::TEXT)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.payment_requests pr
      WHERE pr.id = payment_request_items.request_id
        AND public.scope_visible('payment_requests', pr.id::TEXT)
        AND public.is_row_editable('payment_requests', pr.id::TEXT)
    )
  );

CREATE POLICY payment_request_items_delete ON public.payment_request_items
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.payment_requests pr
      WHERE pr.id = payment_request_items.request_id
        AND public.scope_visible('payment_requests', pr.id::TEXT)
        AND public.is_row_editable('payment_requests', pr.id::TEXT)
    )
  );

-- 驗證
DO $$
DECLARE
  v_force BOOLEAN;
  v_policies INT;
BEGIN
  SELECT relforcerowsecurity INTO v_force FROM pg_class WHERE oid='public.payment_request_items'::regclass;
  SELECT count(*) INTO v_policies FROM pg_policies WHERE schemaname='public' AND tablename='payment_request_items';

  IF v_force THEN RAISE EXCEPTION 'FORCE 沒解'; END IF;
  IF v_policies <> 4 THEN RAISE EXCEPTION 'policy 數量 = %、預期 4', v_policies; END IF;

  RAISE NOTICE '✓ payment_request_items：FORCE 解除、4 條 policy 已建';
END $$;

COMMIT;
