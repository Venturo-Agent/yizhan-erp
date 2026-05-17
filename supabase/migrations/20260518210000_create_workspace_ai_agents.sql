-- ============================================================
-- workspace_ai_agents：每個 workspace 的 AI 客服人格設定
-- 2026-05-18
--
-- 背景：
--   ai_agents（2026-05-12）= AI 實體（HAPPY 等）的全局定義
--   workspace_ai_agents     = 各 workspace 如何使用 AI（人格 / 資料源 / 系統提示詞）
--
-- 設計：
--   - 每個 workspace 可針對不同 channel_type 設定不同人格
--   - brand_description：客戶自填品牌資訊（注入 system prompt context）
--   - system_prompt_override：漫途 admin 覆寫 system prompt（客戶看不到）
--   - data_sources：AI 被允許查閱的資料集（whitelist）
-- ============================================================

CREATE TABLE IF NOT EXISTS public.workspace_ai_agents (
  id                     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id           uuid        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  channel_type           text        NOT NULL DEFAULT 'all'
                                     CHECK (channel_type IN ('line', 'facebook', 'instagram', 'all')),
  brand_description      text,       -- 客戶填：品牌介紹（公司名 / 服務 / 語氣 / 禁語等）
  system_prompt_override text,       -- 漫途 admin 填：完整覆寫 system prompt（優先於 brand_description）
  data_sources           jsonb       NOT NULL DEFAULT '[]'::jsonb,
                                     -- 例：["tours", "customers", "faq"]
  is_active              boolean     NOT NULL DEFAULT true,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, channel_type)
);

CREATE INDEX IF NOT EXISTS idx_workspace_ai_agents_workspace
  ON public.workspace_ai_agents(workspace_id, channel_type);

COMMENT ON TABLE  public.workspace_ai_agents IS '各 workspace AI 客服人格設定';
COMMENT ON COLUMN public.workspace_ai_agents.channel_type IS 'line/facebook/instagram/all（all 是跨 channel 預設值、優先順序最低）';
COMMENT ON COLUMN public.workspace_ai_agents.brand_description IS '客戶自填品牌資訊、注入 system prompt 作為品牌 context';
COMMENT ON COLUMN public.workspace_ai_agents.system_prompt_override IS '漫途 admin 覆寫整個 system prompt、客戶看不到此欄';
COMMENT ON COLUMN public.workspace_ai_agents.data_sources IS 'AI 可查閱的資料集 whitelist，例 ["tours", "customers", "faq"]';

-- RLS
ALTER TABLE public.workspace_ai_agents ENABLE ROW LEVEL SECURITY;

-- workspace 員工可 SELECT
DROP POLICY IF EXISTS workspace_ai_agents_select ON public.workspace_ai_agents;
CREATE POLICY workspace_ai_agents_select ON public.workspace_ai_agents
  FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM public.employees WHERE id = auth.uid()::uuid
  ));

-- INSERT / UPDATE / DELETE 只 service role

NOTIFY pgrst, 'reload schema';
