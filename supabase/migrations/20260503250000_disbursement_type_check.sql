-- =============================================
-- disbursement_orders.disbursement_type 加 CHECK 約束
-- 2026-05-03
--
-- 5 種有效值：
--   payment_request   團體請款（含 tour_id 的請款撥款）
--   payroll           薪資撥款（從 HR payroll_runs 來）
--   refund            退款（給客人退款的銀行出帳）
--   cost_transfer     成本轉移（A 團 → B 團、淨額 0、為了銀行對帳齊全）
--   company_expense   一般公司費用（無 tour_id 的公司請款）
--
-- 現有 production data 全部 disbursement_type='payment_request'、CHECK 加上去不會打架
-- =============================================

ALTER TABLE public.disbursement_orders
  ADD CONSTRAINT disbursement_orders_type_check
  CHECK (
    disbursement_type IS NULL OR
    disbursement_type IN (
      'payment_request',
      'payroll',
      'refund',
      'cost_transfer',
      'company_expense'
    )
  );

COMMENT ON COLUMN public.disbursement_orders.disbursement_type IS
  '出納單分類：payment_request(團體請款) / payroll(薪資) / refund(退款) / cost_transfer(成本轉移) / company_expense(一般公司費用)';
