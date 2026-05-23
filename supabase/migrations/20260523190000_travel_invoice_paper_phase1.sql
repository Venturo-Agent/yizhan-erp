-- 代轉管理 階段 1：紙本代轉 schema
--
-- 為什麼：補完 travel_invoice 半成品骨架、支援「紙本代轉」（零外部依賴、不等藍新測試帳號）。
--   依據 spec：workspace/_meta/architecture/2026-05-23-代轉管理-實作spec.md
--   William 2026-05-23 拍板：① 只改顯示名(底層維持 travel_invoice) ② 一定綁團
--   ③ 以收款單為主(source_type='payment'+source_id=收款單、累計開立 ≤ 已收) ④ 單張作廢制
--
-- 範圍：只動「紙本」所需。藍新電子回應欄位(invoice_trans_no/random_num/display_url 等)留階段 2。
--
-- 既有 schema 盤點（已確認、不重建）：
--   travel_invoices 已有 status('pending'/'issued'/'void'/'allowance')、source_type('payment'/'order'/'manual')、
--     buyer_*/seller_*/金額/issued_by(FK→employees,紅線B符合)/soft-delete。
--   travel_invoice_voids 已存在 → 紙本作廢沿用、不新增表。
--
-- 紅線對齊：
--   B：新表 created_by FK → employees(id)
--   H：RLS 過 workspace（走中央 procedure）
--   GRANT：setup_*_rls procedure 經驗證「不自己 GRANT」(does_grant=false)、故手動補 table GRANT
--     —— 此為 payment_transactions(2026-05-22) 漏 GRANT 導致 403 的系統性教訓、本 migration 不再犯。

BEGIN;

-- ════════════════════════════════════════════════════
-- ① travel_invoices 主表：加 紙本/電子別 + 紙本字軌 + 綁團 snapshot
-- ════════════════════════════════════════════════════
ALTER TABLE public.travel_invoices
  ADD COLUMN IF NOT EXISTS medium text NOT NULL DEFAULT 'electronic'
    CHECK (medium IN ('paper','electronic')),       -- 紙本 / 電子（二選一、紅線：每張收據走一軌）
  ADD COLUMN IF NOT EXISTS paper_track text,          -- 紙本字軌（如 AB）、紙本時 API 層強制必填
  ADD COLUMN IF NOT EXISTS paper_serial integer,      -- 紙本流水號（ERP 內部編、@/lib/codes advisory lock 配號）
  ADD COLUMN IF NOT EXISTS tour_id text REFERENCES public.tours(id) ON DELETE SET NULL,  -- 綁團（一定綁、API 強制）；tours.id 是 text 型別

  ADD COLUMN IF NOT EXISTS tour_name text,            -- 綁團 snapshot（藍新 TourName、開立當下凍結）
  ADD COLUMN IF NOT EXISTS tour_no text,              -- 團號 snapshot
  ADD COLUMN IF NOT EXISTS tour_date date;            -- 出團日 snapshot

-- 同 workspace 同字軌同流水不可重複（防同號開兩張）；作廢號保留為 void row、不算重複（看 deleted_at）
CREATE UNIQUE INDEX IF NOT EXISTS idx_travel_invoices_paper_unique
  ON public.travel_invoices(workspace_id, paper_track, paper_serial)
  WHERE medium = 'paper' AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_travel_invoices_tour
  ON public.travel_invoices(tour_id) WHERE tour_id IS NOT NULL;

-- ════════════════════════════════════════════════════
-- ② 紙本字軌表：登記公司收據本（字軌 + 起迄號 + 目前用到第幾號）
--    紙本開立配號 = 從 active 字軌取 current_no+1（advisory lock 防撞、走 @/lib/codes）
--    號只增不減：作廢的號保留為 void 的 travel_invoices row、不回收不重用 → 字軌連續可稽核
-- ════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.travel_invoice_paper_tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  track_code text NOT NULL,                  -- 字軌（如 AB）
  start_no integer NOT NULL,                 -- 起號
  end_no integer NOT NULL,                   -- 迄號
  current_no integer NOT NULL DEFAULT 0,     -- 目前配到第幾號（0=尚未開始）
  is_active boolean NOT NULL DEFAULT true,
  note text,
  created_by uuid REFERENCES public.employees(id) ON DELETE SET NULL,   -- 紅線 B
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT paper_track_workspace_unique UNIQUE (workspace_id, track_code),
  CONSTRAINT paper_track_range_chk CHECK (end_no >= start_no AND current_no <= end_no)
);

-- ════════════════════════════════════════════════════
-- ③ 明細子表：代轉品項（對齊藍新 Item* 五欄、紙本/電子共用；藍新上限 7 項由 API 層擋）
-- ════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.travel_invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.travel_invoices(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  item_name text NOT NULL,
  item_count numeric NOT NULL DEFAULT 1,
  item_unit text,
  item_price numeric NOT NULL DEFAULT 0,
  item_amount numeric NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_travel_invoice_items_invoice
  ON public.travel_invoice_items(invoice_id);

-- ════════════════════════════════════════════════════
-- ④ RLS（走中央 procedure、不散刻 CREATE POLICY）
-- ════════════════════════════════════════════════════
CALL public.setup_workspace_scoped_rls('travel_invoice_paper_tracks');
CALL public.setup_inherited_rls('travel_invoice_items', 'travel_invoices', 'invoice_id');

-- ════════════════════════════════════════════════════
-- ⑤ GRANT（procedure 不自己 GRANT、手動補；RLS 仍限只能碰自己 workspace 的 row）
-- ════════════════════════════════════════════════════
GRANT SELECT, INSERT, UPDATE, DELETE ON public.travel_invoice_paper_tracks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.travel_invoice_items TO authenticated;

COMMIT;

-- ════ Rollback（萬一爆炸、複製貼上跑）════
-- BEGIN;
-- DROP TABLE IF EXISTS public.travel_invoice_items;
-- DROP TABLE IF EXISTS public.travel_invoice_paper_tracks;
-- ALTER TABLE public.travel_invoices
--   DROP COLUMN IF EXISTS medium,
--   DROP COLUMN IF EXISTS paper_track,
--   DROP COLUMN IF EXISTS paper_serial,
--   DROP COLUMN IF EXISTS tour_id,
--   DROP COLUMN IF EXISTS tour_name,
--   DROP COLUMN IF EXISTS tour_no,
--   DROP COLUMN IF EXISTS tour_date;
-- DROP INDEX IF EXISTS idx_travel_invoices_paper_unique;
-- DROP INDEX IF EXISTS idx_travel_invoices_tour;
-- COMMIT;
