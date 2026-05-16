-- ============================================
-- 🧹 Venturo 完全清空重置（保留員工）
-- ============================================
-- 目的：清空所有業務資料，保留基礎設定
-- 保留：employees, regions, suppliers 等基礎資料
-- 清空：tours, orders, workspace 等業務資料
-- ============================================

BEGIN;

-- ============================================
-- Part 1: 清空所有業務資料表
-- ============================================

-- 工作空間相關（全部清空）
TRUNCATE TABLE messages CASCADE;
TRUNCATE TABLE bulletins CASCADE;
TRUNCATE TABLE advance_lists CASCADE;
TRUNCATE TABLE shared_order_lists CASCADE;
TRUNCATE TABLE channels CASCADE;
TRUNCATE TABLE channel_groups CASCADE;
TRUNCATE TABLE workspaces CASCADE;

-- 核心業務資料（全部清空）
TRUNCATE TABLE todos CASCADE;
TRUNCATE TABLE calendar_events CASCADE;
TRUNCATE TABLE payment_requests CASCADE;
TRUNCATE TABLE expenses CASCADE;
TRUNCATE TABLE tour_expenses CASCADE;
TRUNCATE TABLE order_items CASCADE;
TRUNCATE TABLE orders CASCADE;
TRUNCATE TABLE tours CASCADE;

-- ============================================
-- Part 2: 驗證結果
-- ============================================

-- 檢查資料筆數（應該都是 0）
SELECT
  '📊 清空後資料統計' as info,
  'tours' as table_name,
  (SELECT COUNT(*) FROM tours) as count
UNION ALL
SELECT '', 'orders', (SELECT COUNT(*) FROM orders)
UNION ALL
SELECT '', 'todos', (SELECT COUNT(*) FROM todos)
UNION ALL
SELECT '', 'calendar_events', (SELECT COUNT(*) FROM calendar_events)
UNION ALL
SELECT '', 'payment_requests', (SELECT COUNT(*) FROM payment_requests)
UNION ALL
SELECT '', 'workspaces', (SELECT COUNT(*) FROM workspaces)
UNION ALL
SELECT '', 'channels', (SELECT COUNT(*) FROM channels)
UNION ALL
SELECT '', 'messages', (SELECT COUNT(*) FROM messages);

-- 檢查保留的資料（應該有資料）
SELECT
  '✅ 保留的基礎資料' as info,
  'employees' as table_name,
  (SELECT COUNT(*) FROM employees) as count
UNION ALL
SELECT '', 'regions', (SELECT COUNT(*) FROM regions)
UNION ALL
SELECT '', 'suppliers', (SELECT COUNT(*) FROM suppliers);

COMMIT;

-- ============================================
-- 完成訊息
-- ============================================

SELECT
  '🎉 資料庫清空完成！' as status,
  '所有業務資料已清空' as message,
  '員工與基礎設定已保留' as detail1,
  '系統可以重新開始使用' as next_step;
