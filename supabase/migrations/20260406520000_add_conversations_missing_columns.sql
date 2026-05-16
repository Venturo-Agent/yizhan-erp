-- 補齊 customer_service_conversations 缺少的欄位
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='customer_service_conversations' AND table_schema='public') THEN
    RETURN;
  END IF;

  ALTER TABLE customer_service_conversations
    ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id),
    ADD COLUMN IF NOT EXISTS follow_up_status TEXT CHECK (follow_up_status IN ('pending', 'done')),
    ADD COLUMN IF NOT EXISTS follow_up_note TEXT;

  CREATE INDEX IF NOT EXISTS idx_conversations_workspace ON customer_service_conversations(workspace_id);

  ALTER TABLE customer_service_conversations ENABLE ROW LEVEL SECURITY;

  DROP POLICY IF EXISTS "conversations_workspace_read" ON customer_service_conversations;
  CREATE POLICY "conversations_workspace_read" ON customer_service_conversations FOR SELECT
    USING (workspace_id = get_current_user_workspace() OR is_super_admin());

  DROP POLICY IF EXISTS "conversations_workspace_update" ON customer_service_conversations;
  CREATE POLICY "conversations_workspace_update" ON customer_service_conversations FOR UPDATE
    USING (workspace_id = get_current_user_workspace() OR is_super_admin());
END $$;
