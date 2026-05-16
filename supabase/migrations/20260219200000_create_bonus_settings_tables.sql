-- 獎金設定表：每團的獎金設定
CREATE TABLE IF NOT EXISTS tour_bonus_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id),
  tour_id text NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  type smallint NOT NULL, -- 0=營收稅額, 1=OP獎金, 2=業務獎金, 3=團隊獎金, 4=行政費用
  bonus numeric NOT NULL DEFAULT 0,
  bonus_type smallint NOT NULL DEFAULT 0, -- 0=百分比, 1=固定金額, 2=負百分比, 3=負固定金額
  employee_id uuid REFERENCES employees(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- workspace 層級的獎金預設值
CREATE TABLE IF NOT EXISTS workspace_bonus_defaults (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id),
  type smallint NOT NULL,
  bonus numeric NOT NULL DEFAULT 0,
  bonus_type smallint NOT NULL DEFAULT 0,
  employee_id uuid REFERENCES employees(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tour_bonus_settings_tour_id ON tour_bonus_settings(tour_id);
CREATE INDEX IF NOT EXISTS idx_tour_bonus_settings_workspace_id ON tour_bonus_settings(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_bonus_defaults_workspace_id ON workspace_bonus_defaults(workspace_id);

-- RLS
ALTER TABLE tour_bonus_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_bonus_defaults ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_tour_bonus_settings" ON tour_bonus_settings;
CREATE POLICY "authenticated_tour_bonus_settings" ON tour_bonus_settings
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_workspace_bonus_defaults" ON workspace_bonus_defaults;
CREATE POLICY "authenticated_workspace_bonus_defaults" ON workspace_bonus_defaults
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
