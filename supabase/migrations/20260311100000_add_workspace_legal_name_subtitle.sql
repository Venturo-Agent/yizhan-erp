-- 新增法定名稱和標語欄位到 workspaces 表
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS legal_name TEXT;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS subtitle TEXT;
