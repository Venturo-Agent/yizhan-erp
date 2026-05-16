-- =============================================
-- Wave 14e — Drop accounting_accounts + accounting_transactions 兩張死表
-- 2026-04-23
--
-- 背景：
--   兩張表是早期「個人記帳 app」遺留（非公司會計）、從未被真正使用。
--   Wave 13 已把 accounting-store.ts 縮成 zero-stub、移除了對這兩張表的 7 處 DB query。
--
-- 驗證結論：
--   - 兩張表 DB 都是 0 筆資料
--   - 無其他表 FK 指向這兩張（grep REFERENCES 全無）
--   - 程式碼 0 處 .from('accounting_accounts' / 'accounting_transactions') 呼叫
--     （僅剩 accounting-store.ts 註解提到歷史、非 code reference）
--
-- 安全 drop、無遷移需求。
-- =============================================

DROP TABLE IF EXISTS public.accounting_accounts;
DROP TABLE IF EXISTS public.accounting_transactions;
