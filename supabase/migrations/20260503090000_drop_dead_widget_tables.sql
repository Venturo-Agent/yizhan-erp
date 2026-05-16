-- ============================================================================
-- 20260503090000_drop_dead_widget_tables.sql
--
-- T6 後續：砍 3 張死表（聊天系統砍剩的 widget 殘留）
-- - advance_items / advance_lists / shared_order_lists
-- - 全部 0 row、無業務 query、RLS 開但 0 policy（裸圍籬）
-- - N-M04（2026-05-02）砍聊天系統時、widget store 已砍、表沒一起砍
--
-- William 2026-05-02 拍板：「跟它相關的概念都可以刪除掉」
-- ============================================================================

DROP TABLE IF EXISTS public.advance_items CASCADE;
DROP TABLE IF EXISTS public.advance_lists CASCADE;
DROP TABLE IF EXISTS public.shared_order_lists CASCADE;
