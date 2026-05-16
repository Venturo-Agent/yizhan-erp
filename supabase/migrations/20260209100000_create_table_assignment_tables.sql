-- 分桌功能資料表
-- 用於團體旅遊的餐廳桌次分配

-- 1. 餐食分桌設定（哪些餐需要分桌）
CREATE TABLE IF NOT EXISTS tour_meal_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id TEXT NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,  -- 第幾天
  meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner')),
  restaurant_name TEXT,  -- 餐廳名稱（從行程帶入或手動輸入）
  enabled BOOLEAN DEFAULT false,  -- 是否啟用分桌
  display_order INTEGER DEFAULT 0,
  workspace_id UUID REFERENCES workspaces(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tour_id, day_number, meal_type)
);

-- 2. 桌次定義
CREATE TABLE IF NOT EXISTS tour_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id TEXT NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  meal_setting_id UUID NOT NULL REFERENCES tour_meal_settings(id) ON DELETE CASCADE,
  table_number INTEGER NOT NULL,  -- 桌號（1, 2, 3...）
  capacity INTEGER NOT NULL DEFAULT 10,  -- 每桌人數
  display_order INTEGER DEFAULT 0,
  workspace_id UUID REFERENCES workspaces(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(meal_setting_id, table_number)
);

-- 3. 分桌分配
CREATE TABLE IF NOT EXISTS tour_table_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id UUID NOT NULL REFERENCES tour_tables(id) ON DELETE CASCADE,
  order_member_id UUID NOT NULL REFERENCES order_members(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(table_id, order_member_id)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_tour_meal_settings_tour ON tour_meal_settings(tour_id);
CREATE INDEX IF NOT EXISTS idx_tour_meal_settings_enabled ON tour_meal_settings(tour_id, enabled) WHERE enabled = true;
CREATE INDEX IF NOT EXISTS idx_tour_tables_meal_setting ON tour_tables(meal_setting_id);
CREATE INDEX IF NOT EXISTS idx_tour_table_assignments_table ON tour_table_assignments(table_id);
CREATE INDEX IF NOT EXISTS idx_tour_table_assignments_member ON tour_table_assignments(order_member_id);

-- RLS 政策
ALTER TABLE tour_meal_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tour_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE tour_table_assignments ENABLE ROW LEVEL SECURITY;

-- tour_meal_settings RLS
CREATE POLICY "Users can view meal settings in their workspace"
  ON tour_meal_settings FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert meal settings in their workspace"
  ON tour_meal_settings FOR INSERT
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update meal settings in their workspace"
  ON tour_meal_settings FOR UPDATE
  USING (workspace_id IN (SELECT workspace_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete meal settings in their workspace"
  ON tour_meal_settings FOR DELETE
  USING (workspace_id IN (SELECT workspace_id FROM profiles WHERE id = auth.uid()));

-- tour_tables RLS
CREATE POLICY "Users can view tables in their workspace"
  ON tour_tables FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert tables in their workspace"
  ON tour_tables FOR INSERT
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update tables in their workspace"
  ON tour_tables FOR UPDATE
  USING (workspace_id IN (SELECT workspace_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete tables in their workspace"
  ON tour_tables FOR DELETE
  USING (workspace_id IN (SELECT workspace_id FROM profiles WHERE id = auth.uid()));

-- tour_table_assignments RLS (透過 table 關聯檢查)
CREATE POLICY "Users can view table assignments"
  ON tour_table_assignments FOR SELECT
  USING (
    table_id IN (
      SELECT id FROM tour_tables
      WHERE workspace_id IN (SELECT workspace_id FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can insert table assignments"
  ON tour_table_assignments FOR INSERT
  WITH CHECK (
    table_id IN (
      SELECT id FROM tour_tables
      WHERE workspace_id IN (SELECT workspace_id FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can delete table assignments"
  ON tour_table_assignments FOR DELETE
  USING (
    table_id IN (
      SELECT id FROM tour_tables
      WHERE workspace_id IN (SELECT workspace_id FROM profiles WHERE id = auth.uid())
    )
  );

-- 建立 View 方便查詢桌次狀態
CREATE OR REPLACE VIEW tour_tables_status AS
SELECT
  t.id,
  t.tour_id,
  t.meal_setting_id,
  t.table_number,
  t.capacity,
  t.display_order,
  t.workspace_id,
  ms.day_number,
  ms.meal_type,
  ms.restaurant_name,
  COUNT(ta.id)::INTEGER AS assigned_count,
  (COUNT(ta.id) >= t.capacity) AS is_full
FROM tour_tables t
JOIN tour_meal_settings ms ON ms.id = t.meal_setting_id
LEFT JOIN tour_table_assignments ta ON ta.table_id = t.id
GROUP BY t.id, t.tour_id, t.meal_setting_id, t.table_number, t.capacity,
         t.display_order, t.workspace_id, ms.day_number, ms.meal_type, ms.restaurant_name;

-- 更新時間觸發器
CREATE OR REPLACE FUNCTION update_tour_meal_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tour_meal_settings_updated_at ON tour_meal_settings;
CREATE TRIGGER tour_meal_settings_updated_at
  BEFORE UPDATE ON tour_meal_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_tour_meal_settings_updated_at();

CREATE OR REPLACE FUNCTION update_tour_tables_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tour_tables_updated_at ON tour_tables;
CREATE TRIGGER tour_tables_updated_at
  BEFORE UPDATE ON tour_tables
  FOR EACH ROW
  EXECUTE FUNCTION update_tour_tables_updated_at();

COMMENT ON TABLE tour_meal_settings IS '團體餐食分桌設定 - 記錄哪些餐需要分桌';
COMMENT ON TABLE tour_tables IS '團體桌次定義 - 每個需要分桌的餐有幾桌';
COMMENT ON TABLE tour_table_assignments IS '團體分桌分配 - 成員分配到哪一桌';
