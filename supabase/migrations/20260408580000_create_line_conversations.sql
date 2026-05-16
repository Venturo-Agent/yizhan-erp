-- ============================================
-- LINE 對話紀錄系統
-- ============================================

-- 1. line_conversations - 對話總覽表
CREATE TABLE IF NOT EXISTS line_conversations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid REFERENCES workspaces(id),
  conversation_type text NOT NULL, -- 'user' 或 'group'
  target_id text NOT NULL, -- LINE user_id 或 group_id
  target_name text, -- 用戶顯示名稱或群組名稱
  last_message_at timestamptz,
  last_message_preview text,
  unread_count integer DEFAULT 0,
  is_archived boolean DEFAULT false,
  tags text[], -- 標籤陣列
  note text, -- 備註
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- 唯一約束：每個工作區 + 目標只能有一個對話
  UNIQUE(workspace_id, conversation_type, target_id)
);

-- 2. line_messages - 訊息內容表
CREATE TABLE IF NOT EXISTS line_messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid REFERENCES workspaces(id),
  conversation_id uuid REFERENCES line_conversations(id) ON DELETE CASCADE,
  message_id text, -- LINE 訊息 ID
  message_type text NOT NULL, -- 'text', 'image', 'sticker', 'file', 'location', 'audio', 'video'
  sender_type text NOT NULL, -- 'user' 或 'bot'
  sender_id text, -- 發送者 ID（LINE user_id 或 'bot'）
  content text, -- 文字內容
  media_url text, -- 媒體檔案 URL
  reply_token text, -- LINE reply token
  is_read boolean DEFAULT false,
  is_ai_reply boolean DEFAULT false, -- 是否為 AI 回覆
  ai_model text, -- AI 模型名稱
  created_at timestamptz DEFAULT now()
);

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_line_messages_conversation ON line_messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_line_messages_workspace ON line_messages(workspace_id);
CREATE INDEX IF NOT EXISTS idx_line_messages_created ON line_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_line_conversations_workspace ON line_conversations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_line_conversations_updated ON line_conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_line_conversations_target ON line_conversations(target_id);

-- RLS 政策
ALTER TABLE line_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE line_messages ENABLE ROW LEVEL SECURITY;

-- line_conversations RLS
CREATE POLICY "line_conversations_select" ON line_conversations FOR SELECT USING (
  workspace_id = get_current_user_workspace() OR is_super_admin()
);

CREATE POLICY "line_conversations_insert" ON line_conversations FOR INSERT WITH CHECK (
  workspace_id = get_current_user_workspace() OR is_super_admin()
);

CREATE POLICY "line_conversations_update" ON line_conversations FOR UPDATE USING (
  workspace_id = get_current_user_workspace() OR is_super_admin()
);

-- line_messages RLS
CREATE POLICY "line_messages_select" ON line_messages FOR SELECT USING (
  workspace_id = get_current_user_workspace() OR is_super_admin()
);

CREATE POLICY "line_messages_insert" ON line_messages FOR INSERT WITH CHECK (
  workspace_id = get_current_user_workspace() OR is_super_admin()
);

-- 更新觸發器：當有新訊息時，更新對話的 last_message_at
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE line_conversations
  SET 
    last_message_at = NEW.created_at,
    last_message_preview = CASE 
      WHEN LENGTH(NEW.content) > 50 THEN LEFT(NEW.content, 50) || '...'
      ELSE NEW.content
    END,
    updated_at = NOW(),
    unread_count = CASE 
      WHEN NEW.sender_type = 'user' THEN unread_count + 1
      ELSE unread_count
    END
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_conversation_timestamp ON line_messages;
CREATE TRIGGER trigger_update_conversation_timestamp
AFTER INSERT ON line_messages
FOR EACH ROW
EXECUTE FUNCTION update_conversation_timestamp();

-- 建立或更新對話的函數
CREATE OR REPLACE FUNCTION ensure_conversation_exists(
  p_workspace_id uuid,
  p_conversation_type text,
  p_target_id text,
  p_target_name text DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_conversation_id uuid;
BEGIN
  -- 嘗試找到現有對話
  SELECT id INTO v_conversation_id
  FROM line_conversations
  WHERE workspace_id = p_workspace_id
    AND conversation_type = p_conversation_type
    AND target_id = p_target_id;
  
  -- 如果不存在，建立新對話
  IF v_conversation_id IS NULL THEN
    INSERT INTO line_conversations (
      workspace_id,
      conversation_type,
      target_id,
      target_name,
      created_at,
      updated_at
    ) VALUES (
      p_workspace_id,
      p_conversation_type,
      p_target_id,
      p_target_name,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_conversation_id;
  END IF;
  
  RETURN v_conversation_id;
END;
$$ LANGUAGE plpgsql;