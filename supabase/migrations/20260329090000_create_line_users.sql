-- LINE 用戶追蹤表（記錄加好友的陌生人）
CREATE TABLE IF NOT EXISTS line_users (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid REFERENCES workspaces(id),
  user_id text NOT NULL UNIQUE,  -- LINE User ID
  display_name text,              -- LINE 顯示名稱
  picture_url text,               -- 大頭貼 URL
  status_message text,            -- 狀態訊息
  supplier_id uuid REFERENCES suppliers(id),  -- 綁定的供應商（可為空）
  employee_id uuid REFERENCES employees(id),  -- 綁定的員工（可為空）
  note text,                      -- 備註
  followed_at timestamptz DEFAULT now(),  -- 加好友時間
  unfollowed_at timestamptz,      -- 取消好友時間（如果有）
  updated_at timestamptz DEFAULT now()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_line_users_workspace ON line_users(workspace_id);
CREATE INDEX IF NOT EXISTS idx_line_users_supplier ON line_users(supplier_id);
CREATE INDEX IF NOT EXISTS idx_line_users_employee ON line_users(employee_id);

-- RLS
ALTER TABLE line_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "line_users_select" ON line_users;
CREATE POLICY "line_users_select" ON line_users FOR SELECT USING (
  workspace_id = get_current_user_workspace() OR is_super_admin()
);

DROP POLICY IF EXISTS "line_users_insert" ON line_users;
CREATE POLICY "line_users_insert" ON line_users FOR INSERT WITH CHECK (
  workspace_id = get_current_user_workspace() OR is_super_admin()
);

DROP POLICY IF EXISTS "line_users_update" ON line_users;
CREATE POLICY "line_users_update" ON line_users FOR UPDATE USING (
  workspace_id = get_current_user_workspace() OR is_super_admin()
);

DROP POLICY IF EXISTS "line_users_delete" ON line_users;
CREATE POLICY "line_users_delete" ON line_users FOR DELETE USING (
  workspace_id = get_current_user_workspace() OR is_super_admin()
);

-- 更新 line_groups 的 RLS（如果還沒有）
ALTER TABLE line_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "line_groups_select" ON line_groups;
CREATE POLICY "line_groups_select" ON line_groups FOR SELECT USING (
  workspace_id = get_current_user_workspace() OR is_super_admin()
);

DROP POLICY IF EXISTS "line_groups_insert" ON line_groups;
CREATE POLICY "line_groups_insert" ON line_groups FOR INSERT WITH CHECK (
  workspace_id IS NULL OR workspace_id = get_current_user_workspace() OR is_super_admin()
);

DROP POLICY IF EXISTS "line_groups_update" ON line_groups;
CREATE POLICY "line_groups_update" ON line_groups FOR UPDATE USING (
  workspace_id IS NULL OR workspace_id = get_current_user_workspace() OR is_super_admin()
);

-- 新增欄位到 line_groups（如果沒有）
ALTER TABLE line_groups ADD COLUMN IF NOT EXISTS note text;
ALTER TABLE line_groups ADD COLUMN IF NOT EXISTS category text;  -- 分類：supplier, internal, customer
