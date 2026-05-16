ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS max_employees INT NULL;

COMMENT ON COLUMN workspaces.max_employees IS '員工數量上限（NULL = 無上限）';
