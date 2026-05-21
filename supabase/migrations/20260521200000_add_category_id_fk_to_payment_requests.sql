-- Phase 2 接過去：payment_requests + payment_request_items 加 FK 到 expense_categories
-- William 2026-05-21 拍板「砍寫死、做正確的應用」
--
-- 改造目標：
-- 1. 取代寫死 categoryOptions（11 項）→ payment_request_items.category_id FK
-- 2. 取代寫死 EXPENSE_TYPE_CONFIG（11 代碼）→ payment_requests.expense_category_id FK
--
-- 設計考量：
-- - 加新欄位、不 DROP 舊欄位（紅線 #4：刪除動作需先驗證所有 caller 切完才動）
-- - 過渡期：code 走新欄位、舊欄位留 read-only 兼容
-- - ON DELETE SET NULL：刪 expense_categories row 時不破壞 payment 紀錄
-- - 帶 partial index（WHERE NOT NULL）省空間、加速 join
--
-- Backfill 策略：
-- - payment_request_items.category（純文字）依名字 lookup expense_categories.id
--   - 對得上：交通(26) 住宿(6) 其他(2) 餐食(2) 保險(2) 出團款(1) 同業(1) 員工代墊(1) 導遊(1) = 42 筆
--   - 對不上：BNS(2) 空字串(12) = 14 筆、留 NULL
-- - payment_requests.expense_type='BNS'（1 筆）→ 獎金 id
--
-- 已 apply 到 production：2026-05-21 via mcp__supabase-aierp__apply_migration

BEGIN;

-- ─────────────────────────────────────────
-- 1. payment_request_items 加 category_id FK
-- ─────────────────────────────────────────
ALTER TABLE public.payment_request_items
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.expense_categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_payment_request_items_category_id
  ON public.payment_request_items(category_id)
  WHERE category_id IS NOT NULL;

COMMENT ON COLUMN public.payment_request_items.category_id IS '請款品項分類 FK to expense_categories（取代純文字 category 欄、2026-05-21 加）';

-- ─────────────────────────────────────────
-- 2. payment_requests 加 expense_category_id FK
-- ─────────────────────────────────────────
ALTER TABLE public.payment_requests
  ADD COLUMN IF NOT EXISTS expense_category_id uuid REFERENCES public.expense_categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_payment_requests_expense_category_id
  ON public.payment_requests(expense_category_id)
  WHERE expense_category_id IS NOT NULL;

COMMENT ON COLUMN public.payment_requests.expense_category_id IS '公司請款費用分類 FK to expense_categories（取代純文字 expense_type 欄、2026-05-21 加）';

-- ─────────────────────────────────────────
-- 3. Backfill payment_request_items.category_id
--    依名字 lookup expense_categories（type IN expense, both）
-- ─────────────────────────────────────────
UPDATE public.payment_request_items pri
SET category_id = ec.id
FROM public.expense_categories ec
WHERE ec.name = pri.category
  AND ec.workspace_id IS NULL
  AND ec.type IN ('expense', 'both')
  AND pri.category IS NOT NULL
  AND pri.category != ''
  AND pri.category_id IS NULL;

-- ─────────────────────────────────────────
-- 4. Backfill payment_requests.expense_category_id
--    BNS → 獎金（2c7ebfb3-3cf7-484d-bcb1-23fc467b8bc9）
-- ─────────────────────────────────────────
UPDATE public.payment_requests
SET expense_category_id = '2c7ebfb3-3cf7-484d-bcb1-23fc467b8bc9'
WHERE expense_type = 'BNS'
  AND expense_category_id IS NULL;

COMMIT;

-- ════ Rollback ════
-- BEGIN;
-- DROP INDEX IF EXISTS idx_payment_request_items_category_id;
-- DROP INDEX IF EXISTS idx_payment_requests_expense_category_id;
-- ALTER TABLE public.payment_request_items DROP COLUMN IF EXISTS category_id;
-- ALTER TABLE public.payment_requests DROP COLUMN IF EXISTS expense_category_id;
-- COMMIT;
