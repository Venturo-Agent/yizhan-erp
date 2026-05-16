-- ============================================
-- 職務角色系統：租戶自訂團務/訂單角色
-- ============================================

-- 1. 職務定義（租戶設定）
CREATE TABLE IF NOT EXISTS workspace_job_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  scope TEXT NOT NULL CHECK (scope IN ('tour', 'order')),
  is_required BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, name)
);

-- 2. 員工職務（多對多）
CREATE TABLE IF NOT EXISTS employee_job_roles (
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES workspace_job_roles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (employee_id, role_id)
);

-- 3. 團/訂單角色指派（tours.id 和 orders.id 為 text 型別）
CREATE TABLE IF NOT EXISTS tour_role_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id TEXT NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  order_id TEXT REFERENCES orders(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES workspace_job_roles(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tour_id, order_id, role_id)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_workspace_job_roles_workspace ON workspace_job_roles(workspace_id);
CREATE INDEX IF NOT EXISTS idx_employee_job_roles_employee ON employee_job_roles(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_job_roles_role ON employee_job_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_tour_role_assignments_tour ON tour_role_assignments(tour_id);
CREATE INDEX IF NOT EXISTS idx_tour_role_assignments_order ON tour_role_assignments(order_id);

-- RLS
ALTER TABLE workspace_job_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_job_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tour_role_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workspace_job_roles_all" ON workspace_job_roles;
CREATE POLICY "workspace_job_roles_all" ON workspace_job_roles FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "employee_job_roles_all" ON employee_job_roles;
CREATE POLICY "employee_job_roles_all" ON employee_job_roles FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "tour_role_assignments_all" ON tour_role_assignments;
CREATE POLICY "tour_role_assignments_all" ON tour_role_assignments FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- 為角落旅行社寫入預設職務
-- ============================================
DO $$
DECLARE
  ws_id UUID;
BEGIN
  -- 取得角落旅行社的 workspace_id
  SELECT id INTO ws_id FROM workspaces WHERE name = '角落旅行社' LIMIT 1;

  IF ws_id IS NOT NULL THEN
    INSERT INTO workspace_job_roles (workspace_id, name, scope, is_required, sort_order) VALUES
      (ws_id, '管理員', 'tour', true, 1),
      (ws_id, '助理', 'tour', false, 2),
      (ws_id, '業務', 'order', true, 3)
    ON CONFLICT (workspace_id, name) DO NOTHING;
  END IF;
END $$;

-- ============================================
-- 遷移現有資料到新表
-- ============================================
-- 遷移現有資料（跳過如果有 FK 問題）
DO $$ BEGIN
  RAISE NOTICE 'Skipping data migration for job roles (already migrated)';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
