-- =============================================
-- disbursement_orders 加 accounting_voucher_id FK
-- 2026-05-03
--
-- 背景：
--   出納單付款時要產生會計傳票（沖應付 / 銀行支出）、需要 FK 欄位掛上
--   原 schema 沒這欄、出納跟會計鏈路斷開
--
-- 純加法：ADD COLUMN IF NOT EXISTS、不影響既有資料
-- =============================================

ALTER TABLE public.disbursement_orders
  ADD COLUMN IF NOT EXISTS accounting_voucher_id uuid
  REFERENCES public.journal_vouchers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_disbursement_orders_voucher
  ON public.disbursement_orders(accounting_voucher_id)
  WHERE accounting_voucher_id IS NOT NULL;

COMMENT ON COLUMN public.disbursement_orders.accounting_voucher_id IS
  '對應的會計傳票 ID（撥款後自動產生、null 表示尚未過帳或會計未啟用）';
