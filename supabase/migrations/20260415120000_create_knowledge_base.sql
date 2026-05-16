-- Create knowledge_base table
-- 知識庫管理系統

CREATE TABLE IF NOT EXISTS knowledge_base (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid REFERENCES workspaces(id),
  category text NOT NULL DEFAULT 'faq', -- 'faq', 'qa', 'custom'
  question text, -- 問題/標題
  answer text, -- 回答/內容
  keywords text[], -- 搜尋關鍵字
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their workspace's knowledge base
CREATE POLICY "Users can view knowledge base in their workspace"
  ON knowledge_base FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM profiles WHERE id = auth.uid()
    )
    OR workspace_id IS NULL
  );

-- RLS Policy: Users can only insert knowledge base for their workspace
CREATE POLICY "Users can insert knowledge base in their workspace"
  ON knowledge_base FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM profiles WHERE id = auth.uid()
    )
  );

-- RLS Policy: Users can only update knowledge base in their workspace
CREATE POLICY "Users can update knowledge base in their workspace"
  ON knowledge_base FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM profiles WHERE id = auth.uid()
    )
  );

-- RLS Policy: Users can only delete knowledge base in their workspace
CREATE POLICY "Users can delete knowledge base in their workspace"
  ON knowledge_base FOR DELETE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Create index for faster queries
CREATE INDEX idx_knowledge_base_workspace ON knowledge_base(workspace_id);
CREATE INDEX idx_knowledge_base_category ON knowledge_base(category);