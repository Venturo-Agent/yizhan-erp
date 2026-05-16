-- payment_methods 加手續費科目欄位
-- 業務需求：刷卡 2% 手續費需綁會計科目（如 6100 刷卡手續費費用）
-- 收款核准時自動產生三行傳票：
--   借 debit_account（銀行存款）= actual_amount（實收）
--   借 fee_account（刷卡手續費）= fees
--   貸 credit_account（應收帳款）= receipt_amount（總額）

ALTER TABLE public.payment_methods
  ADD COLUMN IF NOT EXISTS fee_account_id uuid REFERENCES public.chart_of_accounts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_payment_methods_fee_account ON public.payment_methods(fee_account_id);
