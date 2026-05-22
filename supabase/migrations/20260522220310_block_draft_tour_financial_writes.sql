-- 2026-05-22 阻擋 template/proposal 團開收款 / 請款（DB 層守門）
--
-- 【為什麼】
-- 業務規則：模板（template）跟提案（proposal）狀態的旅遊團不能開財務單據。
-- 既有 client 端守門（usePaymentForm / useReceiptMutations / payment-request.service）
-- 都可能被繞過（直接 SQL / 其他 client）、DB trigger 是最後一道保險。
--
-- 譬喻：飯店櫃台口頭拒絕報價單客人開帳單還不夠、保險庫也得鎖、有人翻牆也進不去。
--
-- 【守門範圍】
-- 1. receipts INSERT — 若 tour_id 指向 template/proposal、reject
-- 2. payment_requests INSERT — 同上
--
-- 【不擋 UPDATE】
-- 已存在的單據若團 status 變回 proposal（理論不應發生）、不影響舊單。
-- 只擋新建。

BEGIN;

CREATE OR REPLACE FUNCTION public.assert_tour_active_for_financial_doc()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_status text;
BEGIN
  IF NEW.tour_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT status INTO v_status FROM public.tours WHERE id = NEW.tour_id;

  IF v_status IN ('template', 'proposal') THEN
    RAISE EXCEPTION '提案 / 模板狀態的旅遊團不可開立財務單據（tour_id=%, status=%）', NEW.tour_id, v_status
      USING ERRCODE = '23514';  -- check_violation
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_receipts_assert_tour_active ON public.receipts;
CREATE TRIGGER trg_receipts_assert_tour_active
  BEFORE INSERT ON public.receipts
  FOR EACH ROW
  EXECUTE FUNCTION public.assert_tour_active_for_financial_doc();

DROP TRIGGER IF EXISTS trg_payment_requests_assert_tour_active ON public.payment_requests;
CREATE TRIGGER trg_payment_requests_assert_tour_active
  BEFORE INSERT ON public.payment_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.assert_tour_active_for_financial_doc();

COMMIT;

-- ════ Rollback（萬一爆炸、複製貼上跑）════
-- BEGIN;
-- DROP TRIGGER IF EXISTS trg_receipts_assert_tour_active ON public.receipts;
-- DROP TRIGGER IF EXISTS trg_payment_requests_assert_tour_active ON public.payment_requests;
-- DROP FUNCTION IF EXISTS public.assert_tour_active_for_financial_doc();
-- COMMIT;
