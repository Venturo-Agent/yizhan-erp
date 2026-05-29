CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  preference_key TEXT NOT NULL,
  preference_value JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, preference_key)
);

CREATE TABLE IF NOT EXISTS notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  tab_id TEXT NOT NULL,
  tab_name TEXT NOT NULL DEFAULT '筆記',
  content TEXT NOT NULL DEFAULT '',
  tab_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, tab_id)
);

CREATE TABLE IF NOT EXISTS manifestation_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  record_date DATE NOT NULL,
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, record_date)
);

CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);
CREATE INDEX IF NOT EXISTS idx_manifestation_records_user_id ON manifestation_records(user_id);
CREATE INDEX IF NOT EXISTS idx_manifestation_records_date ON manifestation_records(record_date);

ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE manifestation_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own preferences"
  ON user_preferences FOR SELECT
  USING (user_id = auth.uid() OR user_id IN (SELECT id FROM employees WHERE id = auth.uid()));

CREATE POLICY "Users can insert own preferences"
  ON user_preferences FOR INSERT
  WITH CHECK (user_id = auth.uid() OR user_id IN (SELECT id FROM employees WHERE id = auth.uid()));

CREATE POLICY "Users can update own preferences"
  ON user_preferences FOR UPDATE
  USING (user_id = auth.uid() OR user_id IN (SELECT id FROM employees WHERE id = auth.uid()));

CREATE POLICY "Users can delete own preferences"
  ON user_preferences FOR DELETE
  USING (user_id = auth.uid() OR user_id IN (SELECT id FROM employees WHERE id = auth.uid()));

CREATE POLICY "Users can view own notes"
  ON notes FOR SELECT
  USING (user_id = auth.uid() OR user_id IN (SELECT id FROM employees WHERE id = auth.uid()));

CREATE POLICY "Users can insert own notes"
  ON notes FOR INSERT
  WITH CHECK (user_id = auth.uid() OR user_id IN (SELECT id FROM employees WHERE id = auth.uid()));

CREATE POLICY "Users can update own notes"
  ON notes FOR UPDATE
  USING (user_id = auth.uid() OR user_id IN (SELECT id FROM employees WHERE id = auth.uid()));

CREATE POLICY "Users can delete own notes"
  ON notes FOR DELETE
  USING (user_id = auth.uid() OR user_id IN (SELECT id FROM employees WHERE id = auth.uid()));

CREATE POLICY "Users can view own manifestation records"
  ON manifestation_records FOR SELECT
  USING (user_id = auth.uid() OR user_id IN (SELECT id FROM employees WHERE id = auth.uid()));

CREATE POLICY "Users can insert own manifestation records"
  ON manifestation_records FOR INSERT
  WITH CHECK (user_id = auth.uid() OR user_id IN (SELECT id FROM employees WHERE id = auth.uid()));

CREATE POLICY "Users can update own manifestation records"
  ON manifestation_records FOR UPDATE
  USING (user_id = auth.uid() OR user_id IN (SELECT id FROM employees WHERE id = auth.uid()));

CREATE POLICY "Users can delete own manifestation records"
  ON manifestation_records FOR DELETE
  USING (user_id = auth.uid() OR user_id IN (SELECT id FROM employees WHERE id = auth.uid()));
