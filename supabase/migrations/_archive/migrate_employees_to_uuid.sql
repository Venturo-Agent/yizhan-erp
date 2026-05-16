
-- ============================================
-- 架構重構：將 employees.id 遷移到 UUID
-- ============================================
-- 問題：employees.id 使用時間戳記格式，違反最佳實踐
-- 解決：遷移到 UUID，統一整個系統的 ID 策略
-- 資料量：4 個員工（遷移複雜度：低）
-- ============================================

BEGIN;

-- ============================================
-- 第 1 步：準備 employees 表
-- ============================================

-- 1.1 新增 uuid_new 欄位（暫存新的 UUID）
ALTER TABLE employees ADD COLUMN IF NOT EXISTS uuid_new UUID DEFAULT gen_random_uuid();

-- 1.2 為現有員工生成 UUID（如果還沒有）
UPDATE employees SET uuid_new = gen_random_uuid() WHERE uuid_new IS NULL;

-- 1.3 確保 uuid_new 唯一且不為空
ALTER TABLE employees ALTER COLUMN uuid_new SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_uuid_new ON employees(uuid_new);

-- ============================================
-- 第 2 步：建立 ID 映射表（用於資料遷移）
-- ============================================

CREATE TEMP TABLE employee_id_mapping AS
SELECT
  id AS old_id,
  uuid_new AS new_id,
  employee_number,
  display_name
FROM employees;

-- 顯示映射結果
SELECT
  old_id || ' → ' || new_id AS "ID 映射",
  employee_number AS "員工編號",
  display_name AS "姓名"
FROM employee_id_mapping
ORDER BY employee_number;

-- ============================================
-- 第 3 步：更新所有引用 employees.id 的表
-- ============================================

-- 3.1 先檢查哪些表有 employee 相關的欄位
DO $$
DECLARE
  affected_tables TEXT;
BEGIN
  SELECT string_agg(DISTINCT table_name, ', ')
  INTO affected_tables
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND (
      column_name LIKE '%employee%' OR
      column_name LIKE '%author%' OR
      column_name LIKE '%created_by%' OR
      column_name LIKE '%processed_by%'
    );

  RAISE NOTICE '受影響的表: %', affected_tables;
END $$;

-- 3.2 Orders 表（如果有 employee_id）
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'employee_id'
  ) THEN
    -- 新增暫存欄位
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS employee_id_new UUID;

    -- 更新資料（使用映射表）
    UPDATE orders o
    SET employee_id_new = m.new_id
    FROM employee_id_mapping m
    WHERE o.employee_id = m.old_id;

    RAISE NOTICE '✅ orders.employee_id 已更新';
  END IF;
END $$;

-- 3.3 Messages 表
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'author_id'
  ) THEN
    ALTER TABLE messages ADD COLUMN IF NOT EXISTS author_id_new UUID;

    UPDATE messages m
    SET author_id_new = e.uuid_new
    FROM employees e
    WHERE m.author_id = e.id;

    RAISE NOTICE '✅ messages.author_id 已更新';
  END IF;
END $$;

-- 3.4 Bulletins 表
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bulletins' AND column_name = 'author_id'
  ) THEN
    ALTER TABLE bulletins ADD COLUMN IF NOT EXISTS author_id_new UUID;

    UPDATE bulletins b
    SET author_id_new = e.uuid_new
    FROM employees e
    WHERE b.author_id = e.id;

    RAISE NOTICE '✅ bulletins.author_id 已更新';
  END IF;
END $$;

-- 3.5 Channels 表
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'channels' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE channels ADD COLUMN IF NOT EXISTS created_by_new UUID;

    UPDATE channels c
    SET created_by_new = e.uuid_new
    FROM employees e
    WHERE c.created_by = e.id;

    RAISE NOTICE '✅ channels.created_by 已更新';
  END IF;
END $$;

