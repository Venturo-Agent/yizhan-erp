-- =====================================================
-- Migration: 統一欄位命名規範
-- Date: 2026-01-23
-- Description: 修正跨表格欄位命名不一致的問題
-- Reference: docs/FIELD_NAMING_STANDARDS.md
-- =====================================================

-- =====================================================
-- 1. employees 表: birthday → birth_date
-- =====================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'employees' AND column_name = 'birthday'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'employees' AND column_name = 'birth_date'
  ) THEN
    ALTER TABLE employees RENAME COLUMN birthday TO birth_date;
    RAISE NOTICE 'Renamed employees.birthday → birth_date';
  END IF;
END $$;

-- =====================================================
-- 2. customers 表: date_of_birth → birth_date
-- =====================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'date_of_birth'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'birth_date'
  ) THEN
    ALTER TABLE customers RENAME COLUMN date_of_birth TO birth_date;
    RAISE NOTICE 'Renamed customers.date_of_birth → birth_date';
  END IF;
END $$;

-- =====================================================
-- 3. customers 表: passport_expiry_date → passport_expiry
-- =====================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'passport_expiry_date'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'passport_expiry'
  ) THEN
    ALTER TABLE customers RENAME COLUMN passport_expiry_date TO passport_expiry;
    RAISE NOTICE 'Renamed customers.passport_expiry_date → passport_expiry';
  END IF;
END $$;

-- =====================================================
-- 4. customers 表: passport_romanization → passport_name
-- =====================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'passport_romanization'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'passport_name'
  ) THEN
    ALTER TABLE customers RENAME COLUMN passport_romanization TO passport_name;
    RAISE NOTICE 'Renamed customers.passport_romanization → passport_name';
  END IF;
END $$;

-- =====================================================
-- 5. suppliers 表: name_en → english_name
-- =====================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'suppliers' AND column_name = 'name_en'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'suppliers' AND column_name = 'english_name'
  ) THEN
    ALTER TABLE suppliers RENAME COLUMN name_en TO english_name;
    RAISE NOTICE 'Renamed suppliers.name_en → english_name';
  END IF;
END $$;

-- =====================================================
-- 6. suppliers 表: 合併 note 到 notes，然後刪除 note
-- =====================================================
DO $$
BEGIN
  -- 檢查是否同時存在 note 和 notes
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'suppliers' AND column_name = 'note'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'suppliers' AND column_name = 'notes'
  ) THEN
    -- 合併資料：如果 notes 是空的，用 note 的值
    UPDATE suppliers
    SET notes = COALESCE(notes, '') || CASE WHEN note IS NOT NULL AND note != '' THEN chr(10) || note ELSE '' END
    WHERE note IS NOT NULL AND note != '';

    -- 刪除 note 欄位
    ALTER TABLE suppliers DROP COLUMN note;
    RAISE NOTICE 'Merged suppliers.note into suppliers.notes and dropped note column';
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'suppliers' AND column_name = 'note'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'suppliers' AND column_name = 'notes'
  ) THEN
    -- 只有 note，改名為 notes
    ALTER TABLE suppliers RENAME COLUMN note TO notes;
    RAISE NOTICE 'Renamed suppliers.note → notes';
  END IF;
END $$;

-- =====================================================
-- 添加註釋說明標準欄位名稱
-- =====================================================
COMMENT ON COLUMN employees.birth_date IS '出生日期 (標準欄位名，格式: YYYY-MM-DD)';
COMMENT ON COLUMN customers.birth_date IS '出生日期 (標準欄位名，格式: YYYY-MM-DD)';
COMMENT ON COLUMN customers.passport_expiry IS '護照效期 (標準欄位名，格式: YYYY-MM-DD)';
COMMENT ON COLUMN customers.passport_name IS '護照姓名/拼音 (標準欄位名)';
COMMENT ON COLUMN suppliers.english_name IS '英文名稱 (標準欄位名)';
COMMENT ON COLUMN suppliers.notes IS '備註 (標準欄位名，統一使用 notes 而非 note)';
