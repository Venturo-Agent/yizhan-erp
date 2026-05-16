
-- ============================================
-- 完整修正：統一 employee ID 引用策略
-- ============================================
-- 問題：employees.id 是時間戳記 TEXT，但多個表的外鍵是 UUID
-- 解決：將所有引用 employees 的欄位改為 TEXT
-- ============================================

-- 1. MESSAGES 表
-- ============================================
ALTER TABLE messages
  DROP CONSTRAINT IF EXISTS messages_author_id_fkey;

ALTER TABLE messages
  ALTER COLUMN author_id TYPE TEXT USING author_id::text;

COMMENT ON COLUMN messages.author_id IS '作者 ID（對應 employees.id 時間戳記格式）';

-- 2. BULLETINS 表
-- ============================================
ALTER TABLE bulletins
  DROP CONSTRAINT IF EXISTS bulletins_author_id_fkey;

ALTER TABLE bulletins
  ALTER COLUMN author_id TYPE TEXT USING author_id::text;

COMMENT ON COLUMN bulletins.author_id IS '作者 ID（對應 employees.id 時間戳記格式）';

-- 3. CHANNELS 表
-- ============================================
ALTER TABLE channels
  DROP CONSTRAINT IF EXISTS channels_created_by_fkey;

-- 檢查 created_by 欄位是否存在
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'channels' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE channels
      ALTER COLUMN created_by TYPE TEXT USING created_by::text;

    COMMENT ON COLUMN channels.created_by IS '建立者 ID（對應 employees.id 時間戳記格式）';
  END IF;
END $$;

-- 4. WORKSPACES 表
-- ============================================
ALTER TABLE workspaces
  DROP CONSTRAINT IF EXISTS workspaces_created_by_fkey;

-- 檢查 created_by 欄位是否存在
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workspaces' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE workspaces
      ALTER COLUMN created_by TYPE TEXT USING created_by::text;

    COMMENT ON COLUMN workspaces.created_by IS '建立者 ID（對應 employees.id 時間戳記格式）';
  END IF;
END $$;

-- 5. ADVANCE_LISTS 表
-- ============================================
ALTER TABLE advance_lists
  DROP CONSTRAINT IF EXISTS advance_lists_created_by_fkey;

-- 檢查 created_by 欄位是否存在
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'advance_lists' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE advance_lists
      ALTER COLUMN created_by TYPE TEXT USING created_by::text;

    COMMENT ON COLUMN advance_lists.created_by IS '建立者 ID（對應 employees.id 時間戳記格式）';
  END IF;
END $$;

-- 6. ADVANCE_ITEMS 表
-- ============================================
ALTER TABLE advance_items
  DROP CONSTRAINT IF EXISTS advance_items_processed_by_fkey;

-- 檢查 processed_by 欄位是否存在
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'advance_items' AND column_name = 'processed_by'
  ) THEN
    ALTER TABLE advance_items
      ALTER COLUMN processed_by TYPE TEXT USING processed_by::text;

    COMMENT ON COLUMN advance_items.processed_by IS '處理者 ID（對應 employees.id 時間戳記格式）';
  END IF;
END $$;

-- ============================================
-- 驗證修改結果
-- ============================================
SELECT
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name IN ('messages', 'bulletins', 'channels', 'workspaces', 'advance_lists', 'advance_items')
  AND column_name IN ('author_id', 'created_by', 'processed_by')
ORDER BY table_name, column_name;

-- ============================================
-- 完成！
-- ============================================
SELECT '✅ 所有 employee ID 引用欄位已統一為 TEXT 格式' as status;
