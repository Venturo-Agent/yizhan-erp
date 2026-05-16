-- 檢查當前資料庫的欄位類型
SELECT
  table_name,
  column_name,
  data_type,
  udt_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('employees', 'messages', 'bulletins', 'channels', 'workspaces', 'advance_lists', 'advance_items', 'orders')
  AND column_name IN ('id', 'author_id', 'created_by', 'processed_by', 'employee_id')
ORDER BY table_name, column_name;
