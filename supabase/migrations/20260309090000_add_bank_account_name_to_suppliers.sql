-- Add bank_account_name column to suppliers table
-- 在銀行名稱和銀行帳號之間加上戶名欄位

ALTER TABLE suppliers
ADD COLUMN IF NOT EXISTS bank_account_name TEXT;

COMMENT ON COLUMN suppliers.bank_account_name IS '銀行戶名';
