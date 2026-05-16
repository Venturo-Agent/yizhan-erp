-- 員工個人權限覆寫表
-- 用於微調個人權限（額外開啟或關閉某些功能）

CREATE TABLE IF NOT EXISTS employee_route_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  route TEXT NOT NULL,
  -- override_type: 'grant' 額外開啟, 'revoke' 關閉（覆蓋職務權限）
  override_type TEXT NOT NULL CHECK (override_type IN ('grant', 'revoke')),
  can_read BOOLEAN DEFAULT false,
  can_write BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(employee_id, route)
);

-- RLS
ALTER TABLE employee_route_overrides ENABLE ROW LEVEL SECURITY;

-- 政策：員工可以讀自己的覆寫
CREATE POLICY "employees_read_own_overrides" ON employee_route_overrides
  FOR SELECT USING (
    employee_id = (SELECT auth.uid()::uuid)
    OR EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = employee_route_overrides.employee_id
      AND e.workspace_id = (
        SELECT workspace_id FROM employees WHERE supabase_user_id = auth.uid()
      )
    )
  );

-- 政策：Service role 可以寫入
CREATE POLICY "service_role_manage_overrides" ON employee_route_overrides
  FOR ALL USING (auth.role() = 'service_role');

-- 索引
CREATE INDEX idx_employee_route_overrides_employee ON employee_route_overrides(employee_id);

COMMENT ON TABLE employee_route_overrides IS '員工個人權限覆寫（微調職務預設權限）';
