-- =============================================================================
-- M4.1: workspace_instagram_settings + IG DM 整合基礎設施
-- =============================================================================
--
-- Why: AI 整合平台第三通路 IG。IG DM 透過 Meta Graph API、需 IG Business Account
--      綁定 FB Page、用 Page Access Token 收發訊息。
--
-- 設計決策（不依賴 workspace_facebook_settings）:
--   - IG 自帶獨立 page_access_token_encrypted（雖然跟 FB Page 共用、但獨立存
--     避免 FB / IG 設定耦合、客戶可只開 IG 不開 FB）
--   - ig_business_account_id 是 IG Business 的 ID（webhook entry.id 反查 workspace）
--   - ig_username 用於 UI 顯示（@xxx）
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.workspace_instagram_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,

  -- IG Business Account 識別
  ig_business_account_id TEXT NOT NULL,        -- IG Business ID（webhook 反查 workspace）
  ig_username TEXT,                            -- @xxx 顯示用
  linked_fb_page_id TEXT,                      -- 綁定的 FB Page ID（IG 寄生在 FB Page 上）

  -- 敏感欄位（加密）
  page_access_token_encrypted TEXT NOT NULL,
  app_secret_encrypted TEXT,

  -- Webhook 設定
  webhook_verify_token TEXT,

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

  CONSTRAINT workspace_instagram_settings_workspace_uniq UNIQUE (workspace_id),
  CONSTRAINT workspace_instagram_settings_account_uniq UNIQUE (ig_business_account_id)
);

CREATE INDEX IF NOT EXISTS idx_workspace_instagram_settings_account_id
  ON public.workspace_instagram_settings(ig_business_account_id);

CREATE INDEX IF NOT EXISTS idx_workspace_instagram_settings_workspace_active
  ON public.workspace_instagram_settings(workspace_id) WHERE is_active = true;

COMMENT ON TABLE public.workspace_instagram_settings IS
  '每 workspace 的 IG Business Account 設定。ig_business_account_id 用於 webhook 反查';
COMMENT ON COLUMN public.workspace_instagram_settings.page_access_token_encrypted IS
  'FB Page Access Token（IG 透過綁定的 FB Page 操作）、AES-256-GCM 加密';
COMMENT ON COLUMN public.workspace_instagram_settings.linked_fb_page_id IS
  'IG Business Account 必須綁定一個 FB Page、這欄記住綁的是哪個（debug 用）';

DROP TRIGGER IF EXISTS set_workspace_instagram_settings_updated_at ON public.workspace_instagram_settings;
CREATE TRIGGER set_workspace_instagram_settings_updated_at
  BEFORE UPDATE ON public.workspace_instagram_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.workspace_instagram_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS instagram_settings_select_own ON public.workspace_instagram_settings;
CREATE POLICY instagram_settings_select_own
  ON public.workspace_instagram_settings FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.employees WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS instagram_settings_write_with_cap ON public.workspace_instagram_settings;
CREATE POLICY instagram_settings_write_with_cap
  ON public.workspace_instagram_settings FOR ALL
  TO authenticated
  USING (public.has_capability_for_workspace(workspace_id, 'instagram_bot.config'))
  WITH CHECK (public.has_capability_for_workspace(workspace_id, 'instagram_bot.config'));

NOTIFY pgrst, 'reload schema';

COMMIT;

-- ════ Rollback ════
-- BEGIN;
-- DROP POLICY IF EXISTS instagram_settings_write_with_cap ON public.workspace_instagram_settings;
-- DROP POLICY IF EXISTS instagram_settings_select_own ON public.workspace_instagram_settings;
-- DROP TRIGGER IF EXISTS set_workspace_instagram_settings_updated_at ON public.workspace_instagram_settings;
-- DROP INDEX IF EXISTS public.idx_workspace_instagram_settings_workspace_active;
-- DROP INDEX IF EXISTS public.idx_workspace_instagram_settings_account_id;
-- DROP TABLE IF EXISTS public.workspace_instagram_settings;
-- COMMIT;
