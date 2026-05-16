-- ============================================
-- 🔧 Venturo 系統完整修正 SQL
-- ============================================
-- 目的：一次性修正所有 employee 引用欄位的 ID 類型問題
-- 執行前請先備份資料庫！
-- ============================================

BEGIN;

-- ============================================
-- Part 1: 修正資料（將舊 ID 改成 William 的 UUID）
-- ============================================

DO $$
DECLARE
  william_uuid TEXT;
  affected_rows INT;
BEGIN
  -- 取得 William 的新 UUID
  SELECT id INTO william_uuid
  FROM employees
  WHERE employee_number = 'william01'
    AND id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}'
  LIMIT 1;

  RAISE NOTICE '===== 開始資料修正 =====';
  RAISE NOTICE 'William UUID: %', william_uuid;

  -- 1. todos 表
  UPDATE todos
  SET
    creator = william_uuid,
    assignee = william_uuid,
    updated_at = NOW()
  WHERE
    creator ~ '^[0-9]{13}'
    OR assignee ~ '^[0-9]{13}';

  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  RAISE NOTICE '✅ todos: % 筆已更新', affected_rows;

  -- 2. calendar_events 表
  UPDATE calendar_events
  SET
    created_by = william_uuid,
    updated_at = NOW()
  WHERE
    created_by IS NOT NULL
    AND created_by ~ '^[0-9]{13}';

  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  RAISE NOTICE '✅ calendar_events: % 筆已更新', affected_rows;

  -- 3. payment_requests 表
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
    (approved_by IS NOT NULL AND approved_by ~ '^[0-9]{13}')
    OR (paid_by IS NOT NULL AND paid_by ~ '^[0-9]{13}');

  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  RAISE NOTICE '✅ payment_requests: % 筆已更新', affected_rows;

  RAISE NOTICE '===== 資料修正完成 =====';
END $$;

-- ============================================
-- Part 2: 修正 Schema（將 TEXT 改成 UUID）
-- ============================================

-- 2.1 todos 表
-- 先移除 default 值
ALTER TABLE todos ALTER COLUMN creator DROP DEFAULT;
ALTER TABLE todos ALTER COLUMN assignee DROP DEFAULT;
-- 再轉換類型
ALTER TABLE todos ALTER COLUMN creator TYPE UUID USING creator::uuid;
ALTER TABLE todos ALTER COLUMN assignee TYPE UUID USING assignee::uuid;

-- 2.2 calendar_events 表
ALTER TABLE calendar_events ALTER COLUMN created_by DROP DEFAULT;
ALTER TABLE calendar_events ALTER COLUMN created_by TYPE UUID USING created_by::uuid;

-- 2.3 payment_requests 表
ALTER TABLE payment_requests ALTER COLUMN approved_by DROP DEFAULT;
ALTER TABLE payment_requests ALTER COLUMN paid_by DROP DEFAULT;
ALTER TABLE payment_requests ALTER COLUMN approved_by TYPE UUID USING approved_by::uuid;
ALTER TABLE payment_requests ALTER COLUMN paid_by TYPE UUID USING paid_by::uuid;

-- ============================================
-- Part 3: 建立外鍵約束
-- ============================================

-- 3.1 todos 表
ALTER TABLE todos
  ADD CONSTRAINT fk_todos_creator
  FOREIGN KEY (creator) REFERENCES employees(id) ON DELETE CASCADE;

ALTER TABLE todos
  ADD CONSTRAINT fk_todos_assignee
  FOREIGN KEY (assignee) REFERENCES employees(id) ON DELETE SET NULL;

-- 3.2 calendar_events 表
ALTER TABLE calendar_events
  ADD CONSTRAINT fk_calendar_events_created_by
  FOREIGN KEY (created_by) REFERENCES employees(id) ON DELETE CASCADE;

-- 3.3 payment_requests 表
ALTER TABLE payment_requests
  ADD CONSTRAINT fk_payment_requests_approved_by
  FOREIGN KEY (approved_by) REFERENCES employees(id) ON DELETE SET NULL;

ALTER TABLE payment_requests
  ADD CONSTRAINT fk_payment_requests_paid_by
  FOREIGN KEY (paid_by) REFERENCES employees(id) ON DELETE SET NULL;

-- ============================================
-- Part 4: 驗證修正結果
-- ============================================

-- 4.1 檢查欄位類型
SELECT
  '驗證：欄位類型' as check_type,
  table_name,
  column_name,
  data_type,
  CASE WHEN data_type = 'uuid' THEN '✅' ELSE '❌' END as status
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    (table_name = 'todos' AND column_name IN ('creator', 'assignee'))
    OR (table_name = 'calendar_events' AND column_name = 'created_by')
    OR (table_name = 'payment_requests' AND column_name IN ('approved_by', 'paid_by'))
  )
ORDER BY table_name, column_name;

-- 4.2 檢查外鍵約束
SELECT
  '驗證：外鍵約束' as check_type,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table,
  CASE WHEN ccu.table_name = 'employees' THEN '✅' ELSE '❌' END as status
FROM information_schema.table_constraints AS tc
  JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
  JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND tc.table_name IN ('todos', 'calendar_events', 'payment_requests')
ORDER BY tc.table_name, kcu.column_name;

-- 4.3 檢查是否還有舊 ID（應該都是 0）
SELECT
  '驗證：舊 ID 檢查' as check_type,
  '如果下面所有 count 都是 0，表示修正成功' as note;

SELECT
  'todos.creator' as field,
  COUNT(CASE WHEN creator::text ~ '^[0-9]{13}' THEN 1 END) as old_id_count,
  CASE WHEN COUNT(CASE WHEN creator::text ~ '^[0-9]{13}' THEN 1 END) = 0 THEN '✅' ELSE '❌' END as status
FROM todos;

SELECT
  'todos.assignee' as field,
  COUNT(CASE WHEN assignee::text ~ '^[0-9]{13}' THEN 1 END) as old_id_count,
  CASE WHEN COUNT(CASE WHEN assignee::text ~ '^[0-9]{13}' THEN 1 END) = 0 THEN '✅' ELSE '❌' END as status
FROM todos;

SELECT
  'calendar_events.created_by' as field,
  COUNT(CASE WHEN created_by::text ~ '^[0-9]{13}' THEN 1 END) as old_id_count,
  CASE WHEN COUNT(CASE WHEN created_by::text ~ '^[0-9]{13}' THEN 1 END) = 0 THEN '✅' ELSE '❌' END as status
FROM calendar_events
WHERE created_by IS NOT NULL;

COMMIT;

-- ============================================
-- 完成訊息
-- ============================================

SELECT
  '🎉 系統完整修正完成！' as status,
  '所有 employee 引用欄位已統一為 UUID 格式' as message,
  '已建立完整的外鍵約束' as detail;
