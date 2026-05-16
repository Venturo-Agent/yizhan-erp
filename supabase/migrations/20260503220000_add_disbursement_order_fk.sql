-- ============================================================================
-- 20260503220000_add_disbursement_order_fk.sql
--
-- Issue 1：出納單跟請款單的綁定關係從 array 改 FK
--
-- # 為什麼
-- 原本 disbursement_orders.payment_request_ids 是 uuid[]、無 FK enforcement、
-- 刪請款單時 array 留死 ID。業務語意是 1-to-N（一張請款單只能在一張出納單裡）、
-- 標準做法是子表存 parent_id、不是父表寫 array。
--
-- # 怎麼改
-- 1. 加 payment_requests.disbursement_order_id（FK ON DELETE SET NULL）
-- 2. 從現有 array 搬資料
-- 3. 改 cascade_disbursement_paid_to_requests trigger（讀 FK 不讀 array）
-- 4. 保留 array 欄位、等 code 改完才砍（下一張 migration）
--
-- # 為什麼分兩張 migration
-- 砍 array 前 code 還在讀寫它、會炸。先加新欄位 + 改 trigger、跑一段時間、
-- code 改完 + verified、再砍 array。
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. 加新欄位
-- ----------------------------------------------------------------------------
ALTER TABLE public.payment_requests
  ADD COLUMN IF NOT EXISTS disbursement_order_id uuid;

ALTER TABLE public.payment_requests
  ADD CONSTRAINT payment_requests_disbursement_order_id_fkey
  FOREIGN KEY (disbursement_order_id)
  REFERENCES public.disbursement_orders(id)
  ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_payment_requests_disbursement_order_id
  ON public.payment_requests(disbursement_order_id)
  WHERE disbursement_order_id IS NOT NULL;

COMMENT ON COLUMN public.payment_requests.disbursement_order_id IS
  '所屬出納單 FK（1-to-N、標籤式綁定）。出納單刪除時自動 SET NULL。
   取代之前的 disbursement_orders.payment_request_ids array。';

-- ----------------------------------------------------------------------------
-- 2. 搬資料：每張 disbursement_order 把 array 內的 request 都標記 FK
-- ----------------------------------------------------------------------------
UPDATE public.payment_requests pr
SET disbursement_order_id = d.id
FROM public.disbursement_orders d
WHERE pr.id = ANY(d.payment_request_ids);

-- ----------------------------------------------------------------------------
-- 3. 改 cascade trigger：讀 FK 不讀 array
-- ----------------------------------------------------------------------------
-- 注意 enforce_payment_request_lock 會擋 confirmed 狀態的 amount 修改、
-- 但 cascade trigger 只改 status 不改 amount、所以不會撞 lock
CREATE OR REPLACE FUNCTION public.cascade_disbursement_paid_to_requests()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
AS $function$
BEGIN
  -- 只在 status 從非 paid → paid 時觸發
  IF TG_OP = 'UPDATE'
     AND OLD.status IS DISTINCT FROM 'paid'
     AND NEW.status = 'paid'
  THEN
    UPDATE public.payment_requests
    SET status = 'billed',
        updated_at = now()
    WHERE disbursement_order_id = NEW.id
      AND status = 'confirmed';  -- 只升級 confirmed 的、其他狀態不動（保險）
  END IF;

  RETURN NEW;
END;
$function$;

COMMIT;
