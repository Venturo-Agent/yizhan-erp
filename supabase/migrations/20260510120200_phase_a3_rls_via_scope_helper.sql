-- ─────────────────────────────────────────────────────────────────────────────
-- Phase A3: RLS 全部改走 scope_visible / is_row_editable helper
--
-- 目的：把 7 張核心業務表的 RLS policy 統一改走 A2 的 helper function、
--   清掉所有 `OR is_super_admin()` admin bypass、達成 William 拍板規則
--   「沒有這種東西、老闆也要看有沒有權限」。
--
-- 影響範圍（7 張表）：
--   tours / orders / payment_requests / receipts / disbursement_orders /
--   quotes / order_members
--
-- 規則對照：
--   SELECT  → scope_visible(module, id)
--   INSERT  → workspace 守門（capability 由 application 端 require-capability 守）
--   UPDATE  → scope_visible AND is_row_editable（可看 + 狀態能改、雙守門）
--   DELETE  → scope_visible AND is_row_editable（同 UPDATE）
--
-- ⚠️ 紅線檢核（CLAUDE.md 紅線 A）：
--   - 動 RLS migration 前必跑 tests/e2e/login-api.spec.ts
--   - 4/20 出過事故：RLS 動完所有人登不進來
--   - 這條 migration 不動 workspaces 表（紅線 A 守住）、登入流程理論上不受影響
--   - 但仍建議 apply 後立刻跑 login-api.spec.ts 驗證
--
-- 動態 drop policy：避免不知道既有 policy name、用 pg_policies 撈表後逐一 drop
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- ═════════════════════════════════════════════════════════════════════════════
-- helper：動態 drop 一張表所有 policy
-- ═════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION pg_temp.drop_all_policies(p_table TEXT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = p_table
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, p_table);
    RAISE NOTICE '  ↳ dropped policy %.%', p_table, r.policyname;
  END LOOP;
END;
$$;

-- ═════════════════════════════════════════════════════════════════════════════
-- 1. tours（旅遊團）— id TEXT
-- ═════════════════════════════════════════════════════════════════════════════

SELECT pg_temp.drop_all_policies('tours');

ALTER TABLE public.tours ENABLE ROW LEVEL SECURITY;

CREATE POLICY tours_select ON public.tours FOR SELECT
  TO authenticated
  USING (public.scope_visible('tours', id));

CREATE POLICY tours_insert ON public.tours FOR INSERT
  TO authenticated
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.employees WHERE user_id = auth.uid()
    )
  );

CREATE POLICY tours_update ON public.tours FOR UPDATE
  TO authenticated
  USING (
    public.scope_visible('tours', id)
    AND public.is_row_editable('tours', id)
  )
  WITH CHECK (
    public.scope_visible('tours', id)
    AND public.is_row_editable('tours', id)
  );

CREATE POLICY tours_delete ON public.tours FOR DELETE
  TO authenticated
  USING (
    public.scope_visible('tours', id)
    AND public.is_row_editable('tours', id)
  );

-- ═════════════════════════════════════════════════════════════════════════════
-- 2. orders（訂單）— id TEXT
-- ═════════════════════════════════════════════════════════════════════════════

SELECT pg_temp.drop_all_policies('orders');

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY orders_select ON public.orders FOR SELECT
  TO authenticated
  USING (public.scope_visible('orders', id));

CREATE POLICY orders_insert ON public.orders FOR INSERT
  TO authenticated
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.employees WHERE user_id = auth.uid()
    )
  );

CREATE POLICY orders_update ON public.orders FOR UPDATE
  TO authenticated
  USING (
    public.scope_visible('orders', id)
    AND public.is_row_editable('orders', id)
  )
  WITH CHECK (
    public.scope_visible('orders', id)
    AND public.is_row_editable('orders', id)
  );

CREATE POLICY orders_delete ON public.orders FOR DELETE
  TO authenticated
  USING (
    public.scope_visible('orders', id)
    AND public.is_row_editable('orders', id)
  );

-- ═════════════════════════════════════════════════════════════════════════════
-- 3. payment_requests（請款單）— id UUID
-- ═════════════════════════════════════════════════════════════════════════════

SELECT pg_temp.drop_all_policies('payment_requests');

ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY payment_requests_select ON public.payment_requests FOR SELECT
  TO authenticated
  USING (public.scope_visible('payment_requests', id::TEXT));

CREATE POLICY payment_requests_insert ON public.payment_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.employees WHERE user_id = auth.uid()
    )
  );

CREATE POLICY payment_requests_update ON public.payment_requests FOR UPDATE
  TO authenticated
  USING (
    public.scope_visible('payment_requests', id::TEXT)
    AND public.is_row_editable('payment_requests', id::TEXT)
  )
  WITH CHECK (
    public.scope_visible('payment_requests', id::TEXT)
    AND public.is_row_editable('payment_requests', id::TEXT)
  );

CREATE POLICY payment_requests_delete ON public.payment_requests FOR DELETE
  TO authenticated
  USING (
    public.scope_visible('payment_requests', id::TEXT)
    AND public.is_row_editable('payment_requests', id::TEXT)
  );

-- ═════════════════════════════════════════════════════════════════════════════
-- 4. receipts（收款）— id UUID
-- ═════════════════════════════════════════════════════════════════════════════

SELECT pg_temp.drop_all_policies('receipts');

ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY receipts_select ON public.receipts FOR SELECT
  TO authenticated
  USING (public.scope_visible('receipts', id::TEXT));

