-- ================================================================
-- 旅遊團檔案管理系統 - RLS Policies
-- ================================================================

-- tour_requests policies
ALTER TABLE tour_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tour_requests_select_policy" ON tour_requests
  FOR SELECT
  USING (workspace_id IN (SELECT id FROM workspaces WHERE id = workspace_id));

CREATE POLICY "tour_requests_insert_policy" ON tour_requests
  FOR INSERT
  WITH CHECK (workspace_id IN (SELECT id FROM workspaces WHERE id = workspace_id));

CREATE POLICY "tour_requests_update_policy" ON tour_requests
  FOR UPDATE
  USING (workspace_id IN (SELECT id FROM workspaces WHERE id = workspace_id));

CREATE POLICY "tour_requests_delete_policy" ON tour_requests
  FOR DELETE
  USING (workspace_id IN (SELECT id FROM workspaces WHERE id = workspace_id));

-- request_documents policies
ALTER TABLE request_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "request_documents_select_policy" ON request_documents
  FOR SELECT
  USING (workspace_id IN (SELECT id FROM workspaces WHERE id = workspace_id));

CREATE POLICY "request_documents_insert_policy" ON request_documents
  FOR INSERT
  WITH CHECK (workspace_id IN (SELECT id FROM workspaces WHERE id = workspace_id));

CREATE POLICY "request_documents_update_policy" ON request_documents
  FOR UPDATE
  USING (workspace_id IN (SELECT id FROM workspaces WHERE id = workspace_id));

CREATE POLICY "request_documents_delete_policy" ON request_documents
  FOR DELETE
  USING (workspace_id IN (SELECT id FROM workspaces WHERE id = workspace_id));

-- tour_files policies
ALTER TABLE tour_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tour_files_select_policy" ON tour_files
  FOR SELECT
  USING (workspace_id IN (SELECT id FROM workspaces WHERE id = workspace_id));

CREATE POLICY "tour_files_insert_policy" ON tour_files
  FOR INSERT
  WITH CHECK (workspace_id IN (SELECT id FROM workspaces WHERE id = workspace_id));

CREATE POLICY "tour_files_update_policy" ON tour_files
  FOR UPDATE
  USING (workspace_id IN (SELECT id FROM workspaces WHERE id = workspace_id));

CREATE POLICY "tour_files_delete_policy" ON tour_files
  FOR DELETE
  USING (workspace_id IN (SELECT id FROM workspaces WHERE id = workspace_id));

-- Auto-update triggers
DROP TRIGGER IF EXISTS tour_requests_updated_at_trigger ON tour_requests;
CREATE TRIGGER tour_requests_updated_at_trigger
  BEFORE UPDATE ON tour_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS request_documents_updated_at_trigger ON request_documents;
CREATE TRIGGER request_documents_updated_at_trigger
  BEFORE UPDATE ON request_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS tour_files_updated_at_trigger ON tour_files;
CREATE TRIGGER tour_files_updated_at_trigger
  BEFORE UPDATE ON tour_files
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
