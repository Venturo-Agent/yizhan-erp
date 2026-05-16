CREATE TABLE IF NOT EXISTS workspace_line_config (
  workspace_id UUID PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
  channel_access_token TEXT,
  channel_secret TEXT,
  bot_basic_id TEXT,
  bot_display_name TEXT,
  bot_user_id TEXT,
  webhook_url TEXT,
  is_connected BOOLEAN NOT NULL DEFAULT FALSE,
  setup_step INTEGER NOT NULL DEFAULT 0,
  connected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE workspace_line_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workspace_line_config_select" ON workspace_line_config;
CREATE POLICY "workspace_line_config_select" ON workspace_line_config
  FOR SELECT USING (workspace_id = get_current_user_workspace() OR is_super_admin());

DROP POLICY IF EXISTS "workspace_line_config_insert" ON workspace_line_config;
CREATE POLICY "workspace_line_config_insert" ON workspace_line_config
  FOR INSERT WITH CHECK (workspace_id = get_current_user_workspace());

DROP POLICY IF EXISTS "workspace_line_config_update" ON workspace_line_config;
CREATE POLICY "workspace_line_config_update" ON workspace_line_config
  FOR UPDATE USING (workspace_id = get_current_user_workspace() OR is_super_admin());
