-- 🔍 完整檢查所有表是否還有舊的時間戳記 ID
-- 目的：確認 UUID 遷移是否完整

-- ============================================
-- 檢查策略：
-- 時間戳記 ID 格式：13 位數字（例如：1760513377702）
-- UUID 格式：8-4-4-4-12 位（例如：677d2654-a6dc-421c-913e-6228e7cd97cf）
-- ============================================

-- 1️⃣ 檢查 messages 表
SELECT
  '1. messages' as table_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN author_id::text ~ '^[0-9]{13}' THEN 1 END) as old_id_count,
  COUNT(CASE WHEN author_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}' THEN 1 END) as uuid_count
FROM messages;

-- 2️⃣ 檢查 bulletins 表
SELECT
  '2. bulletins' as table_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN author_id::text ~ '^[0-9]{13}' THEN 1 END) as old_id_count,
  COUNT(CASE WHEN author_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}' THEN 1 END) as uuid_count
FROM bulletins;

-- 3️⃣ 檢查 channels 表
SELECT
  '3. channels' as table_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN created_by::text ~ '^[0-9]{13}' THEN 1 END) as old_id_count,
  COUNT(CASE WHEN created_by::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}' THEN 1 END) as uuid_count
FROM channels;

-- 4️⃣ 檢查 workspaces 表
SELECT
  '4. workspaces' as table_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN created_by::text ~ '^[0-9]{13}' THEN 1 END) as old_id_count,
  COUNT(CASE WHEN created_by::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}' THEN 1 END) as uuid_count
FROM workspaces;

-- 5️⃣ 檢查 advance_lists 表
SELECT
  '5. advance_lists' as table_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN created_by::text ~ '^[0-9]{13}' THEN 1 END) as old_id_count,
  COUNT(CASE WHEN created_by::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}' THEN 1 END) as uuid_count
FROM advance_lists;

-- 6️⃣ 檢查 advance_items 表
SELECT
  '6. advance_items' as table_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN processed_by::text ~ '^[0-9]{13}' THEN 1 END) as old_id_count,
  COUNT(CASE WHEN processed_by::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}' THEN 1 END) as uuid_count
FROM advance_items
WHERE processed_by IS NOT NULL;

-- 7️⃣ 檢查 orders 表（跳過，orders 表沒有直接引用 employees）
SELECT
  '7. orders (skipped)' as table_name,
  0 as total_records,
  0 as old_id_count,
  0 as uuid_count;

-- 8️⃣ 檢查 todos 表
SELECT
  '8. todos' as table_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN creator::text ~ '^[0-9]{13}' THEN 1 END) as old_creator_count,
  COUNT(CASE WHEN assignee::text ~ '^[0-9]{13}' THEN 1 END) as old_assignee_count,
  COUNT(CASE WHEN creator::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}' THEN 1 END) as uuid_creator_count,
  COUNT(CASE WHEN assignee::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}' THEN 1 END) as uuid_assignee_count
FROM todos;

-- 9️⃣ 檢查 calendar_events 表（跳過，沒有 user_id 欄位）
SELECT
  '9. calendar_events (skipped)' as table_name,
  0 as total_records,
  0 as old_id_count,
  0 as uuid_count;

-- 🔟 檢查 payment_requests 表
SELECT
  '10. payment_requests' as table_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN requester_id::text ~ '^[0-9]{13}' THEN 1 END) as old_id_count,
  COUNT(CASE WHEN requester_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}' THEN 1 END) as uuid_count
FROM payment_requests
WHERE requester_id IS NOT NULL;

-- ============================================
-- 總結報告
-- ============================================
SELECT
  '✅ 如果 old_id_count = 0，表示該表已完全遷移' as note,
  '❌ 如果 old_id_count > 0，表示該表還有舊 ID 需要遷移' as action;
