-- =============================================
-- accounting_accounts / accounting_transactions 死表清理（retry）
-- 2026-05-03
--
-- 背景：
--   20260423220000_drop_dead_accounting_tables.sql 嘗試砍這兩張表、但 FK 順序錯
--   （accounting_transactions 有 FK 指 accounting_accounts、卻先 DROP 被引用方）、
--   DROP IF EXISTS 失敗。driver 沒 raise exception 就把 migration 標記成功、
--   但實際 DDL 沒生效、production 兩張表仍在（皆 0 筆）。
--
-- 修正：
--   1. 先砍 accounting_transactions（引用方）
--   2. 再砍 accounting_accounts（被引用方）
--
-- 驗證（2026-05-03）：
--   - accounting_accounts: 0 rows、accounting_transactions: 0 rows
--   - code grep .from(): 0 處引用（只剩註解 + 自動產生的 types.ts）
-- =============================================

DROP TABLE IF EXISTS public.accounting_transactions;
DROP TABLE IF EXISTS public.accounting_accounts;
