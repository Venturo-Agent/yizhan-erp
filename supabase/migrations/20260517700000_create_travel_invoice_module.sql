-- ═══════════════════════════════════════════════════════════════════════════
-- 電子收據（Travel Invoice）模組 Phase 1
--
-- 建立 4 張表：
--   1. workspace_travel_invoice_configs  — 每 workspace 發票串接設定
--   2. travel_invoices                   — 發票主表
--   3. travel_allowances                 — 折讓單
--   4. travel_invoice_voids              — 作廢紀錄
--
-- RLS：
--   - workspace_travel_invoice_configs → setup_workspace_scoped_rls
--   - travel_invoices                  → setup_workspace_scoped_rls
--   - travel_allowances                → setup_inherited_rls（parent: travel_invoices）
--   - travel_invoice_voids             → setup_inherited_rls（parent: travel_invoices）
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. workspace_travel_invoice_configs
--    每個 workspace 的財政部 / 雲端發票串接設定
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.workspace_travel_invoice_configs (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id         uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,

  -- 財政部 / 雲端發票平台設定
  provider             text NOT NULL DEFAULT 'ezpay'
                         CHECK (provider IN ('ezpay', 'invoicing', 'manual')),
  merchant_id          text,
  api_key_encrypted    text,       -- 加密儲存、不明文
  is_active            boolean NOT NULL DEFAULT false,

  -- 發票抬頭預設
  default_seller_name  text,
  default_seller_ban   text,       -- 統一編號

  -- 載具預設
  default_carrier_type text NOT NULL DEFAULT 'cloud'
                         CHECK (default_carrier_type IN ('cloud', 'phone', 'citizen', 'none')),

  -- 測試模式（財政部沙箱）
  sandbox_mode         boolean NOT NULL DEFAULT true,

  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT workspace_travel_invoice_configs_workspace_unique UNIQUE (workspace_id)
);

CALL public.setup_workspace_scoped_rls('workspace_travel_invoice_configs');

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. travel_invoices
--    發票主表
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.travel_invoices (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id         uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE RESTRICT,

  -- 發票號碼（財政部核配字軌 + 號碼）
  invoice_number       text,                           -- 開立後才有
  invoice_date         date,

  -- 來源串接（可 nullable、手動開立時不綁）
  source_type          text CHECK (source_type IN ('payment', 'order', 'manual')),
  source_id            uuid,

  -- 買方資訊
  buyer_name           text,
  buyer_email          text,
  buyer_phone          text,
  buyer_ban            text,       -- B2B 統一編號
  buyer_address        text,

  -- 賣方（snapshot 發票當下）
  seller_name          text NOT NULL,
  seller_ban           text NOT NULL,

  -- 載具
  carrier_type         text NOT NULL DEFAULT 'cloud'
                         CHECK (carrier_type IN ('cloud', 'phone', 'citizen', 'none')),
  carrier_number       text,       -- 手機號 / 自然人憑證 / 捐贈碼

  -- 金額
  taxable_amount       numeric(12,2) NOT NULL DEFAULT 0,
  tax_amount           numeric(12,2) NOT NULL DEFAULT 0,
  total_amount         numeric(12,2) NOT NULL DEFAULT 0,
  tax_type             text NOT NULL DEFAULT 'taxed'
                         CHECK (tax_type IN ('taxed', 'zero', 'exempt', 'special')),

  -- 狀態
  status               text NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending', 'issued', 'void', 'allowance')),

  -- 財政部回應
  provider_invoice_id  text,       -- 平台回傳的發票 ID
  provider_response    jsonb,      -- 完整 API 回應 snapshot

  -- 備註
  note                 text,

  -- audit
  issued_at            timestamptz,
  issued_by            uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  deleted_at           timestamptz
);

