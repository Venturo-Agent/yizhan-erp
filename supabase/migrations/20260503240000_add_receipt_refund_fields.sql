-- =============================================
-- receipts 加退款欄位
-- 2026-05-03
--
-- 背景：
--   旅行社退費需求：客人退團 / 取消、把已 confirmed 的收款部分或全額退回
--   不另開 refunds 表、直接在 receipts 加欄位
--
-- 設計：
--   refunded_at        退款執行時間
--   refund_amount      退款金額（可 < actual_amount 部分退、可 = actual_amount 全退）
--   refund_voucher_id  對應的反向傳票（借收入貸銀行）
--   refund_notes       退款原因
--   refunded_by        退款執行人（FK 指 employees）
--
-- 純加法：ADD COLUMN IF NOT EXISTS、不影響既有資料
-- =============================================

ALTER TABLE public.receipts
  ADD COLUMN IF NOT EXISTS refunded_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS refund_amount numeric(20, 2),
  ADD COLUMN IF NOT EXISTS refund_voucher_id uuid
    REFERENCES public.journal_vouchers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS refund_notes text,
  ADD COLUMN IF NOT EXISTS refunded_by uuid
    REFERENCES public.employees(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_receipts_refund_voucher
  ON public.receipts(refund_voucher_id)
  WHERE refund_voucher_id IS NOT NULL;

COMMENT ON COLUMN public.receipts.refunded_at IS '退款執行時間（null = 未退款）';
COMMENT ON COLUMN public.receipts.refund_amount IS '退款金額（部分退 < actual_amount、全退 = actual_amount）';
COMMENT ON COLUMN public.receipts.refund_voucher_id IS '對應的反向傳票 ID（借收入貸銀行）';
COMMENT ON COLUMN public.receipts.refund_notes IS '退款原因 / 備註';
COMMENT ON COLUMN public.receipts.refunded_by IS '退款執行人（員工 ID）';
