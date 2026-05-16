-- =============================================
-- 拆 travel_invoices 鬼屋（待 William 拍板）
-- 2026-05-03
--
-- 背景：
--   travel_invoices 是「半棟蓋一半的鬼屋」：
--     - 表 + 4 RLS + 2 trigger + 7 index 都建了、但 0 筆資料
--     - 4 個 SQL function（其中 2 個依賴不存在的 invoice_orders 表）
--     - 1 個 view（orders_invoice_summary）依賴 invoice_orders 表
--     - 完全沒 API、沒 UI、沒藍新串接 code
--
--   William 拍板：砍掉重做、之後要做藍新代轉時、整套重蓋。
--
-- 砍除順序：
--   1. View（依賴 functions）
--   2. Functions（依賴 invoice_orders 表、但不依賴 travel_invoices）
--   3. Table travel_invoices（連帶 RLS / trigger / index）
--
-- 安全檢查：
--   ✅ travel_invoices 0 筆資料
--   ✅ 沒有任何 cron job 排程到 send_daily_invoice_reminder
--   ✅ code 只剩 1 處 query（tour_dependency.service.ts、會在 code 清理時拿掉）
--
-- 紅線檢查：
--   ✅ 不違反 #0：travel_invoices 0 筆、可砍
--   ✅ 不違反 #1：跟 workspaces RLS 無關
--   ✅ 不違反 #2：跟審計欄位 FK 無關
-- =============================================

BEGIN;

-- 1. 砍 view
DROP VIEW IF EXISTS public.orders_invoice_summary;

-- 2. 砍 4 個 SQL function（兩種簽名都試、實際 production 是 text 簽名）
DROP FUNCTION IF EXISTS public.get_order_invoiceable_amount(uuid);
DROP FUNCTION IF EXISTS public.get_order_invoiced_amount(uuid);
DROP FUNCTION IF EXISTS public.get_order_invoiceable_amount(text);
DROP FUNCTION IF EXISTS public.get_order_invoiced_amount(text);
DROP FUNCTION IF EXISTS public.run_invoice_reminder_now();
DROP FUNCTION IF EXISTS public.send_daily_invoice_reminder();

-- 3. 砍 table（連 RLS / trigger / index 一起）
DROP TABLE IF EXISTS public.travel_invoices CASCADE;

COMMIT;
