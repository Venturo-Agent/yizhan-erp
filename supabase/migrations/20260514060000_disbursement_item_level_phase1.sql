-- ─────────────────────────────────────────────────────────────────────────────
-- 出納單品項級重構 Phase 1：Schema + Fork SQL Function
-- 2026-05-14 William 拍板（spec 卡 2026-05-14-出納單品項級重構-spec.md）
--
-- 改動：
--   A. 新表 disbursement_order_items（品項級 link）
--   B. disbursement_orders 加 total_fee + batch_uuid（bank_account_id 已有、不加）
--   C. fork_payment_request_for_partial_billing function
--   D. RLS policies for disbursement_order_items
--
-- 不動：
--   - payment_requests.disbursement_order_id（舊 link 保留、雙軌 transition）
--   - 其他舊資料（Phase 5 才考慮 migrate）
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- ════ A. 新表 disbursement_order_items ════
CREATE TABLE IF NOT EXISTS public.disbursement_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  disbursement_order_id UUID NOT NULL REFERENCES public.disbursement_orders(id) ON DELETE CASCADE,
  payment_request_item_id UUID NOT NULL REFERENCES public.payment_request_items(id),
  -- snapshot 欄位（避免 source 改了不一致、報表能回看當下狀態）
  amount NUMERIC NOT NULL,
  supplier_bank_code TEXT,            -- 供應商銀行（snapshot、用於回看是否跨行）
  fee_amount NUMERIC DEFAULT 0,       -- 該品項分攤的手續費
  has_cross_bank_fee BOOLEAN DEFAULT FALSE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.employees(id),
  -- 一個品項不能同時在 2 張出納單（race condition 防呆）
  CONSTRAINT uniq_payment_request_item_in_disbursement UNIQUE (payment_request_item_id)
);

CREATE INDEX IF NOT EXISTS idx_doi_disbursement ON public.disbursement_order_items(disbursement_order_id);
CREATE INDEX IF NOT EXISTS idx_doi_item ON public.disbursement_order_items(payment_request_item_id);
CREATE INDEX IF NOT EXISTS idx_doi_workspace ON public.disbursement_order_items(workspace_id);

COMMENT ON TABLE public.disbursement_order_items IS
  '出納單品項 link（取代 payment_requests.disbursement_order_id 的請款單級 link）。
   2026-05-14 William 拍板：手續費要按品項算、必須拆到品項級。';

-- ════ B. disbursement_orders 加 total_fee + batch_uuid ════
-- bank_account_id 已存在（公司出帳帳戶）、不需要新增
ALTER TABLE public.disbursement_orders
  ADD COLUMN IF NOT EXISTS total_fee NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS batch_uuid UUID;

COMMENT ON COLUMN public.disbursement_orders.total_fee IS
  '該出納單的總手續費（跨行手續費總和、user 在預覽 step 填）';
COMMENT ON COLUMN public.disbursement_orders.batch_uuid IS
  '多帳戶分批的 batch id、同 batch 一起預覽（譬如選了 5 筆走合庫 + 5 筆走國泰 = 同 batch 兩張 disbursement）';

