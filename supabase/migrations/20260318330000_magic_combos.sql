-- 組合魔法系統
-- 建立日期：2026-03-18
-- 用途：追蹤魔法組合配方

-- 1. 組合魔法主表
CREATE TABLE IF NOT EXISTS magic_combos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  combo_name TEXT NOT NULL,
  description TEXT,
  usage_example TEXT,
  use_case TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 組合魔法項目關聯表
CREATE TABLE IF NOT EXISTS magic_combo_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  combo_id UUID NOT NULL REFERENCES magic_combos(id) ON DELETE CASCADE,
  magic_id UUID NOT NULL REFERENCES magic_library(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  role TEXT, -- 主魔法/輔助魔法
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Agent 註冊表
CREATE TABLE IF NOT EXISTS agent_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  agent_name TEXT NOT NULL,
  agent_key TEXT UNIQUE, -- agent:matthew:main
  role TEXT,
  emoji TEXT,
  telegram_id TEXT,
  bot_id UUID REFERENCES bot_registry(id),
  is_deployed BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'inactive', -- active, inactive, offline
  description TEXT,
  managed_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_magic_combos_workspace ON magic_combos(workspace_id);
CREATE INDEX idx_magic_combo_items_combo ON magic_combo_items(combo_id);
CREATE INDEX idx_magic_combo_items_magic ON magic_combo_items(magic_id);
CREATE INDEX idx_agent_registry_workspace ON agent_registry(workspace_id);
CREATE INDEX idx_agent_registry_key ON agent_registry(agent_key);
CREATE INDEX idx_agent_registry_bot ON agent_registry(bot_id);

-- RLS 政策（與 magic_library 相同）
ALTER TABLE magic_combos ENABLE ROW LEVEL SECURITY;
ALTER TABLE magic_combo_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_registry ENABLE ROW LEVEL SECURITY;

-- SELECT 政策
DROP POLICY IF EXISTS "magic_combos_select" ON magic_combos;
CREATE POLICY magic_combos_select ON magic_combos
  FOR SELECT
  USING (is_super_admin() OR (workspace_id)::text = (get_current_user_workspace())::text);

DROP POLICY IF EXISTS "magic_combo_items_select" ON magic_combo_items;
CREATE POLICY magic_combo_items_select ON magic_combo_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM magic_combos 
      WHERE magic_combos.id = combo_id 
      AND (is_super_admin() OR (magic_combos.workspace_id)::text = (get_current_user_workspace())::text)
    )
  );

DROP POLICY IF EXISTS "agent_registry_select" ON agent_registry;
CREATE POLICY agent_registry_select ON agent_registry
  FOR SELECT
  USING (is_super_admin() OR (workspace_id)::text = (get_current_user_workspace())::text);

-- INSERT 政策
DROP POLICY IF EXISTS "magic_combos_insert" ON magic_combos;
CREATE POLICY magic_combos_insert ON magic_combos
  FOR INSERT
  WITH CHECK (is_super_admin() OR (workspace_id)::text = (get_current_user_workspace())::text);

DROP POLICY IF EXISTS "magic_combo_items_insert" ON magic_combo_items;
CREATE POLICY magic_combo_items_insert ON magic_combo_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM magic_combos 
      WHERE magic_combos.id = combo_id 
      AND (is_super_admin() OR (magic_combos.workspace_id)::text = (get_current_user_workspace())::text)
    )
  );

DROP POLICY IF EXISTS "agent_registry_insert" ON agent_registry;
CREATE POLICY agent_registry_insert ON agent_registry
  FOR INSERT
  WITH CHECK (is_super_admin() OR (workspace_id)::text = (get_current_user_workspace())::text);

-- UPDATE 政策
DROP POLICY IF EXISTS "magic_combos_update" ON magic_combos;
CREATE POLICY magic_combos_update ON magic_combos
  FOR UPDATE
  USING (is_super_admin() OR (workspace_id)::text = (get_current_user_workspace())::text);

DROP POLICY IF EXISTS "magic_combo_items_update" ON magic_combo_items;
CREATE POLICY magic_combo_items_update ON magic_combo_items
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM magic_combos 
      WHERE magic_combos.id = combo_id 
      AND (is_super_admin() OR (magic_combos.workspace_id)::text = (get_current_user_workspace())::text)
    )
  );

DROP POLICY IF EXISTS "agent_registry_update" ON agent_registry;
CREATE POLICY agent_registry_update ON agent_registry
  FOR UPDATE
  USING (is_super_admin() OR (workspace_id)::text = (get_current_user_workspace())::text);

-- DELETE 政策
DROP POLICY IF EXISTS "magic_combos_delete" ON magic_combos;
CREATE POLICY magic_combos_delete ON magic_combos
  FOR DELETE
  USING (is_super_admin() OR (workspace_id)::text = (get_current_user_workspace())::text);

DROP POLICY IF EXISTS "magic_combo_items_delete" ON magic_combo_items;
CREATE POLICY magic_combo_items_delete ON magic_combo_items
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM magic_combos 
      WHERE magic_combos.id = combo_id 
      AND (is_super_admin() OR (magic_combos.workspace_id)::text = (get_current_user_workspace())::text)
    )
  );

DROP POLICY IF EXISTS "agent_registry_delete" ON agent_registry;
CREATE POLICY agent_registry_delete ON agent_registry
  FOR DELETE
  USING (is_super_admin() OR (workspace_id)::text = (get_current_user_workspace())::text);
