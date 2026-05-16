-- =====================================================
-- 擴展旅伴聊天系統 - ERP 整合
-- 支援員工與旅伴溝通、團公告、自動開啟機制
-- =====================================================

-- 1. 擴展 traveler_conversations 表
-- 新增 ERP 團號連結、開啟狀態、自動開啟設定

-- 1.1 新增欄位
-- 注意：tours.id 是 text 類型
ALTER TABLE public.traveler_conversations
ADD COLUMN IF NOT EXISTS tour_id text REFERENCES public.tours(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_open boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS open_at timestamptz,
ADD COLUMN IF NOT EXISTS close_at timestamptz,
ADD COLUMN IF NOT EXISTS auto_open_before_days integer DEFAULT 3,
ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL;

-- 1.2 擴展 type 檢查約束
ALTER TABLE public.traveler_conversations
DROP CONSTRAINT IF EXISTS traveler_conversations_type_check;

ALTER TABLE public.traveler_conversations
ADD CONSTRAINT traveler_conversations_type_check
CHECK (type IN ('direct', 'trip', 'split', 'tour_announcement', 'tour_support'));

-- 1.3 新增索引
CREATE INDEX IF NOT EXISTS idx_conversations_tour ON public.traveler_conversations(tour_id)
WHERE tour_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_conversations_is_open ON public.traveler_conversations(is_open)
WHERE tour_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_conversations_workspace ON public.traveler_conversations(workspace_id)
WHERE workspace_id IS NOT NULL;

-- 1.4 欄位說明
COMMENT ON COLUMN public.traveler_conversations.tour_id IS 'ERP 團號 ID';
COMMENT ON COLUMN public.traveler_conversations.is_open IS '是否已開啟旅伴通訊';
COMMENT ON COLUMN public.traveler_conversations.open_at IS '開啟時間';
COMMENT ON COLUMN public.traveler_conversations.close_at IS '關閉時間';
COMMENT ON COLUMN public.traveler_conversations.auto_open_before_days IS '出發前幾天自動開啟，預設3天';
COMMENT ON COLUMN public.traveler_conversations.workspace_id IS 'ERP 工作空間 ID';

-- =====================================================
-- 2. 新增員工成員欄位（支援員工加入對話）
-- =====================================================

ALTER TABLE public.traveler_conversation_members
ADD COLUMN IF NOT EXISTS employee_id uuid REFERENCES public.employees(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS member_type text DEFAULT 'traveler'
  CHECK (member_type IN ('traveler', 'employee'));

-- 修改唯一約束：同一對話中，user_id 或 employee_id 只能出現一次
-- 先刪除舊約束
ALTER TABLE public.traveler_conversation_members
DROP CONSTRAINT IF EXISTS traveler_conversation_members_conversation_id_user_id_key;

-- 新增複合唯一約束
CREATE UNIQUE INDEX IF NOT EXISTS idx_conversation_members_unique
ON public.traveler_conversation_members(conversation_id, COALESCE(user_id, '00000000-0000-0000-0000-000000000000'), COALESCE(employee_id, '00000000-0000-0000-0000-000000000000'));

COMMENT ON COLUMN public.traveler_conversation_members.employee_id IS 'ERP 員工 ID（如果是員工）';
COMMENT ON COLUMN public.traveler_conversation_members.member_type IS '成員類型：traveler 或 employee';

-- =====================================================
-- 3. 建團時自動建立對話的觸發器
-- =====================================================

CREATE OR REPLACE FUNCTION create_tour_conversations()
RETURNS TRIGGER AS $$
DECLARE
  announcement_id uuid;
  support_id uuid;
BEGIN
  -- 建立團公告對話
  INSERT INTO public.traveler_conversations (
    type,
    name,
    tour_id,
    workspace_id,
    is_open,
    auto_open_before_days,
    created_by
  ) VALUES (
    'tour_announcement',
    NEW.name || ' - 公告',
    NEW.id,
    NEW.workspace_id,
    false,
    3,
    NULL
  ) RETURNING id INTO announcement_id;

  -- 建立團客服對話
  INSERT INTO public.traveler_conversations (
    type,
    name,
    tour_id,
    workspace_id,
    is_open,
    auto_open_before_days,
    created_by
  ) VALUES (
    'tour_support',
    NEW.name || ' - 客服',
    NEW.id,
    NEW.workspace_id,
    false,
    3,
    NULL
  ) RETURNING id INTO support_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 刪除舊觸發器（如果存在）
DROP TRIGGER IF EXISTS trigger_create_tour_conversations ON public.tours;

-- 建立觸發器
CREATE TRIGGER trigger_create_tour_conversations
AFTER INSERT ON public.tours
FOR EACH ROW
EXECUTE FUNCTION create_tour_conversations();

-- =====================================================
-- 4. 訂單確認時將旅伴加入對話的觸發器
-- =====================================================

CREATE OR REPLACE FUNCTION add_travelers_to_tour_conversation()
RETURNS TRIGGER AS $$
DECLARE
  conv_record RECORD;
  member_record RECORD;
  traveler_user_id uuid;
BEGIN
  -- 只在訂單狀態變為已確認時處理
  IF NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status != 'confirmed') THEN

    -- 找到該團的公告對話
    FOR conv_record IN
      SELECT id FROM public.traveler_conversations
      WHERE tour_id = NEW.tour_id
      AND type = 'tour_announcement'
    LOOP
      -- 找到訂單中所有成員
      FOR member_record IN
        SELECT om.id, om.customer_id, c.id_number
        FROM public.order_members om
        LEFT JOIN public.customers c ON c.id = om.customer_id
        WHERE om.order_id = NEW.id
      LOOP
        -- 透過身分證找到旅伴的 auth user
        SELECT p.id INTO traveler_user_id
        FROM public.profiles p
        WHERE p.id_number = member_record.id_number
        LIMIT 1;

        -- 如果找到旅伴帳號，加入對話
        IF traveler_user_id IS NOT NULL THEN
          INSERT INTO public.traveler_conversation_members (
            conversation_id,
            user_id,
            member_type,
            role
          ) VALUES (
            conv_record.id,
            traveler_user_id,
            'traveler',
            'member'
          ) ON CONFLICT DO NOTHING;
        END IF;
      END LOOP;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 刪除舊觸發器（如果存在）
DROP TRIGGER IF EXISTS trigger_add_travelers_to_conversation ON public.orders;

-- 建立觸發器
CREATE TRIGGER trigger_add_travelers_to_conversation
AFTER UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION add_travelers_to_tour_conversation();

-- =====================================================
-- 5. 自動開啟對話的函數（由定時任務呼叫）
-- =====================================================

CREATE OR REPLACE FUNCTION auto_open_tour_conversations()
RETURNS integer AS $$
DECLARE
  opened_count integer := 0;
  conv_record RECORD;
  tour_record RECORD;
BEGIN
  -- 找到需要開啟的對話
  FOR conv_record IN
    SELECT c.id, c.tour_id, c.auto_open_before_days, t.departure_date, t.name as tour_name
    FROM public.traveler_conversations c
    JOIN public.tours t ON t.id = c.tour_id
    WHERE c.tour_id IS NOT NULL
    AND c.is_open = false
    AND c.auto_open_before_days > 0
    AND t.departure_date IS NOT NULL
    AND t.departure_date - (c.auto_open_before_days || ' days')::interval <= CURRENT_DATE
    AND t.departure_date >= CURRENT_DATE  -- 尚未出發
  LOOP
    -- 開啟對話
    UPDATE public.traveler_conversations
    SET is_open = true, open_at = now()
    WHERE id = conv_record.id;

    -- 發送系統歡迎訊息
    INSERT INTO public.traveler_messages (
      conversation_id,
      sender_id,
      type,
      content,
      metadata
    ) VALUES (
      conv_record.id,
      NULL,  -- 系統訊息沒有 sender
      'system',
      '歡迎加入「' || conv_record.tour_name || '」！如有任何問題，請隨時聯繫我們。',
      jsonb_build_object('action', 'conversation_opened', 'tour_id', conv_record.tour_id)
    );

    opened_count := opened_count + 1;
  END LOOP;

  RETURN opened_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION auto_open_tour_conversations() IS '自動開啟出發前 N 天的團對話，返回開啟數量';

-- =====================================================
-- 6. 手動開啟/關閉對話的函數
-- =====================================================

CREATE OR REPLACE FUNCTION toggle_tour_conversation(
  p_tour_id text,
  p_is_open boolean,
  p_send_welcome boolean DEFAULT true
)
RETURNS void AS $$
DECLARE
  conv_record RECORD;
  tour_name text;
BEGIN
  -- 取得團名
  SELECT name INTO tour_name FROM public.tours WHERE id = p_tour_id;

  -- 更新所有該團的對話
  FOR conv_record IN
    SELECT id, type FROM public.traveler_conversations
    WHERE tour_id = p_tour_id
  LOOP
    UPDATE public.traveler_conversations
    SET
      is_open = p_is_open,
      open_at = CASE WHEN p_is_open THEN COALESCE(open_at, now()) ELSE open_at END,
      close_at = CASE WHEN NOT p_is_open THEN now() ELSE NULL END
    WHERE id = conv_record.id;

    -- 開啟時發送歡迎訊息
    IF p_is_open AND p_send_welcome AND conv_record.type = 'tour_announcement' THEN
      INSERT INTO public.traveler_messages (
        conversation_id,
        sender_id,
        type,
        content,
        metadata
      ) VALUES (
        conv_record.id,
        NULL,
        'system',
        '歡迎加入「' || tour_name || '」！如有任何問題，請隨時聯繫我們。',
        jsonb_build_object('action', 'conversation_opened', 'tour_id', p_tour_id)
      );
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION toggle_tour_conversation(text, boolean, boolean) IS '手動開啟或關閉團對話';

-- =====================================================
-- 7. 員工加入對話的函數
-- =====================================================

CREATE OR REPLACE FUNCTION add_employee_to_tour_conversation(
  p_tour_id text,
  p_employee_id uuid,
  p_role text DEFAULT 'member'
)
RETURNS void AS $$
DECLARE
  conv_record RECORD;
BEGIN
  -- 將員工加入該團的所有對話
  FOR conv_record IN
    SELECT id FROM public.traveler_conversations
    WHERE tour_id = p_tour_id
  LOOP
    INSERT INTO public.traveler_conversation_members (
      conversation_id,
      employee_id,
      member_type,
      role
    ) VALUES (
      conv_record.id,
      p_employee_id,
      'employee',
      p_role
    ) ON CONFLICT DO NOTHING;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 8. 更新 RLS 政策 - 允許員工參與
-- =====================================================

-- 8.1 conversations: 員工可以看到自己工作空間的團對話
DROP POLICY IF EXISTS "traveler_conversations_select" ON public.traveler_conversations;
DROP POLICY IF EXISTS "traveler_conversations_select" ON public.traveler_conversations;
CREATE POLICY "traveler_conversations_select" ON public.traveler_conversations
FOR SELECT USING (
  -- 旅伴：是成員且對話已開啟
  (
    EXISTS (
      SELECT 1 FROM public.traveler_conversation_members
      WHERE conversation_id = traveler_conversations.id
      AND user_id = auth.uid()
      AND left_at IS NULL
    )
    AND (is_open = true OR tour_id IS NULL)  -- 非團對話不需要 is_open
  )
  OR
  -- 員工：是成員
  EXISTS (
    SELECT 1 FROM public.traveler_conversation_members tcm
    JOIN public.employees e ON e.id = tcm.employee_id
    WHERE tcm.conversation_id = traveler_conversations.id
    AND e.supabase_user_id = auth.uid()
    AND tcm.left_at IS NULL
  )
  OR
  -- 員工：同工作空間的團對話
  EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.supabase_user_id = auth.uid()
    AND e.workspace_id = traveler_conversations.workspace_id
  )
);

