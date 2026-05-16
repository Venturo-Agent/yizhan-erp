-- 為 profiles 表添加身份綁定欄位
-- 用於統一認證架構：用戶綁定身份證後，系統自動判斷是員工還是旅客

BEGIN;

-- 添加身份綁定欄位
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS linked_id_number TEXT,        -- 綁定的身份證/護照號碼
  ADD COLUMN IF NOT EXISTS linked_birthday DATE,         -- 綁定的出生日期
  ADD COLUMN IF NOT EXISTS identity_verified_at TIMESTAMPTZ,  -- 身份驗證時間
  ADD COLUMN IF NOT EXISTS is_employee BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS employee_id UUID,             -- 對應的 employees.id
  ADD COLUMN IF NOT EXISTS workspace_id UUID,            -- 對應的 workspaces.id
  ADD COLUMN IF NOT EXISTS is_traveler BOOLEAN DEFAULT FALSE;

-- 索引：用身份證號查詢
CREATE INDEX IF NOT EXISTS idx_profiles_linked_id_number ON profiles(linked_id_number);

-- 確保 employees 表有身份證欄位（如果沒有的話）
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS id_number TEXT,      -- 身份證號碼
  ADD COLUMN IF NOT EXISTS birthday DATE;       -- 出生日期

-- 索引：用身份證號查詢員工
CREATE INDEX IF NOT EXISTS idx_employees_id_number ON employees(id_number);

-- 確保 order_members 表有身份證欄位（應該已經有了，但確保一下）
-- order_members 應該用 passport_number 和 birthday

COMMIT;
