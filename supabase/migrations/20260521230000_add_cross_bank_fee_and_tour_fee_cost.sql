-- Phase 4：銀行帳戶 cross_bank_fee + 團成本 fee_cost
-- William 2026-05-21 拍板：手續費要歸到該團、利潤計算才對、但不回填原請款（避免循環）
--
-- 動的事：
-- 1. bank_accounts 加 cross_bank_fee 欄位（每帳戶可設、user 自填、譬如合庫 $10）
-- 2. tours 加 fee_cost 欄位（該團出納手續費加總、由 recalculateExpenseStats 維護）
-- 3. backfill 既有 tours.fee_cost = SUM(disbursement_order_items.fee_amount JOIN payment_request_items.tour_id)
--
-- 設計：
-- - bank_accounts.cross_bank_fee default 0（不填 = 不收手續費）
-- - tours.fee_cost default 0
-- - tours.total_cost 語意不變（純請款明細加總、不含手續費）
-- - 利潤計算改用 total_revenue - (total_cost + fee_cost)
--
-- 已 apply 到 production：2026-05-21 via mcp__supabase-aierp__apply_migration

BEGIN;

-- ─────────────────────────────────────────
-- 1. bank_accounts 加 cross_bank_fee
-- ─────────────────────────────────────────
ALTER TABLE public.bank_accounts
  ADD COLUMN IF NOT EXISTS cross_bank_fee numeric DEFAULT 0 NOT NULL;

COMMENT ON COLUMN public.bank_accounts.cross_bank_fee IS '跨行匯款每筆手續費（譬如 10 元、each 公司跟銀行談的不同）、unified 模式 wizard 預估用';

-- ─────────────────────────────────────────
-- 2. tours 加 fee_cost
-- ─────────────────────────────────────────
ALTER TABLE public.tours
  ADD COLUMN IF NOT EXISTS fee_cost numeric DEFAULT 0 NOT NULL;

COMMENT ON COLUMN public.tours.fee_cost IS '該團累計出納手續費、由 recalculateExpenseStats 維護、利潤 = revenue - (total_cost + fee_cost)';

-- ─────────────────────────────────────────
-- 3. backfill tours.fee_cost
--    每個團撈所有 disbursement_order_items 的 fee_amount、依 payment_request_items.tour_id group by 加總
-- ─────────────────────────────────────────
-- ⚠️ schema drift：tours.id 是 text（存 uuid 字串）、payment_request_items.tour_id 是 uuid、要 cast 一邊
-- 寫檔教訓：第一次 apply 漏 cast、ERROR 42883: operator does not exist: uuid = text
UPDATE public.tours t
SET fee_cost = COALESCE(sub.total_fee, 0)
FROM (
  SELECT pri.tour_id::text AS tour_id, SUM(doi.fee_amount) AS total_fee
  FROM public.disbursement_order_items doi
  JOIN public.payment_request_items pri ON pri.id = doi.payment_request_item_id
  WHERE pri.tour_id IS NOT NULL
  GROUP BY pri.tour_id
) sub
WHERE sub.tour_id = t.id;

COMMIT;

-- ════ Rollback ════
-- BEGIN;
-- ALTER TABLE public.tours DROP COLUMN IF EXISTS fee_cost;
-- ALTER TABLE public.bank_accounts DROP COLUMN IF EXISTS cross_bank_fee;
-- COMMIT;
