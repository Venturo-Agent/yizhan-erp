-- 修正 payment_requests 的 status check 約束
-- 原始約束只允許: pending, approved, paid, rejected
-- 程式碼還需要: confirmed, billed
BEGIN;

-- 先刪除舊的 check 約束
ALTER TABLE public.payment_requests
  DROP CONSTRAINT IF EXISTS payment_requests_status_check;

-- 新增包含所有需要狀態的 check 約束
ALTER TABLE public.payment_requests
  ADD CONSTRAINT payment_requests_status_check
  CHECK (status IN ('pending', 'approved', 'confirmed', 'billed', 'paid', 'rejected'));

COMMENT ON COLUMN public.payment_requests.status IS '狀態: pending=待處理, approved=已核准, confirmed=已確認, billed=已加入出納單, paid=已付款, rejected=已駁回';

COMMIT;
