-- =====================================================
-- 旅客聊天系統 Migration
-- 用於 Online App 的即時通訊功能
-- =====================================================

-- 1. 對話表 (conversations) - 支援私訊和群組聊天
CREATE TABLE IF NOT EXISTS public.traveler_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 類型: direct(私訊), trip(行程群組), split(分帳群組)
  type text NOT NULL DEFAULT 'direct' CHECK (type IN ('direct', 'trip', 'split')),

  -- 群組名稱 (私訊為 null)
  name text,

  -- 群組頭像
  avatar_url text,

  -- 關聯的行程或分帳群組 (如果是群組聊天)
  trip_id uuid REFERENCES public.traveler_trips(id) ON DELETE SET NULL,
  split_group_id uuid REFERENCES public.traveler_split_groups(id) ON DELETE SET NULL,

  -- 建立者
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  -- 最後一則訊息 (用於列表排序和預覽)
  last_message_id uuid,
  last_message_at timestamptz,
  last_message_preview text,

  -- 時間戳
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. 對話成員表 (conversation_members)
CREATE TABLE IF NOT EXISTS public.traveler_conversation_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.traveler_conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 角色: owner(群主), admin(管理員), member(成員)
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),

  -- 已讀到哪一則訊息
  last_read_message_id uuid,
  last_read_at timestamptz,

  -- 是否靜音
  is_muted boolean DEFAULT false,

  -- 是否已離開 (軟刪除)
  left_at timestamptz,

  -- 加入時間
  joined_at timestamptz DEFAULT now(),

  UNIQUE(conversation_id, user_id)
);

-- 3. 訊息表 (messages)
CREATE TABLE IF NOT EXISTS public.traveler_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.traveler_conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,

  -- 訊息內容
  content text,

  -- 訊息類型: text, image, file, system
  type text NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'image', 'file', 'system', 'location')),

  -- 附件 (圖片、檔案等)
  attachments jsonb DEFAULT '[]'::jsonb,

  -- 回覆哪則訊息
  reply_to_id uuid REFERENCES public.traveler_messages(id) ON DELETE SET NULL,

  -- 表情回應
  reactions jsonb DEFAULT '{}'::jsonb,

  -- 系統訊息的元資料 (例如: 誰加入了群組)
  metadata jsonb,

  -- 是否已編輯
  edited_at timestamptz,

  -- 是否已刪除 (軟刪除)
  deleted_at timestamptz,

  -- 時間戳
  created_at timestamptz DEFAULT now()
);

-- 4. 更新 last_message 外鍵 (必須在 messages 表建立後才能加)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_last_message'
  ) THEN
    ALTER TABLE public.traveler_conversations
    ADD CONSTRAINT fk_last_message
    FOREIGN KEY (last_message_id) REFERENCES public.traveler_messages(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 5. 索引
CREATE INDEX IF NOT EXISTS idx_conversations_type ON public.traveler_conversations(type);
CREATE INDEX IF NOT EXISTS idx_conversations_trip ON public.traveler_conversations(trip_id) WHERE trip_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_conversations_split ON public.traveler_conversations(split_group_id) WHERE split_group_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON public.traveler_conversations(last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversation_members_user ON public.traveler_conversation_members(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_members_conversation ON public.traveler_conversation_members(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_members_active ON public.traveler_conversation_members(conversation_id, user_id) WHERE left_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.traveler_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.traveler_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON public.traveler_messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_reply ON public.traveler_messages(reply_to_id) WHERE reply_to_id IS NOT NULL;

-- 6. 更新 conversations 的 last_message 觸發器
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.traveler_conversations
  SET
    last_message_id = NEW.id,
    last_message_at = NEW.created_at,
    last_message_preview = CASE
      WHEN NEW.type = 'text' THEN LEFT(NEW.content, 100)
      WHEN NEW.type = 'image' THEN '[圖片]'
      WHEN NEW.type = 'file' THEN '[檔案]'
      WHEN NEW.type = 'location' THEN '[位置]'
      WHEN NEW.type = 'system' THEN NEW.content
      ELSE NULL
    END,
    updated_at = now()
  WHERE id = NEW.conversation_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_conversation_last_message ON public.traveler_messages;
CREATE TRIGGER trigger_update_conversation_last_message
AFTER INSERT ON public.traveler_messages
FOR EACH ROW
WHEN (NEW.deleted_at IS NULL)
EXECUTE FUNCTION update_conversation_last_message();

-- 7. RLS 政策
ALTER TABLE public.traveler_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.traveler_conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.traveler_messages ENABLE ROW LEVEL SECURITY;

-- conversations: 只有成員能看
DROP POLICY IF EXISTS "traveler_conversations_select" ON public.traveler_conversations;
DROP POLICY IF EXISTS "traveler_conversations_select" ON public.traveler_conversations;
CREATE POLICY "traveler_conversations_select" ON public.traveler_conversations
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.traveler_conversation_members
    WHERE conversation_id = traveler_conversations.id
    AND user_id = auth.uid()
    AND left_at IS NULL
  )
);

DROP POLICY IF EXISTS "traveler_conversations_insert" ON public.traveler_conversations;
DROP POLICY IF EXISTS "traveler_conversations_insert" ON public.traveler_conversations;
CREATE POLICY "traveler_conversations_insert" ON public.traveler_conversations
FOR INSERT WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "traveler_conversations_update" ON public.traveler_conversations;
DROP POLICY IF EXISTS "traveler_conversations_update" ON public.traveler_conversations;
CREATE POLICY "traveler_conversations_update" ON public.traveler_conversations
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.traveler_conversation_members
    WHERE conversation_id = traveler_conversations.id
    AND user_id = auth.uid()
    AND role IN ('owner', 'admin')
    AND left_at IS NULL
  )
);

