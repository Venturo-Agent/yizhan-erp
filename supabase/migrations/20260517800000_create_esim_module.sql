-- ═══════════════════════════════════════════════════════════════════════════
-- eSIM 管理（Worldmove）模組 Phase 1
--
-- 建立 4 張表：
--   1. workspace_worldmove_configs  — 每 workspace 的 Worldmove API 設定
--   2. worldmove_products           — Worldmove eSIM 產品目錄（定期同步）
--   3. worldmove_orders             — eSIM 訂單主表
--   4. worldmove_esim_items         — 訂單內每張 eSIM 的詳細資訊
--
-- RLS：
--   - workspace_worldmove_configs → setup_workspace_scoped_rls
--   - worldmove_products          → setup_workspace_scoped_rls
--   - worldmove_orders            → setup_workspace_scoped_rls
--   - worldmove_esim_items        → setup_inherited_rls（parent: worldmove_orders）
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. workspace_worldmove_configs
--    每個 workspace 的 Worldmove API 串接設定
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.workspace_worldmove_configs (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id           uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,

  -- Worldmove API 憑證
  api_key_encrypted      text,       -- 加密儲存
  partner_code           text,       -- Worldmove 合作夥伴代碼
  is_active              boolean NOT NULL DEFAULT false,

  -- 測試模式（Worldmove sandbox）
  sandbox_mode           boolean NOT NULL DEFAULT true,

  -- 自動同步產品目錄
  auto_sync_products     boolean NOT NULL DEFAULT true,
  last_synced_at         timestamptz,

  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT workspace_worldmove_configs_workspace_unique UNIQUE (workspace_id)
);

CALL public.setup_workspace_scoped_rls('workspace_worldmove_configs');

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. worldmove_products
--    Worldmove eSIM 產品目錄（從 Worldmove API 同步、workspace 層隔離）
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.worldmove_products (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id           uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,

  -- Worldmove 產品識別
  worldmove_product_id   text NOT NULL,
  product_code           text NOT NULL,

  -- 產品資訊
  name                   text NOT NULL,
  description            text,
  coverage_countries     text[],     -- ISO 國碼列表
  coverage_regions       text[],     -- 地區列表（如 '亞洲', '歐洲'）

  -- 數據規格
  data_limit_mb          integer,    -- 0 = unlimited
  validity_days          integer NOT NULL,
  roaming_type           text NOT NULL DEFAULT 'data_only'
                           CHECK (roaming_type IN ('data_only', 'voice_sms', 'full')),

  -- 定價
  cost_price             numeric(10,2),   -- 進價（TWD）
  selling_price          numeric(10,2),   -- 售價（TWD）
  currency               text NOT NULL DEFAULT 'TWD',

  -- 狀態
  is_active              boolean NOT NULL DEFAULT true,
  stock_status           text NOT NULL DEFAULT 'available'
                           CHECK (stock_status IN ('available', 'limited', 'out_of_stock')),

  -- Worldmove 原始資料 snapshot
  raw_data               jsonb,

  synced_at              timestamptz NOT NULL DEFAULT now(),
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT worldmove_products_workspace_product_unique
    UNIQUE (workspace_id, worldmove_product_id)
);

CALL public.setup_workspace_scoped_rls('worldmove_products');

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. worldmove_orders
--    eSIM 訂單主表
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.worldmove_orders (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id           uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE RESTRICT,

  -- 來源串接（可 nullable、手動建單）
  source_type            text CHECK (source_type IN ('order', 'payment', 'manual')),
  source_id              uuid,

  -- 客戶資訊（snapshot）
  customer_name          text,
  customer_email         text,
  customer_phone         text,

  -- Worldmove 訂單
  worldmove_order_id     text,       -- Worldmove 回傳的訂單 ID

  -- 金額
  subtotal               numeric(12,2) NOT NULL DEFAULT 0,
  discount               numeric(12,2) NOT NULL DEFAULT 0,
  total_amount           numeric(12,2) NOT NULL DEFAULT 0,

  -- 狀態
  status                 text NOT NULL DEFAULT 'pending'
                           CHECK (status IN (
                             'pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded'
                           )),

  -- Worldmove API 回應
  provider_response      jsonb,

  note                   text,

  -- audit
  created_by             uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  deleted_at             timestamptz
);

