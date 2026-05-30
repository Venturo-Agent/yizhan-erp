-- 目的：把 orders.sales_person 舊字串（WILLIAM/William 大小寫、英文暱稱 Carson/Emma、
--       「陳建文快離職」「小君」「克勤」等別名）統一覆蓋成該訂單實際綁定業務員（sales_id）
--       的當前中文名。對照已用 sales_id JOIN employees 查證、共 36 筆。
--
-- 為什麼：5/29 起訂單頁業務員欄已即時讀員工中文名顯示（commit 7c8a8c90），
--         但 DB 內 sales_person 仍存舊字串、影響日後匯出/報表/搜尋的一致性。
--         本 migration 只洗「存的字串」、不動 schema、不動 RLS。
--
-- 破壞性（覆蓋舊字串、不可逆）→ 先備份到 backup 表、rollback 從備份還原（見檔尾）。
BEGIN;

-- 1) 備份退路（只備有綁業務員的列）
CREATE TABLE IF NOT EXISTS _backup_orders_sales_person_20260530 AS
SELECT id, sales_person, sales_id FROM orders WHERE sales_id IS NOT NULL;

-- 2) 覆蓋成員工當前中文名（只洗真的對不上、且員工有中文名的列）
UPDATE orders o
SET sales_person = e.chinese_name, updated_at = now()
FROM employees e
WHERE o.sales_id = e.id
  AND o.deleted_at IS NULL
  AND e.chinese_name IS NOT NULL AND e.chinese_name <> ''
  AND o.sales_person IS DISTINCT FROM e.chinese_name;

COMMIT;

-- rollback（如需還原）：
-- BEGIN;
-- UPDATE orders o SET sales_person = b.sales_person
-- FROM _backup_orders_sales_person_20260530 b WHERE o.id = b.id;
-- COMMIT;
-- DROP TABLE _backup_orders_sales_person_20260530;
