-- Step 1: 移除所有 DEFAULT 值

-- todos 表
ALTER TABLE todos ALTER COLUMN creator DROP DEFAULT;
ALTER TABLE todos ALTER COLUMN assignee DROP DEFAULT;

-- calendar_events 表
ALTER TABLE calendar_events ALTER COLUMN created_by DROP DEFAULT;

-- payment_requests 表
ALTER TABLE payment_requests ALTER COLUMN approved_by DROP DEFAULT;
ALTER TABLE payment_requests ALTER COLUMN paid_by DROP DEFAULT;

-- 驗證
SELECT
  table_name,
  column_name,
  column_default,
  CASE WHEN column_default IS NULL THEN '✅ 已移除' ELSE '❌ 還有 DEFAULT' END as status
FROM information_schema.columns
WHERE table_name IN ('todos', 'calendar_events', 'payment_requests')
  AND column_name IN ('creator', 'assignee', 'created_by', 'approved_by', 'paid_by')
ORDER BY table_name, column_name;
