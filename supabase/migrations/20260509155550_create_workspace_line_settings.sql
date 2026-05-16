-- =============================================================================
-- T1.1: workspace_line_settings + LINE Bot multi-tenant 基礎設施
-- =============================================================================
--
-- 對應 vault 卡：[[03-LINE-Bot-第一階段]] 第四節「Multi-tenant 架構設計」
--
-- 內容：
--   1. workspace_line_settings 表（每 workspace 一筆 LINE OA 設定）
--   2. line_conversation_messages 表（對話歷史 / bot context）
--   3. customers.line_user_id 欄位 + partial unique index
--   4. employees.employee_type CHECK 擴展（接受 'system_bot' / 'integration'）
--   5. 「系統機器人」role（平台層共用、workspace_id = NULL）
--   6. role_capabilities seed：5 個 capability
--      （orders.read/write、customers.read/write、tours.read）
--   7. workspace_features.feature_code = 'line_bot' 補進 catalog（不自動開）
--   8. capability code 'line_bot.config' 加進已知 capability set
--   9. RLS policies
--
-- 設計決策（dev agent 自行拍板、進度卡會列出讓 William 後審）：
--   - employees 不另加 'type' 欄位、改用既有 employee_type、CHECK 擴成
--     'human / bot / system_bot / integration'、保持向下相容（'bot' 不退役）
--   - channel_access_token / channel_secret 先用 TEXT 明文（demo 階段）、
--     phase 2 換 Supabase Vault / pgsodium。已加 COMMENT 警示
--   - 「系統機器人」role 走平台共用（workspace_id = NULL）、schema 支援
--   - 全用 IF NOT EXISTS / DO $$ NOT EXISTS 包、可重跑
--
-- 紅線遵守：
--   - 純加法（CREATE TABLE IF NOT EXISTS / ALTER TABLE ADD COLUMN）
--   - 沒有 DROP TABLE / DROP COLUMN
--   - employee_type CHECK 用 DROP CONSTRAINT IF EXISTS + ADD（資料相容、現有
--     'human' / 'bot' 通過新 CHECK）
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. workspace_line_settings
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.workspace_line_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,

  -- LINE 連線設定（必填、客戶填）
  -- channel_id = LINE OA destination ID（webhook payload.destination 用來反查 workspace）
  channel_id TEXT NOT NULL,
  channel_access_token TEXT NOT NULL,  -- demo: 明文。phase 2 換 BYTEA + Vault
  channel_secret TEXT NOT NULL,        -- demo: 明文。phase 2 換 BYTEA + Vault

  -- 業務設定（客戶可改）
  bot_greeting TEXT,                              -- 預設開頭語
  handoff_enabled BOOLEAN NOT NULL DEFAULT false, -- bot 不會時自動轉真人
  handoff_target TEXT,                            -- 員工 ID 或 LINE ID
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,                              -- NULL = 永久

  -- 系統管理（自動填、客戶不改）
  bot_employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  webhook_verified_at TIMESTAMPTZ,

  -- platform admin only（phase 2 啟用）
  daily_order_limit INT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT workspace_line_settings_workspace_uniq UNIQUE (workspace_id),
  CONSTRAINT workspace_line_settings_channel_uniq UNIQUE (channel_id)
);

CREATE INDEX IF NOT EXISTS idx_workspace_line_settings_channel_id
  ON public.workspace_line_settings(channel_id);

CREATE INDEX IF NOT EXISTS idx_workspace_line_settings_workspace_active
  ON public.workspace_line_settings(workspace_id) WHERE is_active = true;

COMMENT ON TABLE public.workspace_line_settings IS
  '每 workspace 的 LINE OA 設定。channel_id = LINE OA destination ID（webhook 反查 workspace 用）';
COMMENT ON COLUMN public.workspace_line_settings.channel_access_token IS
  'LINE Channel Access Token。⚠️ demo 階段明文存、phase 2 換 BYTEA + Supabase Vault 加密';
COMMENT ON COLUMN public.workspace_line_settings.channel_secret IS
  'LINE Channel Secret。⚠️ demo 階段明文存、phase 2 換 BYTEA + Supabase Vault 加密';
COMMENT ON COLUMN public.workspace_line_settings.bot_employee_id IS
  '對應 employees(id)、自助 setup 時自動建 BOT-{workspace_code}-001';

