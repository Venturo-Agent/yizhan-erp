-- 完整檢查所有可能引用 employees.id 的欄位
-- 目的：確認 UUID 遷移是否完整

-- 步驟 1: 檢查所有包含 'id', 'by', 'person', 'user' 的欄位
SELECT
  table_name,
  column_name,
  data_type,
  udt_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    column_name LIKE '%employee%'
    OR column_name LIKE '%author%'
    OR column_name LIKE '%creator%'
    OR column_name LIKE '%assignee%'
    OR column_name LIKE '%created_by%'
    OR column_name LIKE '%updated_by%'
    OR column_name LIKE '%processed_by%'
    OR column_name LIKE '%requester%'
    OR column_name LIKE '%user_id%'
    OR column_name = 'id'
  )
  AND table_name NOT LIKE 'pg_%'
  AND table_name NOT LIKE 'sql_%'
ORDER BY table_name, column_name;
