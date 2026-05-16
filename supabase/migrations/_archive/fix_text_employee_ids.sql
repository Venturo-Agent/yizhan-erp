-- 修正所有 TEXT 類型的 employee 引用欄位
-- 將舊的時間戳記 ID 改成 William 的新 UUID

BEGIN;

-- William 的新 UUID
-- 從 employees 表取得（以 employee_number = 'william01' 且 id 是 UUID 格式為準）
DO $$
DECLARE
  william_uuid TEXT;
BEGIN
  -- 取得 William 的新 UUID
  SELECT id INTO william_uuid
  FROM employees
  WHERE employee_number = 'william01'
    AND id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}'
  LIMIT 1;

  RAISE NOTICE 'William UUID: %', william_uuid;

  -- 1️⃣ 修正 todos.creator 和 todos.assignee
  UPDATE todos
  SET
    creator = william_uuid,
    assignee = william_uuid,
    updated_at = NOW()
  WHERE
    creator ~ '^[0-9]{13}'
    OR assignee ~ '^[0-9]{13}';

  RAISE NOTICE '✅ todos 表已更新';

  -- 2️⃣ 修正 calendar_events.created_by
  UPDATE calendar_events
  SET
    created_by = william_uuid,
    updated_at = NOW()
  WHERE
    created_by ~ '^[0-9]{13}';

  RAISE NOTICE '✅ calendar_events 表已更新';

  -- 3️⃣ 修正 payment_requests.approved_by 和 paid_by
  UPDATE payment_requests
  SET
    approved_by = CASE
      WHEN approved_by ~ '^[0-9]{13}' THEN william_uuid
      ELSE approved_by
    END,
    paid_by = CASE
      WHEN paid_by ~ '^[0-9]{13}' THEN william_uuid
      ELSE paid_by
    END,
    updated_at = NOW()
  WHERE
    approved_by ~ '^[0-9]{13}'
    OR paid_by ~ '^[0-9]{13}';

  RAISE NOTICE '✅ payment_requests 表已更新';

END $$;

-- 驗證結果
SELECT
  '驗證：todos' as table_name,
  COUNT(*) as total,
  COUNT(CASE WHEN creator ~ '^[0-9]{13}' THEN 1 END) as old_creator_count,
  COUNT(CASE WHEN assignee ~ '^[0-9]{13}' THEN 1 END) as old_assignee_count
FROM todos;

SELECT
  '驗證：calendar_events' as table_name,
  COUNT(*) as total,
  COUNT(CASE WHEN created_by ~ '^[0-9]{13}' THEN 1 END) as old_id_count
FROM calendar_events
WHERE created_by IS NOT NULL;

SELECT
  '驗證：payment_requests' as table_name,
  COUNT(*) as total,
  COUNT(CASE WHEN approved_by ~ '^[0-9]{13}' THEN 1 END) as old_approved_count,
  COUNT(CASE WHEN paid_by ~ '^[0-9]{13}' THEN 1 END) as old_paid_count
FROM payment_requests
WHERE approved_by IS NOT NULL OR paid_by IS NOT NULL;

COMMIT;

SELECT '✅ 所有 TEXT 類型的 employee ID 已修正完成！' as status;