-- 8.2 conversation_members: 員工可以看到
DROP POLICY IF EXISTS "traveler_conversation_members_select" ON public.traveler_conversation_members;
DROP POLICY IF EXISTS "traveler_conversation_members_select" ON public.traveler_conversation_members;
CREATE POLICY "traveler_conversation_members_select" ON public.traveler_conversation_members
FOR SELECT USING (
  -- 旅伴：同對話的成員
  EXISTS (
    SELECT 1 FROM public.traveler_conversation_members m
    WHERE m.conversation_id = traveler_conversation_members.conversation_id
    AND m.user_id = auth.uid()
    AND m.left_at IS NULL
  )
  OR
  -- 員工：是成員
  EXISTS (
    SELECT 1 FROM public.traveler_conversation_members tcm
    JOIN public.employees e ON e.id = tcm.employee_id
    WHERE tcm.conversation_id = traveler_conversation_members.conversation_id
    AND e.supabase_user_id = auth.uid()
    AND tcm.left_at IS NULL
  )
  OR
  -- 員工：同工作空間
  EXISTS (
    SELECT 1 FROM public.traveler_conversations c
    JOIN public.employees e ON e.workspace_id = c.workspace_id
    WHERE c.id = traveler_conversation_members.conversation_id
    AND e.supabase_user_id = auth.uid()
  )
);

