-- ─────────────────────────────────────────────────────────────────────────────
-- 出納單品項級重構 Phase 4：出帳完成 → 自動產生手續費請款單
-- 2026-05-14 William 拍板「回歸到對應的旅遊團中」（spec 卡）
--
-- 流程：
--   1. disbursement_orders.status 從別的變 'paid'（出帳完成）
--   2. AFTER UPDATE trigger 觸發
--   3. 找該 disbursement 所有 disbursement_order_items where has_cross_bank_fee=true
--   4. 按 payment_request_item.tour_id 分組（同 tour 一張手續費請款單）
--   5. 每組 INSERT 一張新 payment_request
--      • expense_type = 'bank_fee'
--      • status = 'paid'（直接 billed、不走出帳避免循環）
--      • tour_id = 對應 tour
--   6. 對應 payment_request_items 也建一筆「手續費」item
--
-- 歸屬：tour 成本（按 William 訊息「回歸到對應的旅遊團中」）
-- 若之後改成公司成本、改 trigger 內 tour_id = NULL + expense_type='company_bank_fee'
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

CREATE OR REPLACE FUNCTION public.generate_bank_fee_requests_on_disbursement_paid()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tour_id UUID;
  v_total_fee NUMERIC;
  v_new_request_id UUID;
  v_workspace_id UUID;
  v_disbursement_code TEXT;
BEGIN
  -- 只在 status: !paid → paid 觸發
  IF NEW.status <> 'paid' OR (OLD.status IS NOT DISTINCT FROM NEW.status) THEN
    RETURN NEW;
  END IF;

  v_workspace_id := NEW.workspace_id;
  v_disbursement_code := COALESCE(NEW.code, NEW.order_number, NEW.id::TEXT);

  -- 找該 disbursement 內所有跨行品項、按 tour_id 分組
  FOR v_tour_id, v_total_fee IN
    SELECT
      pri.tour_id,
      SUM(doi.fee_amount) AS total_fee
    FROM public.disbursement_order_items doi
    JOIN public.payment_request_items pri ON pri.id = doi.payment_request_item_id
    WHERE doi.disbursement_order_id = NEW.id
      AND doi.has_cross_bank_fee = TRUE
      AND doi.fee_amount > 0
    GROUP BY pri.tour_id
  LOOP
    -- 一張新手續費請款單（按 tour 一張）
    INSERT INTO public.payment_requests (
      workspace_id,
      tour_id,
      code,
      request_date,
      request_type,
      request_category,
      expense_type,
      amount,
      status,
      notes,
      created_by_name
    ) VALUES (
      v_workspace_id,
      v_tour_id,
      v_disbursement_code || '-BANKFEE-' || COALESCE(v_tour_id::TEXT, 'NOTOUR'),
      COALESCE(NEW.disbursement_date, CURRENT_DATE),
      'bank_fee',
      'tour',
      'bank_fee',
      v_total_fee,
      'paid',  -- 直接 paid、不再走出帳避免循環
      '自動產生：出納單 ' || v_disbursement_code || ' 跨行手續費',
      '系統自動'
    )
    RETURNING id INTO v_new_request_id;

    -- 對應的請款品項
    INSERT INTO public.payment_request_items (
      request_id,
      workspace_id,
      tour_id,
      description,
      category,
      quantity,
      unit_price,
      subtotal,
      sort_order,
      item_number
    ) VALUES (
      v_new_request_id,
      v_workspace_id,
      v_tour_id,
      '跨行手續費 (' || v_disbursement_code || ')',
      'bank_fee',
      1,
      v_total_fee,
      v_total_fee,
      1,
      v_new_request_id::TEXT || '-1'
    );
  END LOOP;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.generate_bank_fee_requests_on_disbursement_paid() IS
  'Phase 4: disbursement_orders.status → paid 時、自動建手續費 payment_request 回對應 tour。
   按 tour 分組（一個 tour 一張）、status 直接 paid 避免循環。
   William 2026-05-14 拍板。';

-- attach trigger
DROP TRIGGER IF EXISTS trg_disbursement_paid_generate_bank_fee ON public.disbursement_orders;
CREATE TRIGGER trg_disbursement_paid_generate_bank_fee
  AFTER UPDATE OF status ON public.disbursement_orders
  FOR EACH ROW EXECUTE FUNCTION public.generate_bank_fee_requests_on_disbursement_paid();

-- 驗證
DO $$
BEGIN
  RAISE NOTICE '✓ generate_bank_fee_requests_on_disbursement_paid() function 建好';
  RAISE NOTICE '✓ trg_disbursement_paid_generate_bank_fee trigger 掛 disbursement_orders.status UPDATE';
  RAISE NOTICE '邏輯：status → paid 時、按 tour 分組建手續費 payment_request';
END $$;

COMMIT;

-- ════ Rollback ════
-- BEGIN;
-- DROP TRIGGER IF EXISTS trg_disbursement_paid_generate_bank_fee ON public.disbursement_orders;
-- DROP FUNCTION IF EXISTS public.generate_bank_fee_requests_on_disbursement_paid();
-- COMMIT;