CALL public.setup_workspace_scoped_rls('travel_invoices');

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. travel_allowances
--    折讓單（子表 inherit travel_invoices scope）
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.travel_allowances (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id           uuid NOT NULL REFERENCES public.travel_invoices(id) ON DELETE RESTRICT,
  workspace_id         uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE RESTRICT,

  allowance_number     text,       -- 折讓單號（財政部核發）
  allowance_date       date,

  -- 折讓金額
  allowance_amount     numeric(12,2) NOT NULL DEFAULT 0,
  tax_amount           numeric(12,2) NOT NULL DEFAULT 0,
  total_amount         numeric(12,2) NOT NULL DEFAULT 0,

  -- 狀態
  status               text NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending', 'issued', 'void')),

  -- 財政部回應
  provider_allowance_id text,
  provider_response    jsonb,

  reason               text,

  -- audit
  issued_at            timestamptz,
  issued_by            uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CALL public.setup_inherited_rls('travel_allowances', 'travel_invoices', 'invoice_id');

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. travel_invoice_voids
--    作廢紀錄（子表 inherit travel_invoices scope）
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.travel_invoice_voids (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id           uuid NOT NULL REFERENCES public.travel_invoices(id) ON DELETE RESTRICT,
  workspace_id         uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE RESTRICT,

  void_reason          text NOT NULL,

  -- 財政部回應
  provider_response    jsonb,

  -- audit
  voided_at            timestamptz NOT NULL DEFAULT now(),
  voided_by            uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  created_at           timestamptz NOT NULL DEFAULT now()
);

CALL public.setup_inherited_rls('travel_invoice_voids', 'travel_invoices', 'invoice_id');

-- ─────────────────────────────────────────────────────────────────────────────
-- Indexes
-- ─────────────────────────────────────────────────────────────────────────────

-- travel_invoices
CREATE INDEX IF NOT EXISTS idx_travel_invoices_workspace_id
  ON public.travel_invoices(workspace_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_travel_invoices_status
  ON public.travel_invoices(workspace_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_travel_invoices_invoice_number
  ON public.travel_invoices(workspace_id, invoice_number) WHERE invoice_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_travel_invoices_source
  ON public.travel_invoices(source_type, source_id) WHERE source_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_travel_invoices_created_at
  ON public.travel_invoices(workspace_id, created_at DESC);

-- travel_allowances
CREATE INDEX IF NOT EXISTS idx_travel_allowances_invoice_id
  ON public.travel_allowances(invoice_id);
CREATE INDEX IF NOT EXISTS idx_travel_allowances_workspace_id
  ON public.travel_allowances(workspace_id);

-- travel_invoice_voids
CREATE INDEX IF NOT EXISTS idx_travel_invoice_voids_invoice_id
  ON public.travel_invoice_voids(invoice_id);
CREATE INDEX IF NOT EXISTS idx_travel_invoice_voids_workspace_id
  ON public.travel_invoice_voids(workspace_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 完工通知
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  RAISE NOTICE '════════════════════════════════════════════════════════════';
  RAISE NOTICE '電子收據（Travel Invoice）模組 Phase 1 建立完成';
  RAISE NOTICE '  - workspace_travel_invoice_configs (RLS: workspace_scoped)';
  RAISE NOTICE '  - travel_invoices                  (RLS: workspace_scoped, soft-delete)';
  RAISE NOTICE '  - travel_allowances                (RLS: inherited via invoice_id)';
  RAISE NOTICE '  - travel_invoice_voids             (RLS: inherited via invoice_id)';
  RAISE NOTICE '  - 9 indexes';
  RAISE NOTICE '════════════════════════════════════════════════════════════';
END $$;

COMMIT;

-- Rollback:
-- DROP TABLE IF EXISTS public.travel_invoice_voids;
-- DROP TABLE IF EXISTS public.travel_allowances;
-- DROP TABLE IF EXISTS public.travel_invoices;
-- DROP TABLE IF EXISTS public.workspace_travel_invoice_configs;