-- 8.3 messages: 員工可以看到和發送
DROP POLICY IF EXISTS "traveler_messages_select" ON public.traveler_messages;
DROP POLICY IF EXISTS "traveler_messages_select" ON public.traveler_messages;
CREATE POLICY "traveler_messages_select" ON public.traveler_messages
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.traveler_conversation_members m
    WHERE m.conversation_id = traveler_messages.conversation_id
    AND (m.user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = m.employee_id AND e.supabase_user_id = auth.uid()
    ))
    AND m.left_at IS NULL
  )
  OR
  -- 員工：同工作空間的團對話
  EXISTS (
    SELECT 1 FROM public.traveler_conversations c
    JOIN public.employees e ON e.workspace_id = c.workspace_id
    WHERE c.id = traveler_messages.conversation_id
    AND e.supabase_user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "traveler_messages_insert" ON public.traveler_messages;
DROP POLICY IF EXISTS "traveler_messages_insert" ON public.traveler_messages;
CREATE POLICY "traveler_messages_insert" ON public.traveler_messages
FOR INSERT WITH CHECK (
  -- 旅伴發送
  (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.traveler_conversation_members
      WHERE conversation_id = traveler_messages.conversation_id
      AND user_id = auth.uid()
      AND left_at IS NULL
    )
  )
  OR
  -- 員工發送
  EXISTS (
    SELECT 1 FROM public.traveler_conversations c
    JOIN public.employees e ON e.workspace_id = c.workspace_id
    WHERE c.id = traveler_messages.conversation_id
    AND e.supabase_user_id = auth.uid()
  )
  OR
  -- 系統訊息（sender_id = NULL）
  sender_id IS NULL
);

