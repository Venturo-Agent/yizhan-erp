-- ============================================================================
-- 20260503200000_add_before_delete_locks.sql
--
-- 補完整 lock：BEFORE DELETE 分支
--
-- # 為什麼
-- 之前的 lock trigger 只擋 BEFORE UPDATE、不擋 BEFORE DELETE：
--   - enforce_disbursement_order_lock：paid 出納單可被刪、cascade trigger
--     只看 UPDATE 不觸發、子請款單留 billed 狀態卡死
--   - enforce_payment_request_lock：confirmed/billed/paid 請款單可被刪、
--     目前是因為 cascade 砍 items 時 items lock 拋例外才擋住、靠巧合不是設計
--
-- # 怎麼改
-- 1. enforce_disbursement_order_lock：BEFORE UPDATE → BEFORE UPDATE OR DELETE
--    - DELETE：if status=paid AND NOT super_admin → RAISE
-- 2. enforce_payment_request_lock：BEFORE UPDATE → BEFORE UPDATE OR DELETE
--    - DELETE：if status IN (confirmed,billed,paid) AND NOT super_admin → RAISE
-- 3. 兩者都跟 receipt_confirmed_immutable 一致：super_admin 可後門救資料
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. enforce_disbursement_order_lock：UPDATE + DELETE 都擋
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_disbursement_order_lock()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
AS $function$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status = 'paid' AND NOT public.is_super_admin() THEN
      RAISE EXCEPTION
        '出納單 % 已確認出帳（paid）、線下會計已入帳、不允許刪除（需平台管理資格）',
        OLD.code;
    END IF;
    RETURN OLD;
  END IF;

  -- UPDATE
  IF OLD.status = 'paid' THEN
    RAISE EXCEPTION
      '出納單 % 已確認出帳（paid）、生命週期結束、無法修改任何欄位。線下會計已入帳、系統不允許回朔。',
      OLD.code;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS disbursement_orders_enforce_lock ON public.disbursement_orders;
CREATE TRIGGER disbursement_orders_enforce_lock
  BEFORE UPDATE OR DELETE ON public.disbursement_orders
  FOR EACH ROW EXECUTE FUNCTION enforce_disbursement_order_lock();

-- ----------------------------------------------------------------------------
-- 2. enforce_payment_request_lock：UPDATE + DELETE 都擋
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_payment_request_lock()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
AS $function$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status IN ('confirmed', 'billed', 'paid') AND NOT public.is_super_admin() THEN
      RAISE EXCEPTION
        '請款單 % status=% 不允許刪除（需先解除確認、或擁有平台管理資格）',
        OLD.code, OLD.status;
    END IF;
    RETURN OLD;
  END IF;

  -- UPDATE
  IF OLD.status IN ('confirmed', 'billed', 'paid') THEN
    IF NEW.amount IS DISTINCT FROM OLD.amount THEN
      RAISE EXCEPTION
        '請款單 status=% 後不可修改金額（% → %）。請先解除確認（status 改回 pending）再編輯。',
        OLD.status, OLD.amount, NEW.amount;
    END IF;

    IF NEW.supplier_id IS DISTINCT FROM OLD.supplier_id THEN
      RAISE EXCEPTION '請款單 status=% 後不可修改供應商。請先解除確認。', OLD.status;
    END IF;

    IF NEW.tour_id IS DISTINCT FROM OLD.tour_id THEN
      RAISE EXCEPTION '請款單 status=% 後不可修改團。請先解除確認。', OLD.status;
    END IF;

    IF NEW.request_type IS DISTINCT FROM OLD.request_type THEN
      RAISE EXCEPTION '請款單 status=% 後不可修改類型。請先解除確認。', OLD.status;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS payment_requests_enforce_lock ON public.payment_requests;
CREATE TRIGGER payment_requests_enforce_lock
  BEFORE UPDATE OR DELETE ON public.payment_requests
  FOR EACH ROW EXECUTE FUNCTION enforce_payment_request_lock();

COMMIT;
