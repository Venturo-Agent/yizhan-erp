-- ════════════════════════════════════════════════════════════════════════
-- orders 業務 / 助理欄改 FK（從 text → uuid → employees(id)）
--
-- 背景：
--   - 舊設計：orders.sales_person / assistant 是 text、存名字字串
--   - 問題：員工改名後舊單不會跟著改、人員 SSOT 散在訂單 row 裡
--   - 新設計：加 sales_id / assistant_id FK → employees(id)
--     - 舊欄位 sales_person / assistant 保留做 fallback 顯示（match 不到的 Jess）
--     - 顯示時優先 join employees.display_name、fallback 到原 text
--
-- 動作：
--   1. ADD COLUMN sales_id uuid + assistant_id uuid（NULLable、FK → employees(id) ON DELETE SET NULL）
--   2. CREATE INDEX（filter / join 效能）
--   3. BACKFILL：用現有 text 名字 match employees.chinese_name / english_name / display_name 寫入 _id
--   4. match 不到的（如 CORNER 'Jess' 3 筆）保留 sales_person text、sales_id 留 NULL
--
-- 注意：
--   - 動 column 上線後必跑 NOTIFY pgrst, 'reload schema'（外部執行、不在 migration 裡）
--   - 後續 code 寫入改寫 sales_id / assistant_id、舊欄位漸進 deprecate（先不刪）
-- ════════════════════════════════════════════════════════════════════════

BEGIN;

-- 1. 加欄位（FK → employees、人員離職可 SET NULL、不擋訂單）
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS sales_id uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assistant_id uuid REFERENCES public.employees(id) ON DELETE SET NULL;

-- 2. Index（為了業務統計 / 員工頁查訂單）
CREATE INDEX IF NOT EXISTS idx_orders_sales_id ON public.orders(sales_id) WHERE sales_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_assistant_id ON public.orders(assistant_id) WHERE assistant_id IS NOT NULL;

-- 3. BACKFILL：sales_id（match 同 workspace 的 chinese / english / display）
UPDATE public.orders o
SET sales_id = e.id
FROM public.employees e
WHERE o.workspace_id = e.workspace_id
  AND o.sales_person IS NOT NULL
  AND o.sales_id IS NULL  -- 不覆寫已有的（idempotent）
  AND e.deleted_at IS NULL
  AND (e.chinese_name = o.sales_person OR e.english_name = o.sales_person OR e.display_name = o.sales_person);

-- 4. BACKFILL：assistant_id（同邏輯）
UPDATE public.orders o
SET assistant_id = e.id
FROM public.employees e
WHERE o.workspace_id = e.workspace_id
  AND o.assistant IS NOT NULL
  AND o.assistant_id IS NULL
  AND e.deleted_at IS NULL
  AND (e.chinese_name = o.assistant OR e.english_name = o.assistant OR e.display_name = o.assistant);

COMMIT;

-- ════ Rollback（萬一爆炸、複製貼上跑）════
-- BEGIN;
-- DROP INDEX IF EXISTS idx_orders_sales_id;
-- DROP INDEX IF EXISTS idx_orders_assistant_id;
-- ALTER TABLE public.orders DROP COLUMN IF EXISTS sales_id;
-- ALTER TABLE public.orders DROP COLUMN IF EXISTS assistant_id;
-- COMMIT;
-- NOTIFY pgrst, 'reload schema';