-- =====================================================
-- 9. 建立取得團對話的函數
-- =====================================================

CREATE OR REPLACE FUNCTION get_tour_conversations(p_workspace_id uuid)
RETURNS TABLE (
  conversation_id uuid,
  conversation_type text,
  tour_id uuid,
  tour_code text,
  tour_name text,
  departure_date date,
  is_open boolean,
  open_at timestamptz,
  unread_count bigint,
  last_message_at timestamptz,
  last_message_preview text,
  member_count bigint,
  traveler_count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id as conversation_id,
    c.type as conversation_type,
    c.tour_id,
    t.tour_code,
    t.name as tour_name,
    t.departure_date,
    c.is_open,
    c.open_at,
    (
      SELECT COUNT(*) FROM public.traveler_messages m
      WHERE m.conversation_id = c.id
      AND m.created_at > COALESCE(
        (SELECT last_read_at FROM public.traveler_conversation_members
         WHERE conversation_id = c.id AND employee_id = (
           SELECT id FROM public.employees WHERE supabase_user_id = auth.uid() LIMIT 1
         )),
        '1970-01-01'::timestamptz
      )
    ) as unread_count,
    c.last_message_at,
    c.last_message_preview,
    (SELECT COUNT(*) FROM public.traveler_conversation_members WHERE conversation_id = c.id AND left_at IS NULL) as member_count,
    (SELECT COUNT(*) FROM public.traveler_conversation_members WHERE conversation_id = c.id AND member_type = 'traveler' AND left_at IS NULL) as traveler_count
  FROM public.traveler_conversations c
  JOIN public.tours t ON t.id = c.tour_id
  WHERE c.workspace_id = p_workspace_id
  AND c.tour_id IS NOT NULL
  ORDER BY t.departure_date DESC, c.type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 10. 員工發送訊息的函數
-- =====================================================

CREATE OR REPLACE FUNCTION send_tour_message(
  p_conversation_id uuid,
  p_content text,
  p_type text DEFAULT 'text',
  p_attachments jsonb DEFAULT '[]'::jsonb
)
RETURNS uuid AS $$
DECLARE
  new_message_id uuid;
  employee_record RECORD;
BEGIN
  -- 取得員工資訊
  SELECT e.id, e.supabase_user_id INTO employee_record
  FROM public.employees e
  WHERE e.supabase_user_id = auth.uid()
  LIMIT 1;

  IF employee_record.id IS NULL THEN
    RAISE EXCEPTION 'Employee not found';
  END IF;

  -- 確保員工是成員
  INSERT INTO public.traveler_conversation_members (
    conversation_id, employee_id, member_type, role
  ) VALUES (
    p_conversation_id, employee_record.id, 'employee', 'admin'
  ) ON CONFLICT DO NOTHING;

  -- 發送訊息
  INSERT INTO public.traveler_messages (
    conversation_id,
    sender_id,
    type,
    content,
    attachments,
    metadata
  ) VALUES (
    p_conversation_id,
    employee_record.supabase_user_id,
    p_type,
    p_content,
    p_attachments,
    jsonb_build_object('sender_type', 'employee', 'employee_id', employee_record.id)
  ) RETURNING id INTO new_message_id;

  RETURN new_message_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 完成
-- =====================================================

COMMENT ON TABLE public.traveler_conversations IS '旅客對話/聊天室（含 ERP 團對話）';