CREATE POLICY receipts_insert ON public.receipts FOR INSERT
  TO authenticated
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.employees WHERE user_id = auth.uid()
    )
  );

CREATE POLICY receipts_update ON public.receipts FOR UPDATE
  TO authenticated
  USING (
    public.scope_visible('receipts', id::TEXT)
    AND public.is_row_editable('receipts', id::TEXT)
  )
  WITH CHECK (
    public.scope_visible('receipts', id::TEXT)
    AND public.is_row_editable('receipts', id::TEXT)
  );

CREATE POLICY receipts_delete ON public.receipts FOR DELETE
  TO authenticated
  USING (
    public.scope_visible('receipts', id::TEXT)
    AND public.is_row_editable('receipts', id::TEXT)
  );

-- ═════════════════════════════════════════════════════════════════════════════
-- 5. disbursement_orders（出納單）— id UUID
-- ═════════════════════════════════════════════════════════════════════════════
-- 注意：disbursement_orders 沒有 workspace_id 欄位（透過 payment_request_id 關聯）
-- INSERT 守門：必須對應的 payment_request 是同 workspace

SELECT pg_temp.drop_all_policies('disbursement_orders');

ALTER TABLE public.disbursement_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY disbursement_orders_select ON public.disbursement_orders FOR SELECT
  TO authenticated
  USING (public.scope_visible('disbursement_orders', id::TEXT));

CREATE POLICY disbursement_orders_insert ON public.disbursement_orders FOR INSERT
  TO authenticated
  WITH CHECK (
    payment_request_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.payment_requests pr
      WHERE pr.id = payment_request_id
        AND pr.workspace_id IN (
          SELECT workspace_id FROM public.employees WHERE user_id = auth.uid()
        )
    )
  );

CREATE POLICY disbursement_orders_update ON public.disbursement_orders FOR UPDATE
  TO authenticated
  USING (
    public.scope_visible('disbursement_orders', id::TEXT)
    AND public.is_row_editable('disbursement_orders', id::TEXT)
  )
  WITH CHECK (
    public.scope_visible('disbursement_orders', id::TEXT)
    AND public.is_row_editable('disbursement_orders', id::TEXT)
  );

CREATE POLICY disbursement_orders_delete ON public.disbursement_orders FOR DELETE
  TO authenticated
  USING (
    public.scope_visible('disbursement_orders', id::TEXT)
    AND public.is_row_editable('disbursement_orders', id::TEXT)
  );

-- ═════════════════════════════════════════════════════════════════════════════
-- 6. quotes（報價單）— id TEXT
-- ═════════════════════════════════════════════════════════════════════════════

SELECT pg_temp.drop_all_policies('quotes');

ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY quotes_select ON public.quotes FOR SELECT
  TO authenticated
  USING (public.scope_visible('quotes', id));

CREATE POLICY quotes_insert ON public.quotes FOR INSERT
  TO authenticated
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.employees WHERE user_id = auth.uid()
    )
  );

CREATE POLICY quotes_update ON public.quotes FOR UPDATE
  TO authenticated
  USING (
    public.scope_visible('quotes', id)
    AND public.is_row_editable('quotes', id)
  )
  WITH CHECK (
    public.scope_visible('quotes', id)
    AND public.is_row_editable('quotes', id)
  );

CREATE POLICY quotes_delete ON public.quotes FOR DELETE
  TO authenticated
  USING (
    public.scope_visible('quotes', id)
    AND public.is_row_editable('quotes', id)
  );

-- ═════════════════════════════════════════════════════════════════════════════
-- 7. order_members（團員 — 綁訂單）— id TEXT
-- ═════════════════════════════════════════════════════════════════════════════
-- 注意：order_members 沒 workspace_id 欄位、INSERT 守門靠對應 order 的 workspace

SELECT pg_temp.drop_all_policies('order_members');

ALTER TABLE public.order_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY order_members_select ON public.order_members FOR SELECT
  TO authenticated
  USING (public.scope_visible('order_members', id));

CREATE POLICY order_members_insert ON public.order_members FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id
        AND o.workspace_id IN (
          SELECT workspace_id FROM public.employees WHERE user_id = auth.uid()
        )
    )
  );

CREATE POLICY order_members_update ON public.order_members FOR UPDATE
  TO authenticated
  USING (
    public.scope_visible('order_members', id)
    AND public.is_row_editable('order_members', id)
  )
  WITH CHECK (
    public.scope_visible('order_members', id)
    AND public.is_row_editable('order_members', id)
  );

CREATE POLICY order_members_delete ON public.order_members FOR DELETE
  TO authenticated
  USING (
    public.scope_visible('order_members', id)
    AND public.is_row_editable('order_members', id)
  );

-- ═════════════════════════════════════════════════════════════════════════════
-- 完工提示
-- ═════════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
  RAISE NOTICE '════════════════════════════════════════════════════════════';
  RAISE NOTICE '✓ Phase A3 完成：7 張表 RLS 全部改走 scope_visible / is_row_editable';
  RAISE NOTICE '✓ admin bypass (OR is_super_admin) 已清空';
  RAISE NOTICE '⚠️  apply 後必跑 tests/e2e/login-api.spec.ts 驗證登入流程不受影響';
  RAISE NOTICE '════════════════════════════════════════════════════════════';
END $$;

COMMIT;
