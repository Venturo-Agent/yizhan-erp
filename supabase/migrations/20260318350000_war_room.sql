-- 作战会议室 (War Room) - 数据库
-- 2026-03-18

-- ========================================
-- 1. 魔法塔图书馆表
-- ========================================

CREATE TABLE IF NOT EXISTS magic_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  
  -- 基本信息
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('task_management', 'memory', 'search', 'ai_framework', 'dev_tool', 'data_processing')),
  layer TEXT CHECK (layer IN ('layer1_creative', 'layer2_opensource', 'layer3_internal')),
  
  -- 来源信息
  source_type TEXT NOT NULL CHECK (source_type IN ('npm', 'github', 'internal', 'api')),
  official_url TEXT,
  github_url TEXT,
  
  -- 版本信息
  current_version TEXT,
  latest_version TEXT,
  update_status TEXT DEFAULT 'unknown' CHECK (update_status IN ('latest', 'update_available', 'outdated', 'unknown')),
  
  -- 检查时间
  last_checked_at TIMESTAMPTZ,
  
  -- 描述
  description TEXT,
  usage_notes TEXT,
  
  -- 更新频率
  check_frequency TEXT DEFAULT 'quarterly' CHECK (check_frequency IN ('weekly', 'monthly', 'quarterly', 'half_yearly')),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 策略（只有 William + Eddie 能看）
ALTER TABLE magic_library ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "magic_library_select" ON magic_library;
CREATE POLICY magic_library_select ON magic_library
  FOR SELECT
  USING (
    workspace_id = get_current_user_workspace() 
    OR is_super_admin()
  );

DROP POLICY IF EXISTS "magic_library_all" ON magic_library;
CREATE POLICY magic_library_all ON magic_library
  FOR ALL
  USING (is_super_admin());

-- 索引
CREATE INDEX IF NOT EXISTS idx_magic_library_category ON magic_library(category);
CREATE INDEX IF NOT EXISTS idx_magic_library_update_status ON magic_library(update_status);

COMMENT ON TABLE magic_library IS '魔法塔图书馆 - 追踪所有开源项目和依赖';

-- ========================================
-- 2. 机器人管理表
-- ========================================

CREATE TABLE IF NOT EXISTS bot_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  
  -- 基本信息
  bot_name TEXT NOT NULL,
  bot_username TEXT,
  platform TEXT NOT NULL CHECK (platform IN ('line', 'telegram', 'discord', 'slack', 'other')),
  
  -- 状态
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'offline')),
  
  -- Webhook
  webhook_url TEXT,
  webhook_secret TEXT,
  
  -- 描述
  description TEXT,
  managed_by TEXT, -- agent 名称（例如：Eddie）
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- 3. 机器人群组表
-- ========================================

CREATE TABLE IF NOT EXISTS bot_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id UUID NOT NULL REFERENCES bot_registry(id) ON DELETE CASCADE,
  
  -- 群组信息
  group_id TEXT NOT NULL, -- LINE/Telegram 的群组 ID
  group_name TEXT,
  group_type TEXT CHECK (group_type IN ('group', 'channel', 'dm')),
  
  -- 加入信息
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  is_new BOOLEAN DEFAULT true, -- 是否为新加入（用于高亮显示）
  
  -- 元数据
  member_count INTEGER,
  last_activity_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(bot_id, group_id)
);

-- RLS 策略
ALTER TABLE bot_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bot_registry_select" ON bot_registry;
CREATE POLICY bot_registry_select ON bot_registry
  FOR SELECT
  USING (
    workspace_id = get_current_user_workspace() 
    OR is_super_admin()
  );

DROP POLICY IF EXISTS "bot_registry_all" ON bot_registry;
CREATE POLICY bot_registry_all ON bot_registry
  FOR ALL
  USING (is_super_admin());

DROP POLICY IF EXISTS "bot_groups_select" ON bot_groups;
CREATE POLICY bot_groups_select ON bot_groups
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bot_registry
      WHERE bot_registry.id = bot_groups.bot_id
      AND (bot_registry.workspace_id = get_current_user_workspace() OR is_super_admin())
    )
  );

DROP POLICY IF EXISTS "bot_groups_all" ON bot_groups;
CREATE POLICY bot_groups_all ON bot_groups
  FOR ALL
  USING (is_super_admin());

-- 索引
CREATE INDEX IF NOT EXISTS idx_bot_registry_platform ON bot_registry(platform);
CREATE INDEX IF NOT EXISTS idx_bot_groups_bot_id ON bot_groups(bot_id);
CREATE INDEX IF NOT EXISTS idx_bot_groups_is_new ON bot_groups(is_new);

COMMENT ON TABLE bot_registry IS '机器人注册表';
COMMENT ON TABLE bot_groups IS '机器人加入的群组';
