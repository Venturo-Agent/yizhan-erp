-- ════════════════════════════════════════════════════════════════════════════
-- 修 fork_payment_request_for_partial_billing RPC、補 total_amount 同步邏輯
-- spec: Logan-Workspace/2026-05-15-出納單完整重構-spec.md
--
-- 為什麼：
--   5/14 phase 1 migration 加的 fork RPC 只 UPDATE 兩張 PR 的 amount、漏 total_amount。
--   UI 列表 / dialog 讀 total_amount、user 看到「總金額 NT$ 0」但實際 items 對。
--   2026-05-15 跑 SQL 修了 4 筆殘留資料（amount 同步進 total_amount）、
--   這份 migration 修 RPC 確保未來不再復發。
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

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

  -- 重算兩張請款單的 amount + total_amount（2026-05-15 fix：補 total_amount 同步）
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
$$;

COMMENT ON FUNCTION public.fork_payment_request_for_partial_billing(UUID, UUID[], UUID) IS
  'Partial 出帳時 fork 新請款單。
   用法：取 p_item_ids 那些品項從 p_request_id 移到新請款單、回傳新 id。
   原 request 留剩下的品項、amount + total_amount 自動重算同步（2026-05-15 修 total_amount 漏同步 bug）。
   業務語意：每張請款單最終「同一 status」、不允許 partial。';

NOTIFY pgrst, 'reload schema';

COMMIT;

-- ════════ Rollback（萬一爆炸、回 5/14 舊版）════════
-- BEGIN;
-- CREATE OR REPLACE FUNCTION public.fork_payment_request_for_partial_billing(...) [5/14 舊版本];
-- 從 supabase/migrations/20260514060000_disbursement_item_level_phase1.sql 內 line 56-120 複製
-- COMMIT;
