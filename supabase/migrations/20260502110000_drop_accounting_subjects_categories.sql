-- 任務 B1：會計三表合併
-- 背景：accounting_subjects (148 列) 跟 accounting_categories (78 列) 是並列死表、
--      已經被 chart_of_accounts (267 列) 取代。本 migration 切 FK target、再砍兩表。
--
-- 影響欄位：
--   * payment_requests.accounting_subject_id (0 筆使用、不必資料遷移)
--   * receipts.accounting_subject_id           (0 筆使用、不必資料遷移)

BEGIN;

-- ============================================================
-- 1. 切換 FK target：accounting_subjects → chart_of_accounts
-- ============================================================

ALTER TABLE public.payment_requests
  DROP CONSTRAINT IF EXISTS payment_requests_accounting_subject_id_fkey;

ALTER TABLE public.payment_requests
  ADD CONSTRAINT payment_requests_accounting_subject_id_fkey
  FOREIGN KEY (accounting_subject_id)
  REFERENCES public.chart_of_accounts(id)
  ON DELETE SET NULL;

ALTER TABLE public.receipts
  DROP CONSTRAINT IF EXISTS receipts_accounting_subject_id_fkey;

ALTER TABLE public.receipts
  ADD CONSTRAINT receipts_accounting_subject_id_fkey
  FOREIGN KEY (accounting_subject_id)
  REFERENCES public.chart_of_accounts(id)
  ON DELETE SET NULL;

-- ============================================================
-- 2. 砍死表（CASCADE 清掉 self-referencing FK 跟 dependent objects）
-- ============================================================

DROP TABLE IF EXISTS public.accounting_subjects CASCADE;
DROP TABLE IF EXISTS public.accounting_categories CASCADE;

COMMIT;
