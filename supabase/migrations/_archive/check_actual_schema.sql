-- 檢查實際的表結構

-- 檢查 todos 表結構
SELECT
  '📋 todos 表結構' as info,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'todos'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 檢查 calendar_events 表結構
SELECT
  '📅 calendar_events 表結構' as info,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'calendar_events'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 檢查 payment_requests 表結構
SELECT
  '💰 payment_requests 表結構' as info,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'payment_requests'
  AND table_schema = 'public'
ORDER BY ordinal_position;
