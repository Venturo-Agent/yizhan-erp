-- ============================================================================
-- Migration: 建立 workspace_ai_settings 表（per-workspace AI 設定）
-- Date: 2026-05-10
-- Spec: gap-report § 二、項目 5（租戶 AI 設定 UI）
--
-- 為什麼新建表、不沿用既有 ai_settings：
--   既有 ai_settings 表（20260121 建）是「Logan 單租戶設定檔」、欄位是
--   name / system_prompt / personality 等個人化、無 workspace_id、是 Logan 的
--   全局設定。per-workspace AI 設定（給每個租戶一份）職責不同、欄位不同、
--   分開比擴掉既有表安全。
--
-- 紅線遵守：
--   - 純加法、CREATE TABLE IF NOT EXISTS
--   - RLS ENABLE、不 FORCE
--   - 寫守 capability 'workspaces.write'（跟 workspace 詳情頁一致）
--   - 讀守自己 workspace 或 workspaces.write（跨租戶讀）
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. 建表
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.workspace_ai_settings (
  -- 一個 workspace 一筆、用 workspace_id 直接當 PK
  workspace_id UUID PRIMARY KEY REFERENCES public.workspaces(id) ON DELETE CASCADE,

  -- AI 行為設定
  prompt_template TEXT,               -- 客戶寫的 system prompt 模板
  data_sources TEXT[] NOT NULL DEFAULT '{}',  -- 允許 AI 讀取的資料來源代號（tours / attractions / suppliers / orders / customers ...）
  response_mode TEXT NOT NULL DEFAULT 'friendly' CHECK (response_mode IN ('formal', 'friendly', 'minimal')),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.workspace_ai_settings IS
  '每 workspace 一筆 AI 設定（per-workspace、漫途看別的 workspace 時可代設）';
COMMENT ON COLUMN public.workspace_ai_settings.prompt_template IS
  '客戶自訂的 system prompt 模板、AI 對話開頭注入';
COMMENT ON COLUMN public.workspace_ai_settings.data_sources IS
  'AI 允許讀取的資料來源代號 array（tours / attractions / suppliers / orders / customers）、空陣列代表都不允許';
COMMENT ON COLUMN public.workspace_ai_settings.response_mode IS
  'AI 回應語氣：formal（正式）/ friendly（親切、預設）/ minimal（極簡）';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. updated_at trigger
-- ─────────────────────────────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS set_workspace_ai_settings_updated_at ON public.workspace_ai_settings;
CREATE TRIGGER set_workspace_ai_settings_updated_at
  BEFORE UPDATE ON public.workspace_ai_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. RLS
--   - SELECT：自己 workspace 或有 workspaces.write 的人能跨看
--   - 寫入（INSERT/UPDATE/DELETE）：必須有 workspaces.write capability
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.workspace_ai_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS workspace_ai_settings_select ON public.workspace_ai_settings;
CREATE POLICY workspace_ai_settings_select
  ON public.workspace_ai_settings FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.employees WHERE user_id = auth.uid()
    )
    OR public.has_capability_for_workspace(workspace_id, 'workspaces.write')
  );

DROP POLICY IF EXISTS workspace_ai_settings_write ON public.workspace_ai_settings;
CREATE POLICY workspace_ai_settings_write
  ON public.workspace_ai_settings FOR ALL
  TO authenticated
  USING (
    public.has_capability_for_workspace(workspace_id, 'workspaces.write')
  )
  WITH CHECK (
    public.has_capability_for_workspace(workspace_id, 'workspaces.write')
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. NOTIFY pgrst reload schema
-- ─────────────────────────────────────────────────────────────────────────────

NOTIFY pgrst, 'reload schema';
