-- 補 backfill：公司請款下的 items 的 category_id
-- William 2026-05-21 抓出：5/15 系統自動結算的 2 筆獎金 item（BNS-XIY260311A）沒對上
--
-- 根因：原 backfill 只查 expense_categories.name = items.category AND type IN ('expense','both')
--      漏掉「公司請款下的 item.category 存的是 prefix code（BNS/SAL/...）」這個 case
--
-- 修法：透過 parent request_category='company' + 依 expense_categories.code 反查
-- 影響：2 筆 row（OP 獎金 Carson 1104 + 業務獎金 William 6625、同屬請款單 BNS-XIY260311A）
--
-- 已 apply 到 production：2026-05-21 via mcp__supabase-aierp__apply_migration
-- Verify：57 筆 items（55 tour 42 backfilled / 2 company 2 backfilled）、0 unmapped

BEGIN;

UPDATE public.payment_request_items pri
SET category_id = ec.id
FROM public.payment_requests pr,
     public.expense_categories ec
WHERE pri.request_id = pr.id
  AND pr.request_category = 'company'
  AND ec.code = pri.category
  AND ec.type = 'company_expense'
  AND ec.workspace_id IS NULL
  AND pri.category IS NOT NULL
  AND pri.category != ''
  AND pri.category_id IS NULL;

COMMIT;

-- ════ Rollback ════
-- BEGIN;
-- UPDATE public.payment_request_items pri SET category_id = NULL
-- FROM public.payment_requests pr WHERE pri.request_id = pr.id AND pr.request_category = 'company';
-- COMMIT;