-- conversation_members: 成員能看自己所在的對話成員
DROP POLICY IF EXISTS "traveler_conversation_members_select" ON public.traveler_conversation_members;
DROP POLICY IF EXISTS "traveler_conversation_members_select" ON public.traveler_conversation_members;
CREATE POLICY "traveler_conversation_members_select" ON public.traveler_conversation_members
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.traveler_conversation_members m
    WHERE m.conversation_id = traveler_conversation_members.conversation_id
    AND m.user_id = auth.uid()
    AND m.left_at IS NULL
  )
);

DROP POLICY IF EXISTS "traveler_conversation_members_insert" ON public.traveler_conversation_members;
DROP POLICY IF EXISTS "traveler_conversation_members_insert" ON public.traveler_conversation_members;
CREATE POLICY "traveler_conversation_members_insert" ON public.traveler_conversation_members
FOR INSERT WITH CHECK (
  -- 自己加入或群主/管理員邀請
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.traveler_conversation_members
    WHERE conversation_id = traveler_conversation_members.conversation_id
    AND user_id = auth.uid()
    AND role IN ('owner', 'admin')
    AND left_at IS NULL
  )
);

DROP POLICY IF EXISTS "traveler_conversation_members_update" ON public.traveler_conversation_members;
DROP POLICY IF EXISTS "traveler_conversation_members_update" ON public.traveler_conversation_members;
CREATE POLICY "traveler_conversation_members_update" ON public.traveler_conversation_members
FOR UPDATE USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.traveler_conversation_members
    WHERE conversation_id = traveler_conversation_members.conversation_id
    AND user_id = auth.uid()
    AND role IN ('owner', 'admin')
    AND left_at IS NULL
  )
);

-- messages: 成員能看對話內的訊息
DROP POLICY IF EXISTS "traveler_messages_select" ON public.traveler_messages;
DROP POLICY IF EXISTS "traveler_messages_select" ON public.traveler_messages;
CREATE POLICY "traveler_messages_select" ON public.traveler_messages
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.traveler_conversation_members
    WHERE conversation_id = traveler_messages.conversation_id
    AND user_id = auth.uid()
    AND left_at IS NULL
  )
);

DROP POLICY IF EXISTS "traveler_messages_insert" ON public.traveler_messages;
DROP POLICY IF EXISTS "traveler_messages_insert" ON public.traveler_messages;
CREATE POLICY "traveler_messages_insert" ON public.traveler_messages
FOR INSERT WITH CHECK (
  sender_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.traveler_conversation_members
    WHERE conversation_id = traveler_messages.conversation_id
    AND user_id = auth.uid()
    AND left_at IS NULL
  )
);

