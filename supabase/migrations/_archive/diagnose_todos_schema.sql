-- 診斷 todos 表的 schema 問題

-- 1. 檢查 creator 欄位的完整定義（包括 DEFAULT 值）
SELECT
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'todos'
  AND column_name IN ('id', 'creator', 'assignee')
ORDER BY ordinal_position;

-- 2. 檢查資料格式（前 5 筆）
SELECT
  id,
  creator,
  assignee,
  title,
  CASE
    WHEN creator ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN '✅ UUID 格式'
    WHEN creator ~ '^[0-9]{13}$' THEN '❌ 時間戳記'
    ELSE '❓ 其他: ' || creator
  END as creator_format,
  CASE
    WHEN assignee ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN '✅ UUID 格式'
    WHEN assignee ~ '^[0-9]{13}$' THEN '❌ 時間戳記'
    ELSE '❓ 其他: ' || assignee
  END as assignee_format
FROM todos
LIMIT 5;

-- 3. 統計資料格式分布
SELECT
  '資料格式統計' as check_type,
  COUNT(*) as total_records,
  COUNT(CASE WHEN creator ~ '^[0-9a-f]{8}-[0-9a-f]{4}' THEN 1 END) as uuid_creator_count,
  COUNT(CASE WHEN creator ~ '^[0-9]{13}$' THEN 1 END) as timestamp_creator_count,
  COUNT(CASE WHEN assignee ~ '^[0-9a-f]{8}-[0-9a-f]{4}' THEN 1 END) as uuid_assignee_count,
  COUNT(CASE WHEN assignee ~ '^[0-9]{13}$' THEN 1 END) as timestamp_assignee_count
FROM todos;
