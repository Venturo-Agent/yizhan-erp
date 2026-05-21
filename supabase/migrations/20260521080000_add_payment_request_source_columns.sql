-- ════════════════════════════════════════════════════════════════════
-- payment_requests 加 source_type / source_id 反查欄位
-- ════════════════════════════════════════════════════════════════════
-- 為什麼：
--   即將支援「自動產生的請款單」（先做收款手續費、未來可擴退款手續費 / 換匯差額）
--   需要記錄這張 auto-generated request 的「來源」、給審計 + UI 標記用。
--
-- 業務（William 5/21 拍板）：
--   收款 confirm 時、fees > 0 → 自動建一筆 status='paid' 的 payment_request、
--   source_type='receipt_fee'、source_id=receipt.id、accounting_subject 預設「銀行手續費」、
--   不走出納、不顯示供應商、notes 寫收款方式。
--
-- Schema：
--   source_type text — 'receipt_fee'（之後可擴 'refund_fee' / 'exchange_diff' 等）
--   source_id   uuid — 指源 entity（沒 FK 約束、避免 cascade delete 副作用）
--   index (source_type, source_id) — 給反查 + 防重複 insert
-- ════════════════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE public.payment_requests
  ADD COLUMN IF NOT EXISTS source_type text,
  ADD COLUMN IF NOT EXISTS source_id uuid;

CREATE INDEX IF NOT EXISTS idx_payment_requests_source
  ON public.payment_requests(source_type, source_id)
  WHERE source_type IS NOT NULL;

COMMENT ON COLUMN public.payment_requests.source_type IS
  '自動產生來源類型：receipt_fee（收款手續費）/ refund_fee / exchange_diff。null = 手動建立。';
COMMENT ON COLUMN public.payment_requests.source_id IS
  '自動產生來源 entity id（譬如 receipts.id）、沒 FK 約束避免 cascade。';

COMMIT;

-- ════════════════════════════════════════════════════════════════════
-- Rollback（萬一爆炸、複製貼上跑）：
--
-- BEGIN;
-- DROP INDEX IF EXISTS public.idx_payment_requests_source;
-- ALTER TABLE public.payment_requests
--   DROP COLUMN IF EXISTS source_type,
--   DROP COLUMN IF EXISTS source_id;
-- COMMIT;
-- ════════════════════════════════════════════════════════════════════
