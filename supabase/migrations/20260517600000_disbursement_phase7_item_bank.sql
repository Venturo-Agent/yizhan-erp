-- ─────────────────────────────────────────────────────────────────────────────
-- 出納單 Phase 7：單張多銀行整併
-- 2026-05-17 William 拍板
--
-- 問題：一張出納單選多銀行 → 產出 N 張 DO，撞號（race condition）
-- 解法：一期出帳 = 一張 disbursement_order，N 個 bank group
--       每筆 disbursement_order_items 帶自己的 from_bank_account_id
--
-- 改動：
--   Phase 7.1: disbursement_order_items 加 from_bank_account_id（品項知道從哪個帳戶付）
--   Phase 7.5: disbursement_orders 加 UNIQUE(workspace_id, code) 防撞號
--
-- Rollback:
--   ALTER TABLE public.disbursement_order_items DROP COLUMN IF EXISTS from_bank_account_id;
--   ALTER TABLE public.disbursement_orders ALTER COLUMN bank_account_id SET NOT NULL;
--   ALTER TABLE public.disbursement_orders DROP CONSTRAINT IF EXISTS disbursement_orders_workspace_code_unique;
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- ════ Phase 7.1: 品項層加銀行帳戶欄位 ════

-- Step 1: 加欄位（先 nullable，backfill 後才設 NOT NULL）
ALTER TABLE public.disbursement_order_items
  ADD COLUMN IF NOT EXISTS from_bank_account_id uuid REFERENCES public.bank_accounts(id);

-- Step 2: backfill（從 DO.bank_account_id 補進 DOI）
-- 注意：2 筆舊 DO 無 bank_account_id（DO260319-001, DO260428-001），其 8 個 DOI 留 NULL
UPDATE public.disbursement_order_items doi
SET from_bank_account_id = do_.bank_account_id
FROM public.disbursement_orders do_
WHERE doi.disbursement_order_id = do_.id
  AND doi.from_bank_account_id IS NULL
  AND do_.bank_account_id IS NOT NULL;

-- 欄位保持 nullable（舊資料 8 筆無法 backfill）
-- 新建 DOI 由 API 層強制帶 from_bank_account_id、不靠 DB NOT NULL

-- Step 3: DO.bank_account_id 設 nullable（廢用但保留、供舊資料/報表向下相容）
ALTER TABLE public.disbursement_orders
  ALTER COLUMN bank_account_id DROP NOT NULL;

-- ════ Phase 7.5: 加 UNIQUE constraint 防撞號 ════

-- 先確認無重複（撞號已在 2026-05-16 修復，此 constraint 防未來復發）
-- 若有重複會在 BEGIN 後 fail，不會 partial commit
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'disbursement_orders_workspace_code_unique'
  ) THEN
    ALTER TABLE public.disbursement_orders
      ADD CONSTRAINT disbursement_orders_workspace_code_unique
      UNIQUE (workspace_id, code);
  END IF;
END $$;

-- 補 index 加速查詢（UNIQUE constraint 已自帶 index，這個補 disbursement_date 查詢）
CREATE INDEX IF NOT EXISTS idx_do_workspace_date
  ON public.disbursement_orders(workspace_id, disbursement_date);

-- ════ 驗證 ════
DO $$
BEGIN
  -- 確認欄位加上
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'disbursement_order_items'
      AND column_name = 'from_bank_account_id'
  ) THEN
    RAISE EXCEPTION 'disbursement_order_items.from_bank_account_id 加欄位失敗';
  END IF;

  RAISE NOTICE '✓ Phase 7.1: disbursement_order_items.from_bank_account_id 加好';
  RAISE NOTICE '✓ Phase 7.5: disbursement_orders UNIQUE(workspace_id, code) 加好';
END $$;

COMMIT;
