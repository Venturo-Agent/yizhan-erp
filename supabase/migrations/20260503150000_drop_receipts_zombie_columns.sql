-- ============================================================================
-- 20260503150000_drop_receipts_zombie_columns.sql
--
-- 砍 receipts 表的殭屍 / 半 deprecated / 重複欄位、收緊 SSOT。
--
-- 邏輯類似 spring cleaning、不影響 trigger（trigger 還用 receipt_type / payment_method）
--
-- 砍的欄位分三類：
--   A. 純殭屍（DB 有 column、code 完全沒寫沒讀）
--   B. UI 已砍、寫入路徑也清掉（半 deprecated）
--   C. 重複的金額欄位（amount / total_amount 是 receipt_amount 的副本）
--   D. LinkPay 已移除（form / 邏輯 / seed 都砍了、欄位不再用）
-- ============================================================================

ALTER TABLE public.receipts
  -- A. 純殭屍
  DROP COLUMN IF EXISTS account_last_digits,
  DROP COLUMN IF EXISTS transaction_id,
  DROP COLUMN IF EXISTS sync_status,
  -- B. UI 砍了、code 也清了
  DROP COLUMN IF EXISTS handler_name,
  DROP COLUMN IF EXISTS account_info,
  DROP COLUMN IF EXISTS card_last_four,
  DROP COLUMN IF EXISTS auth_code,
  DROP COLUMN IF EXISTS check_number,
  DROP COLUMN IF EXISTS check_bank,
  DROP COLUMN IF EXISTS check_date,
  DROP COLUMN IF EXISTS bank_name,
  -- C. 重複金額
  DROP COLUMN IF EXISTS amount,
  DROP COLUMN IF EXISTS total_amount,
  -- D. LinkPay 已移除
  DROP COLUMN IF EXISTS link,
  DROP COLUMN IF EXISTS linkpay_order_number,
  DROP COLUMN IF EXISTS email,
  DROP COLUMN IF EXISTS payment_name,
  DROP COLUMN IF EXISTS pay_dateline;

-- 註：保留欄位（DB trigger 還用、向下相容）
--   - payment_method (string、4 大類)
--   - receipt_type (number 0-3、LinkPay=4 不再用)
