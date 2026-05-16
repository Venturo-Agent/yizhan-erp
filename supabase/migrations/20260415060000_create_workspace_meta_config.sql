CREATE TABLE IF NOT EXISTS workspace_meta_config (
  workspace_id UUID PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
  verify_token TEXT,
  page_access_token TEXT,
  app_secret TEXT,
  app_id TEXT,
  is_connected BOOLEAN NOT NULL DEFAULT FALSE,
  setup_step INTEGER NOT NULL DEFAULT 0,
  connected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE workspace_meta_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workspace_meta_config_select" ON workspace_meta_config;
CREATE POLICY "workspace_meta_config_select" ON workspace_meta_config
  FOR SELECT USING (workspace_id = get_current_user_workspace() OR is_super_admin());

DROP POLICY IF EXISTS "workspace_meta_config_insert" ON workspace_meta_config;
CREATE POLICY "workspace_meta_config_insert" ON workspace_meta_config
  FOR INSERT WITH CHECK (workspace_id = get_current_user_workspace());

DROP POLICY IF EXISTS "workspace_meta_config_update" ON workspace_meta_config;
CREATE POLICY "workspace_meta_config_update" ON workspace_meta_config
  FOR UPDATE USING (workspace_id = get_current_user_workspace() OR is_super_admin());