CALL public.setup_workspace_scoped_rls('worldmove_orders');

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. worldmove_esim_items
--    每張 eSIM 的詳細資訊（子表 inherit worldmove_orders scope）
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.worldmove_esim_items (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id               uuid NOT NULL REFERENCES public.worldmove_orders(id) ON DELETE RESTRICT,
  workspace_id           uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE RESTRICT,

  -- 產品關聯（snapshot 下單當下資料）
  product_id             uuid REFERENCES public.worldmove_products(id) ON DELETE SET NULL,
  product_name           text NOT NULL,
  product_code           text NOT NULL,

  -- eSIM 技術資訊（Worldmove 發卡後才有）
  iccid                  text,       -- eSIM ICCID
  activation_code        text,       -- QR Code 安裝碼
  qr_code_url            text,       -- QR Code 圖片 URL
  sm_dp_address          text,       -- eSIM 設定位址

  -- 有效期
  valid_from             date,
  valid_until            date,

  -- 數據使用（定期同步）
  data_used_mb           integer NOT NULL DEFAULT 0,
  data_limit_mb          integer,
  last_usage_synced_at   timestamptz,

  -- 狀態
  status                 text NOT NULL DEFAULT 'pending'
                           CHECK (status IN (
                             'pending', 'active', 'activated', 'expired', 'cancelled', 'suspended'
                           )),

  -- 單價（下單時 snapshot）
  unit_price             numeric(10,2) NOT NULL DEFAULT 0,

  -- Worldmove API 回應
  provider_item_id       text,
  provider_response      jsonb,

  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

CALL public.setup_inherited_rls('worldmove_esim_items', 'worldmove_orders', 'order_id');

-- ─────────────────────────────────────────────────────────────────────────────
-- Indexes
-- ─────────────────────────────────────────────────────────────────────────────

-- worldmove_products
CREATE INDEX IF NOT EXISTS idx_worldmove_products_workspace_id
  ON public.worldmove_products(workspace_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_worldmove_products_product_id
  ON public.worldmove_products(workspace_id, worldmove_product_id);

-- worldmove_orders
CREATE INDEX IF NOT EXISTS idx_worldmove_orders_workspace_id
  ON public.worldmove_orders(workspace_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_worldmove_orders_status
  ON public.worldmove_orders(workspace_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_worldmove_orders_source
  ON public.worldmove_orders(source_type, source_id) WHERE source_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_worldmove_orders_created_at
  ON public.worldmove_orders(workspace_id, created_at DESC);

-- worldmove_esim_items
CREATE INDEX IF NOT EXISTS idx_worldmove_esim_items_order_id
  ON public.worldmove_esim_items(order_id);
CREATE INDEX IF NOT EXISTS idx_worldmove_esim_items_workspace_id
  ON public.worldmove_esim_items(workspace_id);
CREATE INDEX IF NOT EXISTS idx_worldmove_esim_items_iccid
  ON public.worldmove_esim_items(iccid) WHERE iccid IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_worldmove_esim_items_status
  ON public.worldmove_esim_items(workspace_id, status);

-- ─────────────────────────────────────────────────────────────────────────────
-- 完工通知
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  RAISE NOTICE '════════════════════════════════════════════════════════════';
  RAISE NOTICE 'eSIM 管理（Worldmove）模組 Phase 1 建立完成';
  RAISE NOTICE '  - workspace_worldmove_configs (RLS: workspace_scoped)';
  RAISE NOTICE '  - worldmove_products          (RLS: workspace_scoped)';
  RAISE NOTICE '  - worldmove_orders            (RLS: workspace_scoped, soft-delete)';
  RAISE NOTICE '  - worldmove_esim_items        (RLS: inherited via order_id)';
  RAISE NOTICE '  - 10 indexes';
  RAISE NOTICE '════════════════════════════════════════════════════════════';
END $$;

COMMIT;

-- Rollback:
-- DROP TABLE IF EXISTS public.worldmove_esim_items;
-- DROP TABLE IF EXISTS public.worldmove_orders;
-- DROP TABLE IF EXISTS public.worldmove_products;
-- DROP TABLE IF EXISTS public.workspace_worldmove_configs;
