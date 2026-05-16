-- 公司資源資料夾
CREATE TABLE IF NOT EXISTS company_asset_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES company_asset_folders(id) ON DELETE CASCADE,
  icon TEXT DEFAULT '📁',
  color TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 在 company_assets 加 folder_id
ALTER TABLE company_assets 
ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES company_asset_folders(id) ON DELETE SET NULL;

-- 加 workspace_id（如果還沒有的話）
ALTER TABLE company_assets 
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;

-- 索引
CREATE INDEX IF NOT EXISTS idx_company_asset_folders_workspace ON company_asset_folders(workspace_id);
CREATE INDEX IF NOT EXISTS idx_company_asset_folders_parent ON company_asset_folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_company_assets_folder ON company_assets(folder_id);

-- RLS
ALTER TABLE company_asset_folders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "company_asset_folders_workspace_access" ON company_asset_folders;
CREATE POLICY "company_asset_folders_workspace_access" ON company_asset_folders
  FOR ALL USING (
    workspace_id = get_current_user_workspace() OR is_super_admin()
  );
