-- ============================================
-- 🏗️ Venturo 完整資料庫重建方案
-- ============================================
-- 目的：建立完全正確、規範統一的資料庫結構
-- 執行前：請先執行 backup_all_data.sql 備份所有資料
-- ============================================

-- ============================================
-- Part 0: 清理舊的錯誤結構（危險操作，確保已備份）
-- ============================================

-- 注意：這會刪除所有資料，執行前請確認已備份！
-- DROP TABLE IF EXISTS todos CASCADE;
-- DROP TABLE IF EXISTS calendar_events CASCADE;
-- DROP TABLE IF EXISTS payment_requests CASCADE;

-- ============================================
-- Part 1: 建立核心規範
-- ============================================

-- 所有 employee 引用欄位統一規範：
-- ✅ 類型：UUID（不是 TEXT）
-- ✅ 外鍵：指向 employees(id)
-- ✅ 命名：snake_case
-- ✅ 無 DEFAULT 值（除非有合理理由）

-- ============================================
-- Part 2: Todos 表（待辦事項）
-- ============================================

CREATE TABLE IF NOT EXISTS todos (
  -- 主鍵
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 待辦資訊
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  priority TEXT DEFAULT 'medium',
  due_date TIMESTAMPTZ,

  -- Employee 引用（正確的 UUID 格式 + 外鍵）
  creator UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  assignee UUID REFERENCES employees(id) ON DELETE SET NULL,

  -- 系統欄位
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  _deleted BOOLEAN DEFAULT FALSE,
  _needs_sync BOOLEAN DEFAULT FALSE,
  _synced_at TIMESTAMPTZ
);

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_todos_creator ON todos(creator);
CREATE INDEX IF NOT EXISTS idx_todos_assignee ON todos(assignee);
CREATE INDEX IF NOT EXISTS idx_todos_status ON todos(status);
CREATE INDEX IF NOT EXISTS idx_todos_due_date ON todos(due_date);

-- ============================================
-- Part 3: Calendar Events 表（行事曆事件）
-- ============================================

CREATE TABLE IF NOT EXISTS calendar_events (
  -- 主鍵
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 事件資訊
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  event_type TEXT,
  location TEXT,

  -- Employee 引用（正確的 UUID 格式 + 外鍵）
  created_by UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,

  -- 系統欄位
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  _deleted BOOLEAN DEFAULT FALSE,
  _needs_sync BOOLEAN DEFAULT FALSE,
  _synced_at TIMESTAMPTZ
);

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_calendar_events_created_by ON calendar_events(created_by);
CREATE INDEX IF NOT EXISTS idx_calendar_events_start_time ON calendar_events(start_time);

-- ============================================
-- Part 4: Payment Requests 表（付款申請）
-- ============================================

CREATE TABLE IF NOT EXISTS payment_requests (
  -- 主鍵
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 付款資訊
  amount DECIMAL(12, 2) NOT NULL,
  currency TEXT DEFAULT 'TWD',
  purpose TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_date TIMESTAMPTZ,

  -- Employee 引用（正確的 UUID 格式 + 外鍵）
  requester UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  approved_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  paid_by UUID REFERENCES employees(id) ON DELETE SET NULL,

  -- 系統欄位
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  _deleted BOOLEAN DEFAULT FALSE,
  _needs_sync BOOLEAN DEFAULT FALSE,
  _synced_at TIMESTAMPTZ
);

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_payment_requests_requester ON payment_requests(requester);
CREATE INDEX IF NOT EXISTS idx_payment_requests_approved_by ON payment_requests(approved_by);
CREATE INDEX IF NOT EXISTS idx_payment_requests_status ON payment_requests(status);

-- ============================================
-- Part 5: 驗證 Schema 正確性
-- ============================================

-- 檢查所有 employee 引用欄位的類型
SELECT
  '✅ Schema 驗證' as check_type,
  table_name,
  column_name,
  data_type,
  CASE WHEN data_type = 'uuid' THEN '✅ 正確' ELSE '❌ 錯誤' END as status
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    (table_name = 'todos' AND column_name IN ('creator', 'assignee'))
    OR (table_name = 'calendar_events' AND column_name = 'created_by')
    OR (table_name = 'payment_requests' AND column_name IN ('requester', 'approved_by', 'paid_by'))
  )
ORDER BY table_name, column_name;

-- 檢查外鍵約束
SELECT
  '✅ 外鍵驗證' as check_type,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table,
  CASE WHEN ccu.table_name = 'employees' THEN '✅ 正確' ELSE '❌ 錯誤' END as status
FROM information_schema.table_constraints AS tc
  JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
  JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND tc.table_name IN ('todos', 'calendar_events', 'payment_requests')
ORDER BY tc.table_name, kcu.column_name;

-- ============================================
-- 完成訊息
-- ============================================

SELECT
  '🎉 資料庫結構重建完成！' as status,
  '所有表格都按照統一規範建立' as message,
  '下一步：執行 restore_all_data.sql 還原資料' as next_step;
