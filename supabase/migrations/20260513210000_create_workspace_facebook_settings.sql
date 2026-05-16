-- =============================================================================
-- M3.1: workspace_facebook_settings + FB Messenger 整合基礎設施
-- =============================================================================
--
-- Why: William 拍板 2026-05-13、venturo 重新定位為 AI 整合平台、
--      第一階段三通路 = LINE / FB / IG。LINE 既有、FB 從零做、IG 之後 M4 沿用 FB 表結構。
--
-- 內容：
--   1. workspace_facebook_settings 表（每 workspace 一筆 FB Page 設定）
--      - 不重複建 line_conversation_messages 同類訊息表（M7 統一 schema 重做）
--   2. RLS policies（select 自己 workspace、write 守 facebook_bot.config）
--   3. updated_at trigger
--
-- 加密紀律（不同於 LINE 5/9 那輪、這次從 day 1 加密）:
--   - page_access_token / app_secret 必須先過 src/lib/crypto/integration-encryption.ts
--     的 encryptIntegrationSecret() 再寫入、欄位命名 *_encrypted 標明
--   - DB 看到的永遠是 base64 envelope（iv + tag + ciphertext、AES-256-GCM）
--   - master key 在 env VENTURO_INTEGRATION_ENCRYPTION_KEY、漏 DB ≠ 漏 token
--
-- 路徑紀律（A 路線）:
--   - 不動既有 workspace_line_settings 表（4/20 事故記憶）
--   - LINE 與 FB / IG 並存兩套 setup 邏輯、M7 統一 Polymorphic Inbox 時整合
-- =============================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. workspace_facebook_settings
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.workspace_facebook_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,

  -- FB Page 識別
  page_id TEXT NOT NULL,                       -- FB Page ID（webhook entry.id 反查 workspace）
  page_name TEXT,                              -- Page 顯示名（驗證 token 時順便存）

  -- 敏感欄位（必加密、寫入前過 encryptIntegrationSecret()）
  page_access_token_encrypted TEXT NOT NULL,   -- Page Access Token（base64 AES-256-GCM envelope）
  app_secret_encrypted TEXT,                   -- App Secret（驗 webhook signature 用、可選）

  -- Webhook 設定
  webhook_verify_token TEXT,                   -- Meta 訂閱 webhook 時 GET 用、自動生成

  -- 業務設定
  bot_greeting TEXT,
  handoff_enabled BOOLEAN NOT NULL DEFAULT false,
  handoff_target TEXT,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,

  -- 系統管理
  bot_employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  webhook_verified_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT workspace_facebook_settings_workspace_uniq UNIQUE (workspace_id),
  CONSTRAINT workspace_facebook_settings_page_uniq UNIQUE (page_id)
);

CREATE INDEX IF NOT EXISTS idx_workspace_facebook_settings_page_id
  ON public.workspace_facebook_settings(page_id);

CREATE INDEX IF NOT EXISTS idx_workspace_facebook_settings_workspace_active
  ON public.workspace_facebook_settings(workspace_id) WHERE is_active = true;

COMMENT ON TABLE public.workspace_facebook_settings IS
  '每 workspace 的 FB Page 設定。page_id 用於 webhook entry.id 反查 workspace';
COMMENT ON COLUMN public.workspace_facebook_settings.page_access_token_encrypted IS
  'FB Page Access Token、AES-256-GCM 加密（base64 envelope）。寫入前過 encryptIntegrationSecret()';
COMMENT ON COLUMN public.workspace_facebook_settings.app_secret_encrypted IS
  'FB App Secret、用於驗 webhook X-Hub-Signature-256。同樣加密、寫入前過 helper';
COMMENT ON COLUMN public.workspace_facebook_settings.webhook_verify_token IS
  'Meta 訂閱 webhook 時的 verify token、Provision 時自動生成、Meta 過來 GET 驗證用';

-- updated_at trigger
DROP TRIGGER IF EXISTS set_workspace_facebook_settings_updated_at ON public.workspace_facebook_settings;
CREATE TRIGGER set_workspace_facebook_settings_updated_at
  BEFORE UPDATE ON public.workspace_facebook_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. RLS
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.workspace_facebook_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS facebook_settings_select_own ON public.workspace_facebook_settings;
CREATE POLICY facebook_settings_select_own
  ON public.workspace_facebook_settings FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.employees WHERE user_id = auth.uid()
    )
  );

-- write 守 capability 'facebook_bot.config'
DROP POLICY IF EXISTS facebook_settings_write_with_cap ON public.workspace_facebook_settings;
CREATE POLICY facebook_settings_write_with_cap
  ON public.workspace_facebook_settings FOR ALL
  TO authenticated
  USING (
    public.has_capability_for_workspace(workspace_id, 'facebook_bot.config')
  )
  WITH CHECK (
    public.has_capability_for_workspace(workspace_id, 'facebook_bot.config')
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. NOTIFY PostgREST 重載
-- ─────────────────────────────────────────────────────────────────────────────

NOTIFY pgrst, 'reload schema';

COMMIT;

-- ════ Rollback（萬一爆炸、複製貼上跑）════
-- BEGIN;
-- DROP POLICY IF EXISTS facebook_settings_write_with_cap ON public.workspace_facebook_settings;
-- DROP POLICY IF EXISTS facebook_settings_select_own ON public.workspace_facebook_settings;
-- DROP TRIGGER IF EXISTS set_workspace_facebook_settings_updated_at ON public.workspace_facebook_settings;
-- DROP INDEX IF EXISTS public.idx_workspace_facebook_settings_workspace_active;
-- DROP INDEX IF EXISTS public.idx_workspace_facebook_settings_page_id;
-- DROP TABLE IF EXISTS public.workspace_facebook_settings;
-- COMMIT;
