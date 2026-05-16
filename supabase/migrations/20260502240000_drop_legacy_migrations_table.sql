-- ============================================================================
-- Task F5: 統一 migration tracking SSOT
-- ============================================================================
-- 背景：ERP 之前同時存在兩套 migration tracking：
--   1. supabase_migrations.schema_migrations  (Supabase CLI 標準)
--   2. public._migrations                     (早期 ERP 自製)
-- 兩套並存違反 VENTURO_ERP_STANDARDS.md Section 10 #15（同類資源存兩份），
-- 導致 E1 寫到 _migrations、E2/E3 寫到 schema_migrations、互不可見、無法
-- 統一 replay。
--
-- 處理：
--   1. 已將 public._migrations 中所有有 14 位 timestamp 的歷史記錄
--      backfill 到 supabase_migrations.schema_migrations（22 筆）。
--   2. 沒 timestamp 前綴的 8 筆都已在 schema_migrations 有對應記錄。
--   3. scripts/db-migrate.js / run-single-migration.js 已改成寫
--      supabase_migrations.schema_migrations。
--   4. health/db API 早就用 schema_migrations。
--
-- SSOT：supabase_migrations.schema_migrations
-- ============================================================================

BEGIN;

-- CASCADE 解掉可能附在表上的 trigger / FK / dependent objects
DROP TABLE IF EXISTS public._migrations CASCADE;

COMMIT;
