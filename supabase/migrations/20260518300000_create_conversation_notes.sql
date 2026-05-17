-- 業務紀錄：每筆對話的內部備忘（agent 可輸入、記錄誰寫的）
-- 不對外公開、純 ERP 內部使用

CREATE TABLE IF NOT EXISTS inbox_conversation_notes (
  id          BIGSERIAL PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES inbox_conversations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
  content     TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_conv_notes_conversation ON inbox_conversation_notes(conversation_id, created_at DESC);
CREATE INDEX idx_conv_notes_workspace    ON inbox_conversation_notes(workspace_id);

ALTER TABLE inbox_conversation_notes ENABLE ROW LEVEL SECURITY;

-- 同 workspace 的 employee 才能讀寫
CREATE POLICY "workspace members can read conversation notes"
  ON inbox_conversation_notes FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM employees WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "workspace members can insert conversation notes"
  ON inbox_conversation_notes FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM employees WHERE auth_user_id = auth.uid()
    )
    AND employee_id IN (
      SELECT id FROM employees WHERE auth_user_id = auth.uid()
    )
  );
