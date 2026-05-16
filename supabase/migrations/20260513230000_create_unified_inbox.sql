-- =============================================================================
-- M7: Unified Inbox schema（給 FB / IG 訊息用、LINE 暫不動）
-- =============================================================================
--
-- Why: M5/M6 FB+IG webhook 要寫訊息 DB、新通路一開始就走統一表、不再用 LINE 那種
--      channel-specific message 表結構。LINE 既有 line_conversation_messages 保留、
--      Phase 2 backfill 進新表時整合。
--
-- 表設計（仿 Chatwoot polymorphic inbox + ContactInbox + 訊息去重）:
--   - inbox_conversations: 一個對話 thread（per [channel_type, external_user_id]）
--   - inbox_messages: 訊息明細（direction / sender_type / 去重）
--
-- 通路範圍（this migration）:
--   - facebook: FB Messenger PSID 識別對方
--   - instagram: IG IGSID 識別對方
--   - line: 預留欄位、未來 backfill 進來
-- =============================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. inbox_conversations: 對話 thread
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.inbox_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,

  -- 通路類型 + 對方識別（webhook 反查用）
  channel_type TEXT NOT NULL CHECK (channel_type IN ('line', 'facebook', 'instagram')),
  external_user_id TEXT NOT NULL,  -- LINE userId / FB PSID / IG IGSID

  -- 對方資料（webhook profile fetch 寫進來、best effort）
  display_name TEXT,
  picture_url TEXT,

  -- 綁定客戶（手動或自動、可空。customers.id 是 text 不是 uuid）
  customer_id TEXT REFERENCES public.customers(id) ON DELETE SET NULL,

  -- 最新訊息預覽（給列表頁排序 + 預覽用）
  last_message_at TIMESTAMPTZ,
  last_message_preview TEXT,
  last_message_direction TEXT CHECK (last_message_direction IN ('inbound', 'outbound')),
  unread_count INT NOT NULL DEFAULT 0,

  -- 對話狀態
  is_archived BOOLEAN NOT NULL DEFAULT false,
  bot_paused BOOLEAN NOT NULL DEFAULT false,  -- agent 接管時 bot 停回覆
  bot_paused_until TIMESTAMPTZ,                -- 暫停過期時間

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT inbox_conv_unique UNIQUE (workspace_id, channel_type, external_user_id)
);

CREATE INDEX IF NOT EXISTS idx_inbox_conv_workspace_active
  ON public.inbox_conversations(workspace_id, last_message_at DESC)
  WHERE is_archived = false;

