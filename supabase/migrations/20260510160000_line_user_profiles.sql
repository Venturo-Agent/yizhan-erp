-- ===========================================
-- LINE 用戶 profile 表（William 2026-05-10 拍板）
-- ===========================================
-- 抓 LINE 用戶 display name + picture url + 綁定的 customer_id
-- 解 sidebar 對話列表「未知用戶」問題、改顯示真名 + 頭像
-- ===========================================

CREATE TABLE IF NOT EXISTS public.line_user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  line_user_id text NOT NULL,
  display_name text,
  picture_url text,
  status_message text,
  language text,
  customer_id text REFERENCES public.customers(id) ON DELETE SET NULL,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, line_user_id)
);

CREATE INDEX IF NOT EXISTS idx_line_user_profiles_workspace
  ON public.line_user_profiles(workspace_id, line_user_id);
CREATE INDEX IF NOT EXISTS idx_line_user_profiles_customer
  ON public.line_user_profiles(customer_id) WHERE customer_id IS NOT NULL;

ALTER TABLE public.line_user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS line_profiles_select ON public.line_user_profiles;
CREATE POLICY line_profiles_select ON public.line_user_profiles FOR SELECT
  USING (workspace_id = public.get_current_user_workspace());

DROP POLICY IF EXISTS line_profiles_all ON public.line_user_profiles;
CREATE POLICY line_profiles_all ON public.line_user_profiles FOR ALL TO authenticated
  USING (workspace_id = public.get_current_user_workspace())
  WITH CHECK (workspace_id = public.get_current_user_workspace());
