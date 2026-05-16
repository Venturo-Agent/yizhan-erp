-- 刪除 employees 表的重複欄位 birthday
-- 統一使用 birth_date 作為生日欄位

-- 先確保 birth_date 有資料（從 birthday 遷移，如果有的話）
UPDATE employees 
SET birth_date = COALESCE(birth_date, birthday)
WHERE birthday IS NOT NULL AND birth_date IS NULL;

-- 刪除重複的 birthday 欄位
ALTER TABLE employees DROP COLUMN IF EXISTS birthday;

-- 添加註釋
COMMENT ON COLUMN employees.birth_date IS '出生日期（統一欄位，原有 birthday 已移除）';
