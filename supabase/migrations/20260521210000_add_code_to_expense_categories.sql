-- Phase 3：expense_categories 加 code 欄位、砍 useRequestOperations 過渡寫死 map
-- William 2026-05-21 拍板：公司編號要放進 settings、徹底乾淨
--
-- 動的事：
-- 1. 加 code text 欄位（公司請款編號 prefix：SAL/BNS/ENT/TRV/OFC/UTL/ETC）
-- 2. 加 partial unique index：同 workspace + type 不可重複 code
-- 3. Backfill 7 個系統預設公司支出類別的 code
--
-- 設計考量：
-- - 只 company_expense type 才需要 code（給 RPC 編號 prefix）
-- - tour expense type 不需要、用名字當顯示就夠
-- - workspace_id IS NULL（系統預設）跟有 workspace_id 各自的 code 不衝突
--
-- 已 apply 到 production：2026-05-21 via mcp__supabase-aierp__apply_migration

BEGIN;

-- ─────────────────────────────────────────
-- 1. 加 code text 欄位
-- ─────────────────────────────────────────
ALTER TABLE public.expense_categories
  ADD COLUMN IF NOT EXISTS code text;

COMMENT ON COLUMN public.expense_categories.code IS '編號 prefix（公司請款用、如 SAL/BNS/ENT/TRV/OFC/UTL/ETC）、type=company_expense 才需要';

-- ─────────────────────────────────────────
-- 2. 加 partial unique index
--    同 workspace + type 不可重複 code（系統預設跟 user 自設各自獨立 namespace）
-- ─────────────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS idx_expense_categories_code_unique
  ON public.expense_categories(workspace_id, type, code)
  WHERE code IS NOT NULL;

-- ─────────────────────────────────────────
-- 3. Backfill 7 個系統預設公司支出代碼
-- ─────────────────────────────────────────
UPDATE public.expense_categories SET code = 'SAL' WHERE name = '薪資'    AND type = 'company_expense' AND workspace_id IS NULL;
UPDATE public.expense_categories SET code = 'OFC' WHERE name = '辦公費'  AND type = 'company_expense' AND workspace_id IS NULL;
UPDATE public.expense_categories SET code = 'UTL' WHERE name = '水電費'  AND type = 'company_expense' AND workspace_id IS NULL;
UPDATE public.expense_categories SET code = 'TRV' WHERE name = '差旅費'  AND type = 'company_expense' AND workspace_id IS NULL;
UPDATE public.expense_categories SET code = 'ENT' WHERE name = '交際費'  AND type = 'company_expense' AND workspace_id IS NULL;
UPDATE public.expense_categories SET code = 'BNS' WHERE name = '獎金'    AND type = 'company_expense' AND workspace_id IS NULL;
UPDATE public.expense_categories SET code = 'ETC' WHERE name = '雜支'    AND type = 'company_expense' AND workspace_id IS NULL;

COMMIT;

-- ════ Rollback ════
-- BEGIN;
-- DROP INDEX IF EXISTS idx_expense_categories_code_unique;
-- ALTER TABLE public.expense_categories DROP COLUMN IF EXISTS code;
-- COMMIT;
