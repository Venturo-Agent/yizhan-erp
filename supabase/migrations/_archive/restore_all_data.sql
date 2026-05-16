-- ============================================
-- 🔄 資料還原腳本
-- ============================================
-- 目的：將備份的資料還原到新的正確 schema
-- 執行時機：執行 00_complete_schema_rebuild.sql 之後
-- ============================================

-- 重要：還原前需要先取得 William 的正確 UUID
DO $$
DECLARE
  william_uuid UUID;
BEGIN
  -- 取得 William 的 UUID
  SELECT id INTO william_uuid
  FROM employees
  WHERE employee_number = 'william01'
  LIMIT 1;

  IF william_uuid IS NULL THEN
    RAISE EXCEPTION 'William 的 employee 記錄不存在，請先建立';
  END IF;

  RAISE NOTICE '✅ William UUID: %', william_uuid;
END $$;

-- ============================================
-- Part 1: 還原 Todos（手動插入範例）
-- ============================================

-- 請將備份的資料根據以下格式插入：
-- 注意：creator 和 assignee 如果是舊 ID，需要改成正確的 UUID

/*
範例：

INSERT INTO todos (
  id,
  title,
  description,
  status,
  priority,
  due_date,
  creator,
  assignee,
  created_at,
  updated_at
)
VALUES
(
  'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',  -- 原始 ID
  '待辦事項標題',
  '描述',
  'pending',
  'high',
  '2025-01-22 10:00:00+00',
  (SELECT id FROM employees WHERE employee_number = 'william01'),  -- 自動取得 William UUID
  (SELECT id FROM employees WHERE employee_number = 'william01'),  -- 自動取得 William UUID
  '2025-01-15 08:00:00+00',
  '2025-01-15 08:00:00+00'
);
*/

-- ============================================
-- Part 2: 還原 Calendar Events（手動插入範例）
-- ============================================

/*
INSERT INTO calendar_events (
  id,
  title,
  description,
  start_time,
  end_time,
  event_type,
  location,
  created_by,
  created_at,
  updated_at
)
VALUES
(
  'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
  '會議標題',
  '會議描述',
  '2025-01-22 10:00:00+00',
  '2025-01-22 11:00:00+00',
  'meeting',
  '會議室A',
  (SELECT id FROM employees WHERE employee_number = 'william01'),
  '2025-01-15 08:00:00+00',
  '2025-01-15 08:00:00+00'
);
*/

-- ============================================
-- Part 3: 還原 Payment Requests（手動插入範例）
-- ============================================

/*
INSERT INTO payment_requests (
  id,
  amount,
  currency,
  purpose,
  status,
  payment_date,
  requester,
  approved_by,
  paid_by,
  created_at,
  updated_at
)
VALUES
(
  'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
  10000.00,
  'TWD',
  '辦公用品採購',
  'approved',
  '2025-01-20 00:00:00+00',
  (SELECT id FROM employees WHERE employee_number = 'william01'),
  (SELECT id FROM employees WHERE employee_number = 'william01'),
  (SELECT id FROM employees WHERE employee_number = 'william01'),
  '2025-01-15 08:00:00+00',
  '2025-01-15 08:00:00+00'
);
*/

-- ============================================
-- Part 4: 驗證還原結果
-- ============================================

SELECT
  '✅ 還原統計' as info,
  (SELECT COUNT(*) FROM todos) as todos_count,
  (SELECT COUNT(*) FROM calendar_events) as calendar_events_count,
  (SELECT COUNT(*) FROM payment_requests) as payment_requests_count;

-- 檢查所有 employee 引用都是有效的 UUID
SELECT
  '✅ ID 格式驗證' as check_type,
  'todos' as table_name,
  COUNT(*) as total,
  COUNT(CASE WHEN creator IS NOT NULL THEN 1 END) as valid_creators,
  COUNT(CASE WHEN assignee IS NOT NULL THEN 1 END) as valid_assignees
FROM todos;

-- ============================================
-- 完成訊息
-- ============================================

SELECT
  '🎉 資料還原完成！' as status,
  '請檢查前端頁面是否正常顯示' as next_step;
