-- 修復記帳功能表格（補齊缺失的部分）
-- 2026-01-18

BEGIN;

-- =====================
-- 1. 為 expense_categories 添加缺失的欄位
-- =====================
ALTER TABLE expense_categories ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES expense_categories(id) ON DELETE CASCADE;
ALTER TABLE expense_categories ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT false;

-- 索引
CREATE INDEX IF NOT EXISTS idx_expense_categories_parent ON expense_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_expense_categories_type ON expense_categories(type);

-- =====================
-- 2. 建立 expense_streaks 表（記帳連續天數）
-- =====================
CREATE TABLE IF NOT EXISTS expense_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE, -- 可以是 auth.users.id 或 employees.id

  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_record_date DATE,

  total_records INTEGER DEFAULT 0,
  total_expense_amount DECIMAL(12, 2) DEFAULT 0,
  total_income_amount DECIMAL(12, 2) DEFAULT 0,

  -- 成就
  achievements JSONB DEFAULT '[]',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_expense_streaks_user ON expense_streaks(user_id);

-- =====================
-- 3. 為 personal_expenses 添加帳戶關聯欄位
-- =====================
ALTER TABLE personal_expenses
  ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES expense_categories(id) ON DELETE SET NULL;

-- 索引
CREATE INDEX IF NOT EXISTS idx_personal_expenses_account ON personal_expenses(account_id);
CREATE INDEX IF NOT EXISTS idx_personal_expenses_category_id ON personal_expenses(category_id);

-- =====================
-- 4. 帳戶餘額觸發器
-- =====================
CREATE OR REPLACE FUNCTION update_account_balance()
RETURNS TRIGGER AS $$
BEGIN
  -- 處理 INSERT
  IF TG_OP = 'INSERT' AND NEW.account_id IS NOT NULL THEN
    IF NEW.type = 'expense' THEN
      UPDATE accounts SET current_balance = current_balance - NEW.amount, updated_at = NOW()
        WHERE id = NEW.account_id;
    ELSE
      UPDATE accounts SET current_balance = current_balance + NEW.amount, updated_at = NOW()
        WHERE id = NEW.account_id;
    END IF;
  END IF;

  -- 處理 DELETE
  IF TG_OP = 'DELETE' AND OLD.account_id IS NOT NULL THEN
    IF OLD.type = 'expense' THEN
      UPDATE accounts SET current_balance = current_balance + OLD.amount, updated_at = NOW()
        WHERE id = OLD.account_id;
    ELSE
      UPDATE accounts SET current_balance = current_balance - OLD.amount, updated_at = NOW()
        WHERE id = OLD.account_id;
    END IF;
    RETURN OLD;
  END IF;

  -- 處理 UPDATE
  IF TG_OP = 'UPDATE' THEN
    -- 先還原舊的
    IF OLD.account_id IS NOT NULL THEN
      IF OLD.type = 'expense' THEN
        UPDATE accounts SET current_balance = current_balance + OLD.amount WHERE id = OLD.account_id;
      ELSE
        UPDATE accounts SET current_balance = current_balance - OLD.amount WHERE id = OLD.account_id;
      END IF;
    END IF;
    -- 再套用新的
    IF NEW.account_id IS NOT NULL THEN
      IF NEW.type = 'expense' THEN
        UPDATE accounts SET current_balance = current_balance - NEW.amount, updated_at = NOW()
          WHERE id = NEW.account_id;
      ELSE
        UPDATE accounts SET current_balance = current_balance + NEW.amount, updated_at = NOW()
          WHERE id = NEW.account_id;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 建立觸發器
DROP TRIGGER IF EXISTS trigger_update_account_balance ON personal_expenses;
DROP TRIGGER IF EXISTS trigger_update_account_balance ON personal_expenses;
CREATE TRIGGER trigger_update_account_balance
  AFTER INSERT OR UPDATE OR DELETE ON personal_expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_account_balance();

-- =====================
-- 5. 連續記帳天數觸發器
-- =====================
CREATE OR REPLACE FUNCTION update_expense_streak()
RETURNS TRIGGER AS $$
DECLARE
  streak_record expense_streaks%ROWTYPE;
  today DATE := CURRENT_DATE;
  yesterday DATE := CURRENT_DATE - 1;
BEGIN
  -- 取得或建立 streak 記錄
  SELECT * INTO streak_record FROM expense_streaks WHERE user_id = NEW.user_id;

  IF NOT FOUND THEN
    INSERT INTO expense_streaks (user_id, current_streak, last_record_date, total_records)
    VALUES (NEW.user_id, 1, today, 1);
  ELSE
    -- 更新連續天數
    IF streak_record.last_record_date = today THEN
      -- 同一天已記帳，只增加總數
      UPDATE expense_streaks
      SET total_records = total_records + 1,
          total_expense_amount = CASE WHEN NEW.type = 'expense' THEN total_expense_amount + NEW.amount ELSE total_expense_amount END,
          total_income_amount = CASE WHEN NEW.type = 'income' THEN total_income_amount + NEW.amount ELSE total_income_amount END,
          updated_at = NOW()
      WHERE user_id = NEW.user_id;
    ELSIF streak_record.last_record_date = yesterday THEN
      -- 連續記帳
      UPDATE expense_streaks
      SET current_streak = current_streak + 1,
          longest_streak = GREATEST(longest_streak, current_streak + 1),
          last_record_date = today,
          total_records = total_records + 1,
          total_expense_amount = CASE WHEN NEW.type = 'expense' THEN total_expense_amount + NEW.amount ELSE total_expense_amount END,
          total_income_amount = CASE WHEN NEW.type = 'income' THEN total_income_amount + NEW.amount ELSE total_income_amount END,
          updated_at = NOW()
      WHERE user_id = NEW.user_id;
    ELSE
      -- 斷掉了，重新開始
      UPDATE expense_streaks
      SET current_streak = 1,
          last_record_date = today,
          total_records = total_records + 1,
          total_expense_amount = CASE WHEN NEW.type = 'expense' THEN total_expense_amount + NEW.amount ELSE total_expense_amount END,
          total_income_amount = CASE WHEN NEW.type = 'income' THEN total_income_amount + NEW.amount ELSE total_income_amount END,
          updated_at = NOW()
      WHERE user_id = NEW.user_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 建立觸發器
DROP TRIGGER IF EXISTS trigger_update_expense_streak ON personal_expenses;
DROP TRIGGER IF EXISTS trigger_update_expense_streak ON personal_expenses;
CREATE TRIGGER trigger_update_expense_streak
  AFTER INSERT ON personal_expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_expense_streak();

COMMIT;
