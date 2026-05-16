-- ================================================
-- 新增 employees.roles 欄位
-- 日期: 2025-01-21
-- 目的: 支援多重角色標籤（業務、領隊、助理等）
-- ================================================

-- 1. 新增 roles 欄位（TEXT[] 陣列，支援多重角色）
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS roles TEXT[] DEFAULT ARRAY[]::TEXT[];

-- 2. 建立索引（方便按角色查詢員工）
CREATE INDEX IF NOT EXISTS idx_employees_roles ON employees USING GIN (roles);

-- 3. 註解
COMMENT ON COLUMN employees.roles IS '附加身份標籤（可複選）：admin, employee, user, tour_leader, sales, accountant, assistant';

-- 4. 驗證欄位是否新增成功
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'employees'
      AND column_name = 'roles'
  ) THEN
    RAISE NOTICE '✅ employees.roles 欄位已新增成功';
  ELSE
    RAISE EXCEPTION '❌ employees.roles 欄位新增失敗';
  END IF;

  RAISE NOTICE '====================================';
  RAISE NOTICE '✅ Migration 完成！';
  RAISE NOTICE '====================================';
END $$;
