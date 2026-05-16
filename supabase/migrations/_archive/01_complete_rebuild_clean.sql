-- ============================================
-- 🏗️ Venturo 完整資料庫重建（清空版）
-- ============================================
-- 警告：此腳本會刪除所有資料！
-- 目的：建立完全正確、統一規範的資料庫結構
-- ============================================

BEGIN;

-- ============================================
-- Part 1: 清除舊表（含所有資料）
-- ============================================

DROP TABLE IF EXISTS todos CASCADE;
DROP TABLE IF EXISTS calendar_events CASCADE;
DROP TABLE IF EXISTS payment_requests CASCADE;

-- ============================================
-- Part 2: 建立 Todos 表（正確結構）
-- ============================================

CREATE TABLE todos (
  -- 主鍵
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 基本資訊
  title TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
  deadline TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  completed BOOLEAN DEFAULT FALSE,

  -- 人員關係（UUID 格式 + 外鍵）
  creator UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  assignee UUID REFERENCES employees(id) ON DELETE SET NULL,
  visibility TEXT[] DEFAULT '{}',

  -- 關聯資料（JSONB）
  related_items JSONB DEFAULT '[]',
  sub_tasks JSONB DEFAULT '[]',
  notes JSONB DEFAULT '[]',
  enabled_quick_actions TEXT[] DEFAULT '{}',

  -- 通知標記
  needs_creator_notification BOOLEAN DEFAULT FALSE,

  -- 系統欄位
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 建立索引
CREATE INDEX idx_todos_creator ON todos(creator);
CREATE INDEX idx_todos_assignee ON todos(assignee);
CREATE INDEX idx_todos_status ON todos(status);
CREATE INDEX idx_todos_deadline ON todos(deadline);
CREATE INDEX idx_todos_priority ON todos(priority);

-- ============================================
-- Part 3: 建立 Calendar Events 表（正確結構）
-- ============================================

CREATE TABLE calendar_events (
  -- 主鍵
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 基本資訊
  title TEXT NOT NULL,
  description TEXT,
  start TIMESTAMPTZ NOT NULL,
  "end" TIMESTAMPTZ NOT NULL,
  all_day BOOLEAN DEFAULT FALSE,

  -- 類型與樣式
  type TEXT NOT NULL DEFAULT 'other' CHECK (type IN ('tour', 'meeting', 'task', 'reminder', 'other')),
  color TEXT,

  -- 可見性
  visibility TEXT NOT NULL DEFAULT 'personal' CHECK (visibility IN ('personal', 'company')),

  -- 關聯資料
  related_tour_id UUID,
  related_order_id UUID,

  -- 參與者
  attendees TEXT[] DEFAULT '{}',

  -- 提醒設定
  reminder_minutes INTEGER,

  -- 重複事件
  recurring TEXT CHECK (recurring IN ('daily', 'weekly', 'monthly', 'yearly')),
  recurring_until TIMESTAMPTZ,

  -- 擁有者（UUID 格式 + 外鍵）
  owner_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,

  -- 系統欄位
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 建立索引
CREATE INDEX idx_calendar_events_owner_id ON calendar_events(owner_id);
CREATE INDEX idx_calendar_events_start ON calendar_events(start);
CREATE INDEX idx_calendar_events_end ON calendar_events("end");
CREATE INDEX idx_calendar_events_type ON calendar_events(type);

-- ============================================
-- Part 4: 建立 Payment Requests 表（正確結構）
-- ============================================

CREATE TABLE payment_requests (
  -- 主鍵
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 編號
  code TEXT NOT NULL UNIQUE,

  -- 關聯
  tour_id UUID,

  -- 申請資訊
  request_type TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,

  -- 供應商資訊
  supplier_id UUID,
  supplier_name TEXT,

  -- 狀態
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'rejected')),

  -- 審批與支付（UUID 格式 + 外鍵）
  approved_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  paid_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  paid_at TIMESTAMPTZ,

  -- 備註
  notes TEXT,

  -- 系統欄位
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 建立索引
CREATE INDEX idx_payment_requests_code ON payment_requests(code);
CREATE INDEX idx_payment_requests_tour_id ON payment_requests(tour_id);
CREATE INDEX idx_payment_requests_status ON payment_requests(status);
CREATE INDEX idx_payment_requests_approved_by ON payment_requests(approved_by);
CREATE INDEX idx_payment_requests_paid_by ON payment_requests(paid_by);

-- ============================================
-- Part 5: 建立更新時間觸發器
-- ============================================

-- 更新 updated_at 的函數
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 為每個表建立觸發器
CREATE TRIGGER update_todos_updated_at
  BEFORE UPDATE ON todos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calendar_events_updated_at
  BEFORE UPDATE ON calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_requests_updated_at
  BEFORE UPDATE ON payment_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMIT;

-- ============================================
-- Part 6: 驗證結果
-- ============================================

-- 檢查表是否建立成功
SELECT
  '✅ 表格建立驗證' as check_type,
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE columns.table_name = tables.table_name) as column_count
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('todos', 'calendar_events', 'payment_requests')
ORDER BY table_name;

-- 檢查所有 employee 引用欄位的類型
SELECT
  '✅ UUID 類型驗證' as check_type,
  table_name,
  column_name,
  data_type,
  CASE WHEN data_type = 'uuid' THEN '✅ 正確' ELSE '❌ 錯誤' END as status
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    (table_name = 'todos' AND column_name IN ('creator', 'assignee'))
    OR (table_name = 'calendar_events' AND column_name = 'owner_id')
    OR (table_name = 'payment_requests' AND column_name IN ('approved_by', 'paid_by'))
  )
ORDER BY table_name, column_name;

-- 檢查外鍵約束
SELECT
  '✅ 外鍵約束驗證' as check_type,
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

-- 檢查資料筆數（應該都是 0）
SELECT
  '📊 資料統計' as info,
  (SELECT COUNT(*) FROM todos) as todos_count,
  (SELECT COUNT(*) FROM calendar_events) as calendar_events_count,
  (SELECT COUNT(*) FROM payment_requests) as payment_requests_count;

-- ============================================
-- 完成訊息
-- ============================================

SELECT
  '🎉 資料庫重建完成！' as status,
  '所有表格結構完全正確' as message,
  '所有 employee 引用欄位都是 UUID 格式' as detail1,
  '已建立完整的外鍵約束' as detail2,
  '系統可以開始使用了！' as next_step;
