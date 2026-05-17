-- ============================================================
-- LINE postback templates
-- 2026-05-18
--
-- 用途：
--   1. LINE Rich Menu 按鈕 postback 自動回覆（webhook 收到 postback event 查這張表）
--   2. AI Hub 對話抽屜「快捷回覆」按鈕（agent 手動發送）
--
-- 一個 workspace 可設多筆、每筆對應一個 postback_data 字串（LINE Rich Menu 設定時填入）
-- ============================================================

CREATE TABLE IF NOT EXISTS public.line_postback_templates (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id   uuid        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  label          text        NOT NULL,        -- 按鈕標籤（AI Hub 抽屜 + 後台管理顯示）
  postback_data  text        NOT NULL,        -- LINE postback data 字串（完全比對）
  response_text  text        NOT NULL,        -- 自動回覆 / 快捷發送的文字內容
  sort_order     int         NOT NULL DEFAULT 0,
  is_active      boolean     NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, postback_data)
);

CREATE INDEX IF NOT EXISTS idx_line_postback_templates_workspace
  ON public.line_postback_templates(workspace_id, is_active, sort_order);

COMMENT ON TABLE  public.line_postback_templates IS 'LINE Rich Menu postback 自動回覆模板 + AI Hub 快捷回覆';
COMMENT ON COLUMN public.line_postback_templates.postback_data IS 'LINE Rich Menu 按鈕設定的 postback.data 字串、完全比對';
COMMENT ON COLUMN public.line_postback_templates.label IS '後台管理 + AI Hub 抽屜顯示的按鈕標籤';
COMMENT ON COLUMN public.line_postback_templates.response_text IS 'webhook 自動回 / agent 快捷發送的文字';

-- RLS
ALTER TABLE public.line_postback_templates ENABLE ROW LEVEL SECURITY;

-- workspace 員工可 SELECT（AI Hub 抽屜需要）
DROP POLICY IF EXISTS line_postback_templates_select ON public.line_postback_templates;
CREATE POLICY line_postback_templates_select ON public.line_postback_templates
  FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM public.employees WHERE id = auth.uid()::uuid
  ));

-- INSERT / UPDATE / DELETE 只 service role（API route 走 admin client）

NOTIFY pgrst, 'reload schema';
