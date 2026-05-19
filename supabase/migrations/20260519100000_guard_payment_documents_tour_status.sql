-- ════════════════════════════════════════════════════════════════
-- 目的：守門「提案/模板狀態的旅遊團不可開立請款單 / 收款單」
-- ════════════════════════════════════════════════════════════════
--
-- 業務規則：
-- - 旅遊團狀態 = 'proposal'（提案）或 'template'（模板）= 還沒成團 / 只是樣板
-- - 這兩種狀態下、不該對該團開立任何財務單據
-- - 譬喻：飯店不對「報價單客人」或「房型範本」開帳單
--
-- 過去問題：
-- - UI 層有 filter 排除 proposal/template（usePaymentForm.ts:37）
-- - 但 API 層 + DB 層都沒守、繞過 UI 直接 INSERT 就能污染資料
-- - 目前 production 0 筆髒資料（運氣好）、但是潛在資安洞
--
-- 守門範圍：
-- - receipts.tour_id 不為 NULL 時、查 tour.status、若 ∈ {proposal, template} reject
-- - payment_requests.tour_id 不為 NULL 時、同上
-- - tour_id 為 NULL（公司請款、不綁團）= 不檢查、放行
-- - disbursement_orders 沒有 tour_id 欄位、透過 payment_requests 已被擋
--
-- 業務脈絡：地方法律 6 層架構 L4「狀態守門」、紅線 E「DB 層守門」
-- ════════════════════════════════════════════════════════════════

BEGIN;

-- ── 1. trigger function：檢查 tour status ─────────────────────────
CREATE OR REPLACE FUNCTION public.guard_payment_doc_tour_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tour_status text;
BEGIN
  -- 沒帶 tour_id（公司請款 case）= 放行
  IF NEW.tour_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- 查 tour status
  SELECT status INTO v_tour_status
  FROM public.tours
  WHERE id = NEW.tour_id;

  -- tour 不存在 = 放行（其他 FK constraint 會擋）
  IF v_tour_status IS NULL THEN
    RETURN NEW;
  END IF;

  -- 守門：proposal / template 不准開財務單據
  IF v_tour_status IN ('proposal', 'template') THEN
    RAISE EXCEPTION '提案 / 模板狀態的旅遊團不可開立此單據（tour_id=%, status=%）、請先將提案轉為正式團',
      NEW.tour_id, v_tour_status
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.guard_payment_doc_tour_status() IS
  '守門：proposal/template 狀態的旅遊團不可開立 receipts / payment_requests 單據。tour_id IS NULL 放行（公司請款）。';

-- ── 2. 掛到 receipts 表 ────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_receipts_guard_tour_status ON public.receipts;
CREATE TRIGGER trg_receipts_guard_tour_status
  BEFORE INSERT OR UPDATE OF tour_id ON public.receipts
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_payment_doc_tour_status();

-- ── 3. 掛到 payment_requests 表 ──────────────────────────────────
DROP TRIGGER IF EXISTS trg_payment_requests_guard_tour_status ON public.payment_requests;
CREATE TRIGGER trg_payment_requests_guard_tour_status
  BEFORE INSERT OR UPDATE OF tour_id ON public.payment_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_payment_doc_tour_status();

COMMIT;

-- ════════════════════════════════════════════════════════════════
-- Rollback（萬一爆炸、複製貼上跑）
-- ════════════════════════════════════════════════════════════════
-- BEGIN;
-- DROP TRIGGER IF EXISTS trg_receipts_guard_tour_status ON public.receipts;
-- DROP TRIGGER IF EXISTS trg_payment_requests_guard_tour_status ON public.payment_requests;
-- DROP FUNCTION IF EXISTS public.guard_payment_doc_tour_status();
-- COMMIT;
