-- ════════════════════════════════════════════════════════════════
-- payment_transactions 加 payment_method_id
-- ════════════════════════════════════════════════════════════════
--
-- 為什麼：
--   永豐刷卡成功後要自動開收款單(receipt)。但 receipt.payment_method_id 是 NOT NULL、
--   而且手續費要靠 payment_method.fee_percent / fee_fixed 計算。
--   問題：發起交易時（generate-payment-link）雖然收了 payment_method_id、驗證後卻沒存下來
--   （create-transaction 只傳 provider、payment_transactions schema 也沒這欄位）。
--   → confirm 時無從得知這筆刷卡用哪個收款方式。補上這欄位。
--
-- 做什麼：加 payment_method_id（nullable、FK payment_methods、ON DELETE SET NULL）。
--   舊資料 NULL（confirm 時 fallback：找該 workspace 的 sinopac receipt 方式）。
--
-- 影響：純加欄位、無 production 影響。

BEGIN;

ALTER TABLE public.payment_transactions
  ADD COLUMN IF NOT EXISTS payment_method_id uuid
    REFERENCES public.payment_methods(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.payment_transactions.payment_method_id IS
  '這筆刷卡用的收款方式（payment_methods）。confirm 時據此填 receipt.payment_method_id + 算手續費。2026-05-26。';

COMMIT;

-- ════ Rollback ════
-- BEGIN;
-- ALTER TABLE public.payment_transactions DROP COLUMN IF EXISTS payment_method_id;
-- COMMIT;
