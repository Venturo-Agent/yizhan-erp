-- ============================================================================
-- 20260503180000_receipts_add_transferred_pair_id.sql
--
-- 收款轉移 SaaS 化、跟 payment_requests.transferred_pair_id 鏡像
-- 兩張 receipts 共用 pair_id：來源團 -X、目標團 +X
-- 走正常 status flow（pending → confirmed）、不直接改既有單
-- ============================================================================

ALTER TABLE public.receipts
  ADD COLUMN IF NOT EXISTS transferred_pair_id uuid;

CREATE INDEX IF NOT EXISTS idx_receipts_transferred_pair_id
  ON public.receipts(transferred_pair_id)
  WHERE transferred_pair_id IS NOT NULL;

COMMENT ON COLUMN public.receipts.transferred_pair_id IS '收款轉移配對 ID（兩張 receipts 共用）：來源團 -金額 + 目標團 +金額。跟 payment_requests.transferred_pair_id 鏡像。';
