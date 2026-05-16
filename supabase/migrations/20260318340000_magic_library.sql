-- 魔法塔圖書館
-- 建立日期：2026-03-18
-- 用途：追蹤所有開源魔法（工具、框架、API）

CREATE TABLE IF NOT EXISTS magic_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  layer TEXT NOT NULL,
  source_type TEXT NOT NULL,
  official_url TEXT,
  github_url TEXT,
  current_version TEXT,
  latest_version TEXT,
  update_status TEXT DEFAULT 'unknown',
  last_checked_at TIMESTAMPTZ,
  description TEXT,
  check_frequency TEXT DEFAULT 'quarterly',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_magic_library_workspace ON magic_library(workspace_id);
CREATE INDEX IF NOT EXISTS idx_magic_library_category ON magic_library(category);
CREATE INDEX IF NOT EXISTS idx_magic_library_layer ON magic_library(layer);
CREATE INDEX IF NOT EXISTS idx_magic_library_status ON magic_library(update_status);

-- RLS
ALTER TABLE magic_library ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "magic_library_select" ON magic_library;
CREATE POLICY magic_library_select ON magic_library
  FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS "magic_library_insert" ON magic_library;
CREATE POLICY magic_library_insert ON magic_library
  FOR INSERT
  WITH CHECK (is_super_admin());

DROP POLICY IF EXISTS "magic_library_update" ON magic_library;
CREATE POLICY magic_library_update ON magic_library
  FOR UPDATE
  USING (is_super_admin());

DROP POLICY IF EXISTS "magic_library_delete" ON magic_library;
CREATE POLICY magic_library_delete ON magic_library
  FOR DELETE
  USING (is_super_admin());
