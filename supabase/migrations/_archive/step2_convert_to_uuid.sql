-- Step 2: 轉換類型為 UUID（確認 Step 1 執行成功後再執行）

BEGIN;

-- 轉換 todos 表
ALTER TABLE todos ALTER COLUMN creator TYPE UUID USING creator::uuid;
ALTER TABLE todos ALTER COLUMN assignee TYPE UUID USING assignee::uuid;

-- 轉換 calendar_events 表
ALTER TABLE calendar_events ALTER COLUMN created_by TYPE UUID USING created_by::uuid;

-- 轉換 payment_requests 表
ALTER TABLE payment_requests ALTER COLUMN approved_by TYPE UUID USING approved_by::uuid;
ALTER TABLE payment_requests ALTER COLUMN paid_by TYPE UUID USING paid_by::uuid;

-- 建立外鍵約束
ALTER TABLE todos
  ADD CONSTRAINT fk_todos_creator
  FOREIGN KEY (creator) REFERENCES employees(id) ON DELETE CASCADE;

ALTER TABLE todos
  ADD CONSTRAINT fk_todos_assignee
  FOREIGN KEY (assignee) REFERENCES employees(id) ON DELETE SET NULL;

ALTER TABLE calendar_events
  ADD CONSTRAINT fk_calendar_events_created_by
  FOREIGN KEY (created_by) REFERENCES employees(id) ON DELETE CASCADE;

ALTER TABLE payment_requests
  ADD CONSTRAINT fk_payment_requests_approved_by
  FOREIGN KEY (approved_by) REFERENCES employees(id) ON DELETE SET NULL;

ALTER TABLE payment_requests
  ADD CONSTRAINT fk_payment_requests_paid_by
  FOREIGN KEY (paid_by) REFERENCES employees(id) ON DELETE SET NULL;

COMMIT;

-- 驗證結果
SELECT
  '驗證：欄位類型' as check_type,
  table_name,
  column_name,
  data_type,
  CASE WHEN data_type = 'uuid' THEN '✅' ELSE '❌' END as status
FROM information_schema.columns
WHERE table_name IN ('todos', 'calendar_events', 'payment_requests')
  AND column_name IN ('creator', 'assignee', 'created_by', 'approved_by', 'paid_by')
ORDER BY table_name, column_name;

SELECT '🎉 轉換完成！所有 employee 引用欄位已統一為 UUID' as message;