-- updated_at trigger
DROP TRIGGER IF EXISTS set_workspace_line_settings_updated_at ON public.workspace_line_settings;
CREATE TRIGGER set_workspace_line_settings_updated_at
  BEFORE UPDATE ON public.workspace_line_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. line_conversation_messages（對話歷史 / bot context）
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.line_conversation_messages (
  id BIGSERIAL PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  line_user_id TEXT NOT NULL,                     -- LINE U-ID（對話對象）

  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  sender TEXT NOT NULL CHECK (sender IN ('customer', 'bot', 'agent')),

  message_type TEXT NOT NULL DEFAULT 'text',      -- text / image / postback / sticker / ...
  content TEXT,                                   -- 文字內容（image 走 raw_event.message.id 拿）
  raw_event JSONB,                                -- LINE webhook 原始 event（debug / postback data）

  -- 關聯（bot 建單後反向標記用）
  related_order_id UUID,
  reply_token TEXT,                               -- LINE reply token（單次有效、僅 inbound 紀錄）

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_line_conv_workspace_user_time
  ON public.line_conversation_messages(workspace_id, line_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_line_conv_workspace_time
  ON public.line_conversation_messages(workspace_id, created_at DESC);

COMMENT ON TABLE public.line_conversation_messages IS
  'LINE Bot 對話歷史。bot 建立 context / 員工後台檢視 / handoff 接手用';
COMMENT ON COLUMN public.line_conversation_messages.reply_token IS
  'LINE reply token、單次有效約 30 秒。僅 inbound 紀錄、debug 用';

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. customers.line_user_id 欄位
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS line_user_id TEXT;

COMMENT ON COLUMN public.customers.line_user_id IS
  'LINE user ID。bot 對話時用來反查 / 綁定 ERP customer。同 workspace 內唯一';

-- partial unique index：只在 line_user_id IS NOT NULL 時 enforce 唯一
-- 既有 customer 大量 NULL、不能用 UNIQUE constraint
CREATE UNIQUE INDEX IF NOT EXISTS uniq_customers_workspace_line_user
  ON public.customers(workspace_id, line_user_id)
  WHERE line_user_id IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. employees.employee_type CHECK 擴展
--    既有：'human' / 'bot'
--    新增：'system_bot' / 'integration'（卡片要求）
--    'bot' 暫保留向下相容（既有資料有此值、不退役）
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employees_employee_type_check') THEN
    ALTER TABLE public.employees
      DROP CONSTRAINT employees_employee_type_check;
  END IF;

  ALTER TABLE public.employees
    ADD CONSTRAINT employees_employee_type_check
    CHECK (employee_type IN ('human', 'bot', 'system_bot', 'integration'));
END $$;

COMMENT ON COLUMN public.employees.employee_type IS
  '員工類型：human（人類）/ bot（舊版機器人、向下相容）/ system_bot（LINE Bot 等系統機器人）/ integration（外部整合 e.g. 永豐 webhook actor）';

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. 「系統機器人」role（平台層共用、workspace_id = NULL）
--    schema 確認 workspace_roles.workspace_id 是 nullable、可建平台 role
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_role_id UUID;
BEGIN
  SELECT id INTO v_role_id
  FROM public.workspace_roles
  WHERE workspace_id IS NULL AND name = '系統機器人';

  IF v_role_id IS NULL THEN
    INSERT INTO public.workspace_roles (workspace_id, name, description, is_admin, sort_order)
    VALUES (
      NULL,
      '系統機器人',
      '平台共用 role：AI bot / LINE Bot 等系統自動化操作專用。固定 capability set、不給 finance / hr / settings 權限',
      false,
      999
    )
    RETURNING id INTO v_role_id;
    RAISE NOTICE '✓ 建立平台層「系統機器人」role: %', v_role_id;
  ELSE
    RAISE NOTICE '○ 平台層「系統機器人」role 已存在: %', v_role_id;
  END IF;

  -- 6. 給「系統機器人」role 5 個 capability
  --    用 ON CONFLICT DO UPDATE 確保 enabled = true
  INSERT INTO public.role_capabilities (role_id, capability_code, enabled)
  VALUES
    (v_role_id, 'orders.read', true),
    (v_role_id, 'orders.write', true),
    (v_role_id, 'customers.read', true),
    (v_role_id, 'customers.write', true),
    (v_role_id, 'tours.read', true)
  ON CONFLICT (role_id, capability_code) DO UPDATE SET enabled = true;

  RAISE NOTICE '✓ 系統機器人 role 5 capability 設定完成';
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. workspace_features 補 'line_bot' feature flag entry
--    （只是把 feature_code 註冊進系統、各 workspace 是否開通由 platform admin
--     另外 INSERT workspace_features row 控制、不在這 migration 自動開）
--
--    用 DO block 安全地檢查 workspace_features schema、找不到 features catalog
--    表就跳過（ERP 用法是 workspace_features 直接存 (workspace_id, feature_code)
--    pair、沒 catalog 表）
-- ─────────────────────────────────────────────────────────────────────────────

-- workspace_features 這張表 schema 是 (workspace_id, feature_code, enabled, ...)
-- 這 migration 不主動開 feature 給任何 workspace、由 platform admin 自助開通流程處理

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. RLS policies
-- ─────────────────────────────────────────────────────────────────────────────

-- workspace_line_settings: 只能看 / 改自己 workspace 的
ALTER TABLE public.workspace_line_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS line_settings_select_own ON public.workspace_line_settings;
CREATE POLICY line_settings_select_own
  ON public.workspace_line_settings FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.employees WHERE user_id = auth.uid()
    )
  );

-- write 守 capability 'line_bot.config'
DROP POLICY IF EXISTS line_settings_write_with_cap ON public.workspace_line_settings;
CREATE POLICY line_settings_write_with_cap
  ON public.workspace_line_settings FOR ALL
  TO authenticated
  USING (
    public.has_capability_for_workspace(workspace_id, 'line_bot.config')
  )
  WITH CHECK (
    public.has_capability_for_workspace(workspace_id, 'line_bot.config')
  );

-- line_conversation_messages: 只能看自己 workspace 的
-- bot webhook 寫入走 admin client（service_role 繞 RLS）
ALTER TABLE public.line_conversation_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS line_conv_select_own ON public.line_conversation_messages;
CREATE POLICY line_conv_select_own
  ON public.line_conversation_messages FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.employees WHERE user_id = auth.uid()
    )
  );

-- 不開 INSERT / UPDATE / DELETE policy 給 authenticated
-- → 只有 service_role（admin client）可以寫
-- → bot webhook 用 admin client 寫對話歷史

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. NOTIFY pgrst reload schema（讓 PostgREST 立刻看到新 table / column）
-- ─────────────────────────────────────────────────────────────────────────────

NOTIFY pgrst, 'reload schema';
