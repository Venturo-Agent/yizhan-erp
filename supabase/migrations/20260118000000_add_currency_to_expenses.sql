-- 修復 personal_expenses 缺少 currency 欄位的問題
BEGIN;

-- 添加 currency 欄位
ALTER TABLE personal_expenses
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'TWD';

-- 添加外幣交易相關欄位（信用卡結帳用）
ALTER TABLE personal_expenses
  ADD COLUMN IF NOT EXISTS is_foreign_transaction BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS settlement_currency TEXT,
  ADD COLUMN IF NOT EXISTS settlement_amount DECIMAL(12, 2),
  ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(10, 6),
  ADD COLUMN IF NOT EXISTS is_settled BOOLEAN DEFAULT false;

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_personal_expenses_currency ON personal_expenses(currency);
CREATE INDEX IF NOT EXISTS idx_personal_expenses_foreign ON personal_expenses(is_foreign_transaction) WHERE is_foreign_transaction = true;

COMMIT;
