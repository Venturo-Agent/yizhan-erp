-- 在 payments 和 payment_requests 加入 accounting_voucher_id 欄位
-- 用於追蹤每筆收款/請款對應的會計傳票


-- 1. payments 表加入 accounting_voucher_id
ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS accounting_voucher_id uuid REFERENCES public.journal_vouchers(id);

CREATE INDEX IF NOT EXISTS idx_payments_accounting_voucher
  ON public.payments(accounting_voucher_id);

COMMENT ON COLUMN public.payments.accounting_voucher_id IS '對應的會計傳票 ID';

-- 2. payment_requests 表加入 accounting_voucher_id
ALTER TABLE public.payment_requests
ADD COLUMN IF NOT EXISTS accounting_voucher_id uuid REFERENCES public.journal_vouchers(id);

CREATE INDEX IF NOT EXISTS idx_payment_requests_accounting_voucher
  ON public.payment_requests(accounting_voucher_id);

COMMENT ON COLUMN public.payment_requests.accounting_voucher_id IS '對應的會計傳票 ID';