CREATE INDEX IF NOT EXISTS idx_inbox_conv_workspace_channel
  ON public.inbox_conversations(workspace_id, channel_type, last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_inbox_conv_external_user
  ON public.inbox_conversations(channel_type, external_user_id);

COMMENT ON TABLE public.inbox_conversations IS
  '統一對話 thread。每對 (channel_type, external_user_id) 一個、跨通路 polymorphic';
COMMENT ON COLUMN public.inbox_conversations.external_user_id IS
  'LINE userId / FB PSID / IG IGSID。webhook 收訊息後反查或建這個 row';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. inbox_messages: 訊息明細
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.inbox_messages (
  id BIGSERIAL PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.inbox_conversations(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,

  -- 訊息方向 / 發送者
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  sender_type TEXT NOT NULL CHECK (sender_type IN ('contact', 'agent', 'ai_agent', 'system')),
  sender_employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,

  -- 訊息內容
  message_type TEXT NOT NULL DEFAULT 'text',
  content TEXT,
  raw_event JSONB,

  -- 去重（webhook 重送防護）
  -- channel 原生 message ID（FB: message.mid、IG: message.mid、LINE: message.id）
  source_id TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT inbox_msg_unique_source UNIQUE (conversation_id, source_id) DEFERRABLE INITIALLY DEFERRED
);

CREATE INDEX IF NOT EXISTS idx_inbox_msg_conversation_time
  ON public.inbox_messages(conversation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_inbox_msg_workspace_time
  ON public.inbox_messages(workspace_id, created_at DESC);

COMMENT ON TABLE public.inbox_messages IS
  '統一訊息明細表。conversation_id ref inbox_conversations、polymorphic 跨通路';
COMMENT ON COLUMN public.inbox_messages.source_id IS
  'channel 原生 message ID（FB/IG message.mid、LINE message.id）、UNIQUE 防 webhook 重送';

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. updated_at trigger
-- ─────────────────────────────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS set_inbox_conversations_updated_at ON public.inbox_conversations;
CREATE TRIGGER set_inbox_conversations_updated_at
  BEFORE UPDATE ON public.inbox_conversations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. RLS
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.inbox_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inbox_messages ENABLE ROW LEVEL SECURITY;

-- inbox_conversations: select 自己 workspace、write 守 channel-specific capability
DROP POLICY IF EXISTS inbox_conv_select_own ON public.inbox_conversations;
CREATE POLICY inbox_conv_select_own
  ON public.inbox_conversations FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.employees WHERE user_id = auth.uid()
    )
  );

-- agent 操作（綁客戶 / 暫停 bot / 封存）守 *.write capability（channel-aware）
DROP POLICY IF EXISTS inbox_conv_update_own ON public.inbox_conversations;
CREATE POLICY inbox_conv_update_own
  ON public.inbox_conversations FOR UPDATE
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.employees WHERE user_id = auth.uid()
    )
    AND (
      (channel_type = 'line' AND public.has_capability_for_workspace(workspace_id, 'line_bot.write'))
      OR (channel_type = 'facebook' AND public.has_capability_for_workspace(workspace_id, 'facebook_bot.write'))
      OR (channel_type = 'instagram' AND public.has_capability_for_workspace(workspace_id, 'instagram_bot.write'))
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.employees WHERE user_id = auth.uid()
    )
    AND (
      (channel_type = 'line' AND public.has_capability_for_workspace(workspace_id, 'line_bot.write'))
      OR (channel_type = 'facebook' AND public.has_capability_for_workspace(workspace_id, 'facebook_bot.write'))
      OR (channel_type = 'instagram' AND public.has_capability_for_workspace(workspace_id, 'instagram_bot.write'))
    )
  );

-- INSERT 不開給 authenticated → webhook 走 admin client（service_role 繞 RLS）

-- inbox_messages: select 自己 workspace
DROP POLICY IF EXISTS inbox_msg_select_own ON public.inbox_messages;
CREATE POLICY inbox_msg_select_own
  ON public.inbox_messages FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.employees WHERE user_id = auth.uid()
    )
  );

-- agent 寫入（自己回訊息）走 channel-aware capability check
DROP POLICY IF EXISTS inbox_msg_insert_agent ON public.inbox_messages;
CREATE POLICY inbox_msg_insert_agent
  ON public.inbox_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.employees WHERE user_id = auth.uid()
    )
    AND sender_type = 'agent'
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. NOTIFY pgrst
-- ─────────────────────────────────────────────────────────────────────────────

NOTIFY pgrst, 'reload schema';

COMMIT;

-- ════ Rollback ════
-- BEGIN;
-- DROP POLICY IF EXISTS inbox_msg_insert_agent ON public.inbox_messages;
-- DROP POLICY IF EXISTS inbox_msg_select_own ON public.inbox_messages;
-- DROP POLICY IF EXISTS inbox_conv_update_own ON public.inbox_conversations;
-- DROP POLICY IF EXISTS inbox_conv_select_own ON public.inbox_conversations;
-- DROP TRIGGER IF EXISTS set_inbox_conversations_updated_at ON public.inbox_conversations;
-- DROP INDEX IF EXISTS public.idx_inbox_msg_workspace_time;
-- DROP INDEX IF EXISTS public.idx_inbox_msg_conversation_time;
-- DROP INDEX IF EXISTS public.idx_inbox_conv_external_user;
-- DROP INDEX IF EXISTS public.idx_inbox_conv_workspace_channel;
-- DROP INDEX IF EXISTS public.idx_inbox_conv_workspace_active;
-- DROP TABLE IF EXISTS public.inbox_messages;
-- DROP TABLE IF EXISTS public.inbox_conversations;
-- COMMIT;