-- ════ C. fork_payment_request_for_partial_billing function ════
-- 業務語意：每張請款單最終必須「同一 status」、partial 出帳 → fork 新單
-- 用法：service 在 disbursement 建立、決定某 request_id 的某些品項要走出帳時：
--   IF 品項 = request 的全部 → 直接出帳、不 fork
--   ELSE 出帳那部分 → fork 出新 request、原 request 留剩下的
CREATE OR REPLACE FUNCTION public.fork_payment_request_for_partial_billing(
  p_request_id UUID,
  p_item_ids UUID[],
  p_actor_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_new_request_id UUID;
  v_original RECORD;
  v_existing_fork_count INT;
  v_new_code TEXT;
BEGIN
  -- 取原請款單
  SELECT * INTO v_original FROM public.payment_requests WHERE id = p_request_id;
  IF v_original IS NULL THEN
    RAISE EXCEPTION 'Source payment_request % not found', p_request_id;
  END IF;

  -- 算 fork suffix（避免重複）
  SELECT COUNT(*) INTO v_existing_fork_count
  FROM public.payment_requests
  WHERE code LIKE v_original.code || '-FORK-%';
  v_new_code := v_original.code || '-FORK-' || (v_existing_fork_count + 1)::TEXT;

  -- 建新請款單（複製 metadata、不複製 items）
  INSERT INTO public.payment_requests (
    workspace_id, tour_id, code, request_number, tour_code, tour_name,
    order_id, order_number, request_date, request_type, request_category,
    supplier_id, supplier_name, expense_type, notes,
    is_special_billing, status,
    created_by, created_by_name, payment_method_id,
    amount  -- 預設 0、等 items 搬完再算
  )
  SELECT
    workspace_id, tour_id, v_new_code, NULL, tour_code, tour_name,
    order_id, order_number, request_date, request_type, request_category,
    supplier_id, supplier_name, expense_type, notes,
    is_special_billing, status,
    COALESCE(p_actor_id, created_by), created_by_name, payment_method_id,
    0
  FROM public.payment_requests WHERE id = p_request_id
  RETURNING id INTO v_new_request_id;

  -- 移動指定品項到新請款單
  UPDATE public.payment_request_items
  SET request_id = v_new_request_id
  WHERE id = ANY(p_item_ids);

  -- 重算兩張請款單的 amount
  UPDATE public.payment_requests SET amount = COALESCE((
    SELECT SUM(subtotal) FROM public.payment_request_items WHERE request_id = p_request_id
  ), 0) WHERE id = p_request_id;

  UPDATE public.payment_requests SET amount = COALESCE((
    SELECT SUM(subtotal) FROM public.payment_request_items WHERE request_id = v_new_request_id
  ), 0) WHERE id = v_new_request_id;

  RETURN v_new_request_id;
END;
$$;

COMMENT ON FUNCTION public.fork_payment_request_for_partial_billing(UUID, UUID[], UUID) IS
  'Partial 出帳時 fork 新請款單。
   用法：取 p_item_ids 那些品項從 p_request_id 移到新請款單、回傳新 id。
   原 request 留剩下的品項、amount 自動重算。
   業務語意：每張請款單最終「同一 status」、不允許 partial。';

-- ════ D. RLS policies for disbursement_order_items ════
ALTER TABLE public.disbursement_order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS doi_select ON public.disbursement_order_items;
CREATE POLICY doi_select ON public.disbursement_order_items
  FOR SELECT TO authenticated
  USING (workspace_id = public.get_current_user_workspace());

DROP POLICY IF EXISTS doi_insert ON public.disbursement_order_items;
CREATE POLICY doi_insert ON public.disbursement_order_items
  FOR INSERT TO authenticated
  WITH CHECK (workspace_id = public.get_current_user_workspace());

DROP POLICY IF EXISTS doi_update ON public.disbursement_order_items;
CREATE POLICY doi_update ON public.disbursement_order_items
  FOR UPDATE TO authenticated
  USING (workspace_id = public.get_current_user_workspace())
  WITH CHECK (workspace_id = public.get_current_user_workspace());

DROP POLICY IF EXISTS doi_delete ON public.disbursement_order_items;
CREATE POLICY doi_delete ON public.disbursement_order_items
  FOR DELETE TO authenticated
  USING (workspace_id = public.get_current_user_workspace());

-- ════ 驗證 ════
DO $$
DECLARE
  v_table_exists boolean;
  v_function_exists boolean;
BEGIN
  SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name='disbursement_order_items') INTO v_table_exists;
  SELECT EXISTS(SELECT 1 FROM pg_proc WHERE proname='fork_payment_request_for_partial_billing') INTO v_function_exists;

  IF NOT v_table_exists THEN RAISE EXCEPTION 'disbursement_order_items 建表失敗'; END IF;
  IF NOT v_function_exists THEN RAISE EXCEPTION 'fork function 建立失敗'; END IF;

  RAISE NOTICE '✓ disbursement_order_items 建好 + RLS policies';
  RAISE NOTICE '✓ disbursement_orders 加 total_fee + batch_uuid';
  RAISE NOTICE '✓ fork_payment_request_for_partial_billing function 建好';
END $$;

COMMIT;

-- ════ Rollback ════
-- BEGIN;
-- DROP FUNCTION IF EXISTS public.fork_payment_request_for_partial_billing(UUID, UUID[], UUID);
-- DROP TABLE IF EXISTS public.disbursement_order_items CASCADE;
-- ALTER TABLE public.disbursement_orders DROP COLUMN IF EXISTS total_fee;
-- ALTER TABLE public.disbursement_orders DROP COLUMN IF EXISTS batch_uuid;
-- COMMIT;
