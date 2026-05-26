-- ════════════════════════════════════════════════════════════════════
-- 出納拆單（partial billing）產生「正常序號請款單」、補單號 + 分公司
-- ════════════════════════════════════════════════════════════════════
-- 為什麼改：
--   出納單只勾部分品項出帳時、fork_payment_request_for_partial_billing 會把
--   被勾品項撕成一張新請款單。舊版有三個問題：
--     1. 新單 code 用「原單 code + -FORK-N」（如 RMQ260521A-I01-FORK-1）、
--        不是正常序號、看起來像亂碼（William 2026-05-26 反映）
--     2. request_number 寫死 NULL（其他單是 request_number = code）
--     3. branch_id 沒抄（害新單「備註分公司」空白）
--
--   改法：依 request_category 分流產生正常序號
--     團體請款 → generate_request_no(tour_code)            → 團號-I{NN}
--     公司請款 → generate_company_payment_request_code(...) → TYPE-YYYYMM-NNN
--   並補 request_number = 新 code、branch_id 從原單複製。
--
--   函式簽名不變（p_request_id, p_item_ids, p_actor_id）、呼叫端
--   （/api/disbursement/[id]、/api/disbursement/batch-create）不用改。
--
-- 既有資料：上線前全系統只有 1 張 -FORK- 單、已手動扶正為 RMQ260521A-I03
--   （補單號 + 分公司）、此 migration 後不再產生新的 -FORK- 單。
-- ════════════════════════════════════════════════════════════════════

BEGIN;

CREATE OR REPLACE FUNCTION public.fork_payment_request_for_partial_billing(
  p_request_id uuid,
  p_item_ids uuid[],
  p_actor_id uuid DEFAULT NULL::uuid
)
 RETURNS uuid
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_new_request_id UUID;
  v_original RECORD;
  v_new_code TEXT;
BEGIN
  -- 取原請款單
  SELECT * INTO v_original FROM public.payment_requests WHERE id = p_request_id;
  IF v_original IS NULL THEN
    RAISE EXCEPTION 'Source payment_request % not found', p_request_id;
  END IF;

  -- 產生正常序號（依團體/公司分流；各自 advisory lock 防撞號）
  IF v_original.request_category = 'company' THEN
    v_new_code := public.generate_company_payment_request_code(
      v_original.workspace_id,
      v_original.expense_type,
      v_original.request_date
    );
  ELSE
    v_new_code := public.generate_request_no(v_original.tour_code);
  END IF;

  -- 建新請款單（複製 metadata、補 request_number + branch_id、不複製 items）
  INSERT INTO public.payment_requests (
    workspace_id, tour_id, code, request_number, tour_code, tour_name,
    order_id, order_number, request_date, request_type, request_category,
    supplier_id, supplier_name, expense_type, notes,
    is_special_billing, status, branch_id,
    created_by, created_by_name, payment_method_id,
    amount  -- 預設 0、等 items 搬完再算
  )
  SELECT
    workspace_id, tour_id, v_new_code, v_new_code, tour_code, tour_name,
    order_id, order_number, request_date, request_type, request_category,
    supplier_id, supplier_name, expense_type, notes,
    is_special_billing, status, branch_id,
    COALESCE(p_actor_id, created_by), created_by_name, payment_method_id,
    0
  FROM public.payment_requests WHERE id = p_request_id
  RETURNING id INTO v_new_request_id;

  -- 移動指定品項到新請款單
  UPDATE public.payment_request_items
  SET request_id = v_new_request_id
  WHERE id = ANY(p_item_ids);

  -- 重算兩張請款單的 amount + total_amount
  UPDATE public.payment_requests
  SET
    amount = COALESCE((SELECT SUM(subtotal) FROM public.payment_request_items WHERE request_id = p_request_id), 0),
    total_amount = COALESCE((SELECT SUM(subtotal) FROM public.payment_request_items WHERE request_id = p_request_id), 0)
  WHERE id = p_request_id;

  UPDATE public.payment_requests
  SET
    amount = COALESCE((SELECT SUM(subtotal) FROM public.payment_request_items WHERE request_id = v_new_request_id), 0),
    total_amount = COALESCE((SELECT SUM(subtotal) FROM public.payment_request_items WHERE request_id = v_new_request_id), 0)
  WHERE id = v_new_request_id;

  RETURN v_new_request_id;
END;
$function$;

COMMIT;

-- ════ Rollback（萬一要回到舊的 -FORK- 行為、複製貼上跑）════
-- BEGIN;
-- CREATE OR REPLACE FUNCTION public.fork_payment_request_for_partial_billing(
--   p_request_id uuid, p_item_ids uuid[], p_actor_id uuid DEFAULT NULL::uuid
-- ) RETURNS uuid LANGUAGE plpgsql AS $function$
-- DECLARE
--   v_new_request_id UUID; v_original RECORD; v_existing_fork_count INT; v_new_code TEXT;
-- BEGIN
--   SELECT * INTO v_original FROM public.payment_requests WHERE id = p_request_id;
--   IF v_original IS NULL THEN RAISE EXCEPTION 'Source payment_request % not found', p_request_id; END IF;
--   SELECT COUNT(*) INTO v_existing_fork_count FROM public.payment_requests WHERE code LIKE v_original.code || '-FORK-%';
--   v_new_code := v_original.code || '-FORK-' || (v_existing_fork_count + 1)::TEXT;
--   INSERT INTO public.payment_requests (
--     workspace_id, tour_id, code, request_number, tour_code, tour_name,
--     order_id, order_number, request_date, request_type, request_category,
--     supplier_id, supplier_name, expense_type, notes, is_special_billing, status,
--     created_by, created_by_name, payment_method_id, amount)
--   SELECT workspace_id, tour_id, v_new_code, NULL, tour_code, tour_name,
--     order_id, order_number, request_date, request_type, request_category,
--     supplier_id, supplier_name, expense_type, notes, is_special_billing, status,
--     COALESCE(p_actor_id, created_by), created_by_name, payment_method_id, 0
--   FROM public.payment_requests WHERE id = p_request_id RETURNING id INTO v_new_request_id;
--   UPDATE public.payment_request_items SET request_id = v_new_request_id WHERE id = ANY(p_item_ids);
--   UPDATE public.payment_requests SET amount = COALESCE((SELECT SUM(subtotal) FROM public.payment_request_items WHERE request_id = p_request_id), 0),
--     total_amount = COALESCE((SELECT SUM(subtotal) FROM public.payment_request_items WHERE request_id = p_request_id), 0) WHERE id = p_request_id;
--   UPDATE public.payment_requests SET amount = COALESCE((SELECT SUM(subtotal) FROM public.payment_request_items WHERE request_id = v_new_request_id), 0),
--     total_amount = COALESCE((SELECT SUM(subtotal) FROM public.payment_request_items WHERE request_id = v_new_request_id), 0) WHERE id = v_new_request_id;
--   RETURN v_new_request_id;
-- END; $function$;
-- COMMIT;