DROP POLICY IF EXISTS "traveler_messages_update" ON public.traveler_messages;
DROP POLICY IF EXISTS "traveler_messages_update" ON public.traveler_messages;
CREATE POLICY "traveler_messages_update" ON public.traveler_messages
FOR UPDATE USING (sender_id = auth.uid());

DROP POLICY IF EXISTS "traveler_messages_delete" ON public.traveler_messages;
DROP POLICY IF EXISTS "traveler_messages_delete" ON public.traveler_messages;
CREATE POLICY "traveler_messages_delete" ON public.traveler_messages
FOR DELETE USING (sender_id = auth.uid());

-- 8. 建立或取得私訊對話的函數
CREATE OR REPLACE FUNCTION get_or_create_direct_conversation(other_user_id uuid)
RETURNS uuid AS $$
DECLARE
  conversation_id uuid;
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();

  -- 檢查是否已有對話
  SELECT c.id INTO conversation_id
  FROM public.traveler_conversations c
  JOIN public.traveler_conversation_members m1 ON m1.conversation_id = c.id AND m1.user_id = current_user_id AND m1.left_at IS NULL
  JOIN public.traveler_conversation_members m2 ON m2.conversation_id = c.id AND m2.user_id = other_user_id AND m2.left_at IS NULL
  WHERE c.type = 'direct'
  LIMIT 1;

  -- 如果沒有則建立新對話
  IF conversation_id IS NULL THEN
    INSERT INTO public.traveler_conversations (type, created_by)
    VALUES ('direct', current_user_id)
    RETURNING id INTO conversation_id;

    -- 加入兩個成員
    INSERT INTO public.traveler_conversation_members (conversation_id, user_id, role)
    VALUES
      (conversation_id, current_user_id, 'owner'),
      (conversation_id, other_user_id, 'member');
  END IF;

  RETURN conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. 計算未讀訊息數的函數
CREATE OR REPLACE FUNCTION get_unread_count(p_conversation_id uuid)
RETURNS integer AS $$
DECLARE
  unread_count integer;
  last_read_id uuid;
BEGIN
  -- 取得使用者在該對話的最後已讀訊息
  SELECT last_read_message_id INTO last_read_id
  FROM public.traveler_conversation_members
  WHERE conversation_id = p_conversation_id AND user_id = auth.uid();

  IF last_read_id IS NULL THEN
    -- 從未讀過，計算所有訊息
    SELECT COUNT(*) INTO unread_count
    FROM public.traveler_messages
    WHERE conversation_id = p_conversation_id
    AND sender_id != auth.uid()
    AND deleted_at IS NULL;
  ELSE
    -- 計算比已讀訊息更新的訊息
    SELECT COUNT(*) INTO unread_count
    FROM public.traveler_messages m
    JOIN public.traveler_messages lr ON lr.id = last_read_id
    WHERE m.conversation_id = p_conversation_id
    AND m.created_at > lr.created_at
    AND m.sender_id != auth.uid()
    AND m.deleted_at IS NULL;
  END IF;

  RETURN unread_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. 標記已讀的函數
CREATE OR REPLACE FUNCTION mark_conversation_read(p_conversation_id uuid)
RETURNS void AS $$
DECLARE
  latest_message_id uuid;
BEGIN
  -- 取得最新訊息 ID
  SELECT id INTO latest_message_id
  FROM public.traveler_messages
  WHERE conversation_id = p_conversation_id
  ORDER BY created_at DESC
  LIMIT 1;

  -- 更新已讀狀態
  UPDATE public.traveler_conversation_members
  SET
    last_read_message_id = latest_message_id,
    last_read_at = now()
  WHERE conversation_id = p_conversation_id
  AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. 啟用 Realtime (如果尚未加入)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'traveler_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.traveler_messages;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'traveler_conversation_members'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.traveler_conversation_members;
  END IF;
END $$;

-- 完成
COMMENT ON TABLE public.traveler_conversations IS '旅客對話/聊天室';
COMMENT ON TABLE public.traveler_conversation_members IS '對話成員';
COMMENT ON TABLE public.traveler_messages IS '聊天訊息';
