-- ===========================================
-- LINE Bot 真人接管模式（William 2026-05-10 拍板）
-- ===========================================
-- 業務切入對話、暫停 bot 自動回覆、agent 用 push API 主動發訊息
-- spec：CornerVenturo-Vault/01-Active-Projects/ERP/AI整合平台/03-LINE-Bot-第一階段.md §8.1
-- ===========================================

CREATE TABLE IF NOT EXISTS public.line_conversation_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  line_user_id text NOT NULL,
  bot_paused boolean NOT NULL DEFAULT false,
  paused_by uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  paused_at timestamptz,
  paused_until timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, line_user_id)
);

CREATE INDEX IF NOT EXISTS idx_line_overrides_workspace
  ON public.line_conversation_overrides(workspace_id, line_user_id);

ALTER TABLE public.line_conversation_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS line_overrides_select ON public.line_conversation_overrides;
CREATE POLICY line_overrides_select ON public.line_conversation_overrides FOR SELECT
  USING (workspace_id = public.get_current_user_workspace());

DROP POLICY IF EXISTS line_overrides_all ON public.line_conversation_overrides;
CREATE POLICY line_overrides_all ON public.line_conversation_overrides FOR ALL TO authenticated
  USING (workspace_id = public.get_current_user_workspace())
  WITH CHECK (workspace_id = public.get_current_user_workspace());
