-- ════════════════════════════════════════════════════════════════
-- 永豐銀行收款整合 — Phase 1 骨架
-- 2026-05-22 William 拍板
-- 上層文件：workspace/_meta/architecture/2026-05-22-永豐銀行收款整合-實作計畫.md
-- ════════════════════════════════════════════════════════════════
-- 為什麼：
--   1. SaaS 平台預先做好金流串接（B 方案：kind + provider 兩維）
--   2. 客戶新增收款方式時、能勾選永豐線上刷卡 / 豐收款 / Apple/Google/Samsung Pay
--   3. 觸發收款時產生付款連結、客戶刷卡、webhook 自動更新狀態
-- 範圍：
--   1. payment_methods 加 provider 欄位（B 方案）
--   2. 建 platform_payment_providers（平台層金流商註冊、跨 workspace 共用）
--   3. 建 payment_transactions（每筆刷卡 / 虛帳號交易紀錄）
--   4. Seed 6 個 provider（manual + 5 個永豐）
-- 不破壞既有：
--   - payment_methods 既有 row provider 預設 'manual'、現金 / 匯款 / 支票 / 刷卡都不變
--   - receipts 表完全不動
-- ════════════════════════════════════════════════════════════════

BEGIN;

-- ────────────────────────────────────────────────────────────────
-- 1. payment_methods 加 provider 欄位
-- ────────────────────────────────────────────────────────────────
ALTER TABLE public.payment_methods
  ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'manual';

COMMENT ON COLUMN public.payment_methods.provider IS
  'B 方案 provider 欄位：誰來處理金流。manual = 不接 API、客戶 / 員工自己處理；sinopac_card = 永豐線上刷卡；sinopac_collect = 永豐豐收款；sinopac_apple_pay / sinopac_google_pay / sinopac_samsung_pay = Token Pay。';

-- ────────────────────────────────────────────────────────────────
-- 2. platform_payment_providers — 平台層註冊的金流商
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.platform_payment_providers (
  code TEXT PRIMARY KEY,
  provider_name TEXT NOT NULL,
  provider_kind TEXT NOT NULL, -- card / wire_transfer / wallet / manual
  enabled BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.platform_payment_providers IS
  '平台層金流商註冊表、跨 workspace 共用。所有 workspace 都看得到、由平台統一管理。客戶在收款方式 dialog 從這裡選 provider。';

-- 列 = 預設、不需要 unique 額外 index
CREATE INDEX IF NOT EXISTS idx_platform_payment_providers_enabled
  ON public.platform_payment_providers(enabled) WHERE enabled = true;

-- RLS：所有 authenticated 都可讀、寫操作交給平台層 service_role
ALTER TABLE public.platform_payment_providers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "platform_payment_providers select for authenticated"
  ON public.platform_payment_providers;
CREATE POLICY "platform_payment_providers select for authenticated"
  ON public.platform_payment_providers
  FOR SELECT
  TO authenticated
  USING (true);

-- INSERT/UPDATE/DELETE 不開 policy = 只能 service_role 動

-- ────────────────────────────────────────────────────────────────
-- 3. payment_transactions — 每筆刷卡 / 虛帳號交易紀錄
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  receipt_id UUID REFERENCES public.receipts(id) ON DELETE SET NULL,

  provider TEXT NOT NULL REFERENCES public.platform_payment_providers(code),

  -- 付款連結（給客戶用）
  payment_link TEXT,
  payment_link_token TEXT UNIQUE, -- /pay/mock/[token] 用
  payment_link_expires_at TIMESTAMPTZ,

  -- 客戶聯絡（Email 寄送連結用）
  customer_email TEXT,
  customer_name TEXT,

  -- 金額快照（建立瞬間鎖定、之後客戶刷的金額要對齊）
  amount NUMERIC(15, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'TWD',

  -- 對應 invoice（單一或多選帳單合併）
  invoice_ids UUID[] DEFAULT '{}',

  -- 永豐回傳（Phase 2 才會填）
  external_order_no TEXT, -- oid
  external_trans_no TEXT, -- TransNo
  external_approve_code TEXT,

  -- 狀態：pending / authorized / captured / failed / refunded / expired
  status TEXT NOT NULL DEFAULT 'pending',

  -- webhook 原始 payload（debug / audit）
  raw_webhook_payload JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,

  CONSTRAINT payment_transactions_status_check CHECK (
    status IN ('pending', 'authorized', 'captured', 'failed', 'refunded', 'expired')
  )
);

COMMENT ON TABLE public.payment_transactions IS
  '每筆永豐 / 行動支付 / 虛帳號交易紀錄、跟 receipts 一對一或一對多。狀態流：pending → authorized（永豐回 OK 等請款）→ captured（最終扣款）→ refunded（退貨）。pending 過期 → expired。';

CREATE INDEX IF NOT EXISTS idx_payment_transactions_workspace
  ON public.payment_transactions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_receipt
  ON public.payment_transactions(receipt_id) WHERE receipt_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payment_transactions_token
  ON public.payment_transactions(payment_link_token) WHERE payment_link_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status
  ON public.payment_transactions(status);

-- RLS 走 SOP
CALL public.setup_workspace_scoped_rls('payment_transactions');

-- ────────────────────────────────────────────────────────────────
-- 4. Seed 6 個 provider
-- ────────────────────────────────────────────────────────────────
INSERT INTO public.platform_payment_providers (code, provider_name, provider_kind, description) VALUES
  ('manual',              '手動處理',         'manual',         '不接 API、自己處理（現金 / 自己刷卡機 / 一般匯款）'),
  ('sinopac_card',        '永豐線上刷卡',     'card',           '永豐 EPOS URL 付款頁、TransMode=0 一般刷卡、不分期 / 不紅利 / 不 QR'),
  ('sinopac_collect',     '永豐豐收款',       'wire_transfer',  '永豐金融 API 開立虛擬帳號、客戶 ATM / 網銀匯款後 webhook 通知'),
  ('sinopac_apple_pay',   '永豐 Apple Pay',   'wallet',         '永豐 Token Pay API、不支援 3D 認證'),
  ('sinopac_google_pay',  '永豐 Google Pay',  'wallet',         '永豐 Token Pay API、不支援 3D 認證'),
  ('sinopac_samsung_pay', '永豐 Samsung Pay', 'wallet',         '永豐 Token Pay API、不支援 3D 認證')
ON CONFLICT (code) DO UPDATE
SET
  provider_name = EXCLUDED.provider_name,
  provider_kind = EXCLUDED.provider_kind,
  description = EXCLUDED.description,
  updated_at = now();

-- ────────────────────────────────────────────────────────────────
-- 5. updated_at trigger（payment_transactions）
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_payment_transactions_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_payment_transactions_updated_at ON public.payment_transactions;
CREATE TRIGGER trg_payment_transactions_updated_at
  BEFORE UPDATE ON public.payment_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_payment_transactions_updated_at();

COMMIT;

-- ════════════════════════════════════════════════════════════════
-- Rollback（萬一爆炸、複製貼上跑）
-- ════════════════════════════════════════════════════════════════
-- BEGIN;
-- DROP TRIGGER IF EXISTS trg_payment_transactions_updated_at ON public.payment_transactions;
-- DROP FUNCTION IF EXISTS public.set_payment_transactions_updated_at();
-- DROP TABLE IF EXISTS public.payment_transactions;
-- DROP TABLE IF EXISTS public.platform_payment_providers;
-- ALTER TABLE public.payment_methods DROP COLUMN IF EXISTS provider;
-- COMMIT;