-- 3.6 Workspaces 表
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workspaces' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS created_by_new UUID;

    UPDATE workspaces w
    SET created_by_new = e.uuid_new
    FROM employees e
    WHERE w.created_by = e.id;

    RAISE NOTICE '✅ workspaces.created_by 已更新';
  END IF;
END $$;

-- 3.7 Advance Lists 表
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'advance_lists' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE advance_lists ADD COLUMN IF NOT EXISTS created_by_new UUID;

    UPDATE advance_lists al
    SET created_by_new = e.uuid_new
    FROM employees e
    WHERE al.created_by = e.id;

    RAISE NOTICE '✅ advance_lists.created_by 已更新';
  END IF;
END $$;

-- ============================================
-- 第 4 步：切換到新的 ID
-- ============================================

-- 4.1 移除舊的 id 欄位，改名 uuid_new 為 id
ALTER TABLE employees DROP COLUMN id CASCADE;
ALTER TABLE employees RENAME COLUMN uuid_new TO id;

-- 4.2 設定新的 id 為主鍵
ALTER TABLE employees ADD PRIMARY KEY (id);

-- 4.3 更新其他表的欄位名稱
DO $$
BEGIN
  -- Orders
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'employee_id_new') THEN
    ALTER TABLE orders DROP COLUMN employee_id;
    ALTER TABLE orders RENAME COLUMN employee_id_new TO employee_id;
    ALTER TABLE orders ADD FOREIGN KEY (employee_id) REFERENCES employees(id);
  END IF;

  -- Messages
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'author_id_new') THEN
    ALTER TABLE messages DROP COLUMN author_id;
    ALTER TABLE messages RENAME COLUMN author_id_new TO author_id;
    ALTER TABLE messages ADD FOREIGN KEY (author_id) REFERENCES employees(id);
  END IF;

  -- Bulletins
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bulletins' AND column_name = 'author_id_new') THEN
    ALTER TABLE bulletins DROP COLUMN author_id;
    ALTER TABLE bulletins RENAME COLUMN author_id_new TO author_id;
    ALTER TABLE bulletins ADD FOREIGN KEY (author_id) REFERENCES employees(id);
  END IF;

  -- Channels
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'channels' AND column_name = 'created_by_new') THEN
    ALTER TABLE channels DROP COLUMN created_by;
    ALTER TABLE channels RENAME COLUMN created_by_new TO created_by;
    ALTER TABLE channels ADD FOREIGN KEY (created_by) REFERENCES employees(id);
  END IF;

  -- Workspaces
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workspaces' AND column_name = 'created_by_new') THEN
    ALTER TABLE workspaces DROP COLUMN created_by;
    ALTER TABLE workspaces RENAME COLUMN created_by_new TO created_by;
    ALTER TABLE workspaces ADD FOREIGN KEY (created_by) REFERENCES employees(id);
  END IF;

  -- Advance Lists
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'advance_lists' AND column_name = 'created_by_new') THEN
    ALTER TABLE advance_lists DROP COLUMN created_by;
    ALTER TABLE advance_lists RENAME COLUMN created_by_new TO created_by;
    ALTER TABLE advance_lists ADD FOREIGN KEY (created_by) REFERENCES employees(id);
  END IF;
END $$;

-- ============================================
-- 第 5 步：驗證遷移結果
-- ============================================

-- 5.1 檢查 employees 表
SELECT
  'employees' AS table_name,
  data_type AS id_type
FROM information_schema.columns
WHERE table_name = 'employees' AND column_name = 'id';

-- 5.2 檢查員工資料
SELECT
  id,
  employee_number,
  display_name,
  CASE
    WHEN id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN '✅ UUID'
    ELSE '❌ 非 UUID'
  END AS id_format
FROM employees
ORDER BY employee_number;

-- 5.3 統計資料
SELECT
  (SELECT COUNT(*) FROM employees) AS total_employees,
  (SELECT COUNT(*) FROM employees WHERE id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') AS uuid_count;

COMMIT;

-- ============================================
-- 完成！
-- ============================================
SELECT '✅ employees.id 已成功遷移到 UUID 格式' AS status;
