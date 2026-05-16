-- 檢查 TEXT 類型的 employee 引用欄位是否有舊 ID

-- 1. todos 表（creator, assignee 都是 TEXT）
SELECT
  '1. todos' as table_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN creator ~ '^[0-9]{13}' THEN 1 END) as old_creator_count,
  COUNT(CASE WHEN assignee ~ '^[0-9]{13}' THEN 1 END) as old_assignee_count,
  COUNT(CASE WHEN creator ~ '^[0-9a-f]{8}-[0-9a-f]{4}' THEN 1 END) as uuid_creator_count,
  COUNT(CASE WHEN assignee ~ '^[0-9a-f]{8}-[0-9a-f]{4}' THEN 1 END) as uuid_assignee_count
FROM todos;

-- 2. calendar_events 表（created_by 是 TEXT）
SELECT
  '2. calendar_events' as table_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN created_by ~ '^[0-9]{13}' THEN 1 END) as old_id_count,
  COUNT(CASE WHEN created_by ~ '^[0-9a-f]{8}-[0-9a-f]{4}' THEN 1 END) as uuid_count
FROM calendar_events
WHERE created_by IS NOT NULL;

-- 3. payment_requests 表（approved_by, paid_by 是 TEXT）
SELECT
  '3. payment_requests' as table_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN approved_by ~ '^[0-9]{13}' THEN 1 END) as old_approved_by_count,
  COUNT(CASE WHEN paid_by ~ '^[0-9]{13}' THEN 1 END) as old_paid_by_count,
  COUNT(CASE WHEN approved_by ~ '^[0-9a-f]{8}-[0-9a-f]{4}' THEN 1 END) as uuid_approved_by_count,
  COUNT(CASE WHEN paid_by ~ '^[0-9a-f]{8}-[0-9a-f]{4}' THEN 1 END) as uuid_paid_by_count
FROM payment_requests
WHERE approved_by IS NOT NULL OR paid_by IS NOT NULL;

-- 總結
SELECT
  '✅ 如果 old_*_count = 0，表示沒有舊 ID' as note,
  '❌ 如果 old_*_count > 0，表示還有舊 ID 需要遷移' as action;
