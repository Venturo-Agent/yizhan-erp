-- ============================================================================
-- 20260503210000_clean_duplicate_fks.sql
--
-- 清掉兩個歷史 FK 雜物
--
-- # Issue 2：receipts.payment_method_id 雙重 FK
-- 歷史 migration 重複建約束、兩條 FK 完全等價：
--   - fk_receipts_payment_method (RESTRICT) ← 留這條（code 用 PostgREST hint）
--   - receipts_payment_method_id_fkey (RESTRICT) ← 砍這條
-- 兩條都在跑檢查、PostgreSQL 沒擋、純粹多餘工。
--
-- # Issue 3：linkpay_logs → receipts FK 是 RESTRICT、但 LinkPay 已 deprecated
-- 改成 CASCADE：linkpay_logs 是 receipts 的子紀錄、receipt 被刪 log 應該跟著走、
-- 不該擋 parent 刪除。
-- LinkPay 完整 teardown（砍 table + 砍 7 處 code 引用）另開單處理、本 migration
-- 不動 schema 結構。
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. 砍重複 FK
-- ----------------------------------------------------------------------------
ALTER TABLE public.receipts
  DROP CONSTRAINT IF EXISTS receipts_payment_method_id_fkey;

-- ----------------------------------------------------------------------------
-- 2. linkpay_logs FK 改 CASCADE
-- ----------------------------------------------------------------------------
ALTER TABLE public.linkpay_logs
  DROP CONSTRAINT IF EXISTS linkpay_logs_workspace_receipt_number_fkey;

ALTER TABLE public.linkpay_logs
  ADD CONSTRAINT linkpay_logs_workspace_receipt_number_fkey
  FOREIGN KEY (workspace_id, receipt_number)
  REFERENCES public.receipts(workspace_id, receipt_number)
  ON DELETE CASCADE;

COMMIT;
