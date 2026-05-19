-- ════════════════════════════════════════════════════════════════════
-- 修 schema drift：3 個漏洞一次補
--
-- 為什麼：
--   2026-05-19 William 提報「供應商 / 請款類別新增失敗」、
--   audit src/ 所有 insert/update vs DB schema 比對發現 3 處不對：
--     1. suppliers 缺 english_name column（code 期待、DB 沒）
--     2. expense_categories 缺 is_system column（code 期待、DB 沒）
--     3. tour_registrations 整張表缺（API 已 implement、table 沒建）
--
-- 根因：早期 conditional migration（IF EXISTS 才動）在 fresh production
--   失效、或漏寫整個 migration、code 已對齊新設計、DB 沒對齊。
--
-- ════════════════════════════════════════════════════════════════════

BEGIN;

-- ────────────────────────────────────────────
-- 1. suppliers 加 english_name
-- ────────────────────────────────────────────
ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS english_name VARCHAR(100);

COMMENT ON COLUMN public.suppliers.english_name IS '英文名稱（合約、護照、銀行匯款用）';


-- ────────────────────────────────────────────
-- 2. expense_categories 加 is_system
-- ────────────────────────────────────────────
ALTER TABLE public.expense_categories
  ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT false NOT NULL;

COMMENT ON COLUMN public.expense_categories.is_system IS '系統預設類別（不可刪除）';


-- ────────────────────────────────────────────
-- 3. 建 tour_registrations 表（公開頁 tour 報名收集）
--
-- API：src/app/api/public/registration/route.ts
--      公開 landing page form submit target、走 admin client（no auth）
-- workspace_id：由 BEFORE INSERT trigger 從 tour_id 自動推
--   （紅線 E 例外：純技術 housekeeping、API 不雙寫）
-- RLS：走 setup_workspace_scoped_rls() SSOT procedure
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tour_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  tour_id TEXT REFERENCES public.tours(id) ON DELETE CASCADE,
  sales_ref_code TEXT,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  passenger_count INTEGER DEFAULT 1,
  notes TEXT,
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'contacted', 'converted', 'declined')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tour_registrations_tour_id
  ON public.tour_registrations(tour_id);
CREATE INDEX IF NOT EXISTS idx_tour_registrations_workspace_id
  ON public.tour_registrations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_tour_registrations_created_at
  ON public.tour_registrations(created_at DESC);

-- BEFORE INSERT trigger：API 不送 workspace_id、從 tour_id 推
CREATE OR REPLACE FUNCTION public.set_tour_registration_workspace_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.workspace_id IS NULL AND NEW.tour_id IS NOT NULL THEN
    SELECT workspace_id INTO NEW.workspace_id
    FROM public.tours WHERE id = NEW.tour_id;
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tour_registrations_set_workspace_id
  ON public.tour_registrations;
CREATE TRIGGER trg_tour_registrations_set_workspace_id
  BEFORE INSERT OR UPDATE ON public.tour_registrations
  FOR EACH ROW EXECUTE FUNCTION public.set_tour_registration_workspace_id();

-- RLS：走 SSOT procedure
SELECT public.setup_workspace_scoped_rls('tour_registrations');

COMMENT ON TABLE public.tour_registrations
  IS '公開頁 tour 報名收集（landing page form submit target）';


-- ────────────────────────────────────────────
-- 4. payment_request_items 加 3 個成本轉移審計欄
--
-- 來源：CostTransferDialog.tsx 寫入時用 'as never' cast 繞過 TS、
--   實際跑會撞 PGRST204、成本轉移 items insert 失敗。
-- 紅線 B：transferred_by FK 指 employees(id) 不是 auth.users(id)
-- tours.id 是 text、transferred_from_tour_id 對齊
-- ────────────────────────────────────────────
ALTER TABLE public.payment_request_items
  ADD COLUMN IF NOT EXISTS transferred_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS transferred_by UUID
    REFERENCES public.employees(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS transferred_from_tour_id TEXT
    REFERENCES public.tours(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_pri_transferred_from_tour
  ON public.payment_request_items(transferred_from_tour_id)
  WHERE transferred_from_tour_id IS NOT NULL;

COMMENT ON COLUMN public.payment_request_items.transferred_at
  IS '成本轉移時間戳（CostTransferDialog audit）';
COMMENT ON COLUMN public.payment_request_items.transferred_by
  IS '執行轉移的員工（FK → employees）';
COMMENT ON COLUMN public.payment_request_items.transferred_from_tour_id
  IS '來源團 tour_id（成本從哪個團轉來）';


COMMIT;

-- ════ Rollback（萬一爆炸、複製貼上跑）════
-- BEGIN;
-- ALTER TABLE public.payment_request_items
--   DROP COLUMN IF EXISTS transferred_from_tour_id,
--   DROP COLUMN IF EXISTS transferred_by,
--   DROP COLUMN IF EXISTS transferred_at;
-- DROP TRIGGER IF EXISTS trg_tour_registrations_set_workspace_id ON public.tour_registrations;
-- DROP FUNCTION IF EXISTS public.set_tour_registration_workspace_id();
-- DROP TABLE IF EXISTS public.tour_registrations CASCADE;
-- ALTER TABLE public.expense_categories DROP COLUMN IF EXISTS is_system;
-- ALTER TABLE public.suppliers DROP COLUMN IF EXISTS english_name;
-- COMMIT;
