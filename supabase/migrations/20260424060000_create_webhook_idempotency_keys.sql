-- =============================================
-- Migration: 建立 webhook_idempotency_keys 表防 webhook 重複處理
-- Date: 2026-04-24
--
-- 背景：
--   外部 webhook (LinkPay/LINE/META) 在網路抖動時會重發同一筆通知。
--   現有 webhook handler 沒有冪等保護、會重複處理：
--     - LinkPay 重發 → 重複建 voucher (兩筆會計傳票)
--     - LINE/META 重發 → 重複處理 message
--   此表用來記錄已處理過的 webhook key、第二次收到回 200 略過。
--
-- 設計：
--   - PRIMARY KEY (source, idempotency_key) — 同 webhook 同 key 唯一
--   - source: 'linkpay' / 'line' / 'meta'
--   - idempotency_key: 來源 unique ID (LinkPay order_no / LINE event.id / META message ID)
--   - processed_at: 處理時間 (cleanup 30 天舊 row 用、cron 另外做)
--
-- 配套: src/lib/webhook/idempotency.ts (helper)
-- =============================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.webhook_idempotency_keys (
  source text NOT NULL,
  idempotency_key text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (source, idempotency_key)
);

-- 用 processed_at 做 TTL cleanup
CREATE INDEX IF NOT EXISTS webhook_idempotency_keys_processed_at_idx
  ON public.webhook_idempotency_keys(processed_at);

-- RLS: 只給 service_role 用、user 不應該直接讀寫
ALTER TABLE public.webhook_idempotency_keys ENABLE ROW LEVEL SECURITY;

-- 沒有 policy = 預設拒絕一般 user、service_role 自動 bypass
COMMENT ON TABLE public.webhook_idempotency_keys IS
  'Webhook 冪等性記錄。webhook handler 透過 src/lib/webhook/idempotency.ts 寫入。重複 key 表示重發、回 200 略過。';

DO $$
DECLARE c int;
BEGIN
  SELECT count(*) INTO c FROM information_schema.tables
  WHERE table_schema='public' AND table_name='webhook_idempotency_keys';
  IF c = 0 THEN RAISE EXCEPTION 'webhook_idempotency_keys 沒建出來'; END IF;
END $$;

COMMIT;
