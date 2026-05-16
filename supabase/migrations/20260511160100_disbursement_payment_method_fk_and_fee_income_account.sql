-- 出納單付款方式 FK + 付款方式的「公司收入科目」
-- William 拍板 2026-05-11：起始設定階段、payment_method 上把所有東西串好
-- 之後出納單建立只選「付款方式」、bank_account_id / 會計科目都從 method 自動帶
--
-- 1. disbursement_orders.payment_method_id：新出納單記用哪個付款方式
--    NULL allowed（既有出納單沒記）、新建必填
-- 2. payment_methods.fee_income_account_id：統一收取模式的差額轉公司收入科目

BEGIN;

-- ============ 1. disbursement_orders 加 payment_method_id ============
ALTER TABLE public.disbursement_orders
  ADD COLUMN IF NOT EXISTS payment_method_id uuid;

ALTER TABLE public.disbursement_orders
  DROP CONSTRAINT IF EXISTS disbursement_orders_payment_method_fk;
ALTER TABLE public.disbursement_orders
  ADD CONSTRAINT disbursement_orders_payment_method_fk
  FOREIGN KEY (payment_method_id)
  REFERENCES public.payment_methods(id)
  ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_do_payment_method ON public.disbursement_orders(payment_method_id);

-- ============ 2. payment_methods 加 fee_income_account_id ============
ALTER TABLE public.payment_methods
  ADD COLUMN IF NOT EXISTS fee_income_account_id uuid;

ALTER TABLE public.payment_methods
  DROP CONSTRAINT IF EXISTS payment_methods_fee_income_account_fk;
ALTER TABLE public.payment_methods
  ADD CONSTRAINT payment_methods_fee_income_account_fk
  FOREIGN KEY (fee_income_account_id)
  REFERENCES public.chart_of_accounts(id)
  ON DELETE SET NULL;

-- 只有 fee_split_mode='unified' 才需要這個科目（不強制 NOT NULL、業務上 UI 強制）
CREATE INDEX IF NOT EXISTS idx_pm_fee_income_account
  ON public.payment_methods(fee_income_account_id)
  WHERE fee_income_account_id IS NOT NULL;

COMMIT;

NOTIFY pgrst, 'reload schema';
