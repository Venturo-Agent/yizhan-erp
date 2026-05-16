-- ============================================================================
-- 砍 tours.closing_status 欄位
-- ============================================================================
--
-- 背景：
--   closing_status 從上線以來全 46 筆都是 'open'（沒人真正結過案）、
--   跟 status 欄位雙軌造成 SSOT 破碎。
--   2026-04-23 code 已全部改成「結案 → status='closed'」不再讀寫 closing_status、
--   本 migration 直接 drop 欄位。
--
--   closing_date、closed_by 保留（結案時間、操作人是有意義的資料）。

ALTER TABLE tours DROP COLUMN IF EXISTS closing_status;
