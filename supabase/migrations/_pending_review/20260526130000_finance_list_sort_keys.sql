-- 20260526130000_finance_list_sort_keys.sql
-- 請款單 / 收款單列表「狀態分群 + 群內方向排序」生成欄位（William 2026-05-26 拍板）
--
-- 為什麼：
--   列表原本用 paid_at / confirmed_at 的 nullsFirst 當分群，但「狀態」跟這些時戳欄
--   不是 1:1（例：status='paid' 但 paid_at 沒寫值 → 掉進未付那群 = 使用者看到的「狀態穿插」）。
--   改用「狀態」本身分群，並讓：
--     沒完成那群 = 舊的在上（催處理 / 帳齡）
--     已完成那群 = 新的在上（看最近紀錄）
--
-- 設計：兩個 immutable 生成欄位（不依賴「今天」、可 STORED、不用每天重算、順序不會因日曆翻頁而跳動）
--   list_sort_group：群序（小的在上）
--   list_sort_key  ：群內排序鍵。用「距 2000-01-01 的天數」帶正負號編碼方向——
--                    要 ASC（舊在上）的群用 +天數、要 DESC（新在上）的群用 -天數，
--                    最後統一 ORDER BY list_sort_group ASC, list_sort_key ASC 即可。
--
-- 排序語意：
--   payment_requests：未付(pending/confirmed)=群0+舊在上 / 已付(paid)=群1+新在上
--   receipts        ：待確認(pending/pending_verify)=群0+舊在上 / 已確認(confirmed)=群1+新在上 /
--                    已退回·取消·退款=群2+新在上（沉底、不混進上面兩群）

BEGIN;

-- ── payment_requests ───────────────────────────────────────────
ALTER TABLE public.payment_requests
  ADD COLUMN IF NOT EXISTS list_sort_group smallint
    GENERATED ALWAYS AS (CASE WHEN status = 'paid' THEN 1 ELSE 0 END) STORED,
  ADD COLUMN IF NOT EXISTS list_sort_key integer
    GENERATED ALWAYS AS (
      CASE
        WHEN status = 'paid'
          THEN -(COALESCE(request_date, DATE '2000-01-01') - DATE '2000-01-01')
        ELSE   (COALESCE(request_date, DATE '2000-01-01') - DATE '2000-01-01')
      END
    ) STORED;

CREATE INDEX IF NOT EXISTS idx_payment_requests_list_sort
  ON public.payment_requests (workspace_id, list_sort_group, list_sort_key, id)
  WHERE deleted_at IS NULL;

-- ── receipts ───────────────────────────────────────────────────
ALTER TABLE public.receipts
  ADD COLUMN IF NOT EXISTS list_sort_group smallint
    GENERATED ALWAYS AS (
      CASE
        WHEN status IN ('pending', 'pending_verify') THEN 0
        WHEN status = 'confirmed' THEN 1
        ELSE 2
      END
    ) STORED,
  ADD COLUMN IF NOT EXISTS list_sort_key integer
    GENERATED ALWAYS AS (
      CASE
        WHEN status IN ('pending', 'pending_verify')
          THEN   (COALESCE(receipt_date, DATE '2000-01-01') - DATE '2000-01-01')
        ELSE    -(COALESCE(receipt_date, DATE '2000-01-01') - DATE '2000-01-01')
      END
    ) STORED;

CREATE INDEX IF NOT EXISTS idx_receipts_list_sort
  ON public.receipts (workspace_id, list_sort_group, list_sort_key, id)
  WHERE deleted_at IS NULL;

COMMIT;

-- ⚠️ apply 後必跑（不然 client 排序新欄位炸「column does not exist」、要等 PostgREST 下一分鐘 auto-reload）：
--   NOTIFY pgrst, 'reload schema';

-- ════ Rollback（萬一爆炸、複製貼上跑）════
-- BEGIN;
-- DROP INDEX IF EXISTS public.idx_payment_requests_list_sort;
-- DROP INDEX IF EXISTS public.idx_receipts_list_sort;
-- ALTER TABLE public.payment_requests
--   DROP COLUMN IF EXISTS list_sort_group,
--   DROP COLUMN IF EXISTS list_sort_key;
-- ALTER TABLE public.receipts
--   DROP COLUMN IF EXISTS list_sort_group,
--   DROP COLUMN IF EXISTS list_sort_key;
-- COMMIT;
