-- ═══════════════════════════════════════════════════════════════════════════
-- RETROACTIVE: ai_agents 系統建立（2026-05-12 直接 SSH apply、此檔作 git 追蹤）
--
-- 背景：HAPPY 從 employees.is_bot（概念污染）改為獨立 ai_agents 表
--   - employees 是「真實員工」、不該包含 AI agent
--   - ai_agents 專門存 SaaS AI（HAPPY 內部、未來 LINE/FB 外部）
--   - channel.agent_id / channel_messages.sender_agent_id 對 ai_agents
--
-- Production 已在 2026-05-12 套用、此檔 idempotent（IF NOT EXISTS / IF EXISTS）
-- 可安全重跑、不會破壞已有資料
--
-- spec：~/Obsidian/Logan-Workspace/2026-05-12-channel-spec-v0.2-extract-ai-agents.md
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ═══════════════════════════════════════════════
-- 1. ai_agents 表
-- ═══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.ai_agents (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid       NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  code        text        NOT NULL,
  name        text        NOT NULL,
  avatar_url  text,
  description text,
  scope       text        NOT NULL DEFAULT 'internal'
                          CHECK (scope IN ('internal', 'external')),
  capabilities jsonb      NOT NULL DEFAULT '{}'::jsonb,
  status      text        NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active', 'disabled')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, code)
);

CREATE INDEX IF NOT EXISTS idx_ai_agents_workspace ON public.ai_agents(workspace_id);
CREATE INDEX IF NOT EXISTS idx_ai_agents_scope     ON public.ai_agents(workspace_id, scope);

COMMENT ON TABLE  public.ai_agents               IS 'AI agent 實體（HAPPY 等）、不掛 employees 表';
COMMENT ON COLUMN public.ai_agents.scope         IS 'internal = SaaS 內部 AI（HAPPY）、external = 對外客服（FB/IG/LINE@、v2）';
COMMENT ON COLUMN public.ai_agents.capabilities  IS 'v1 預留、v2 接 AI 時定義可查哪些資料 / 能執行哪些動作';

-- ═══════════════════════════════════════════════
-- 2. 每個 workspace seed HAPPY agent
--    不依賴 employees.is_bot（欄位已移除）
--    ON CONFLICT DO NOTHING = idempotent
-- ═══════════════════════════════════════════════
INSERT INTO public.ai_agents (workspace_id, code, name, scope, status)
SELECT id, 'HAPPY', 'HAPPY', 'internal', 'active'
FROM public.workspaces
ON CONFLICT (workspace_id, code) DO NOTHING;

-- ═══════════════════════════════════════════════
-- 3. channel_messages sender 欄位拆兩條
--    sender_employee_id = 真人員工發的訊息
--    sender_agent_id    = AI agent 發的訊息（service role 寫入、繞 RLS）
-- ═══════════════════════════════════════════════
ALTER TABLE public.channel_messages
  ADD COLUMN IF NOT EXISTS sender_employee_id uuid
    REFERENCES public.employees(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sender_agent_id uuid
    REFERENCES public.ai_agents(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_channel_messages_sender_employee
  ON public.channel_messages(sender_employee_id)
  WHERE sender_employee_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_channel_messages_sender_agent
  ON public.channel_messages(sender_agent_id)
  WHERE sender_agent_id IS NOT NULL;

-- sender 互斥 constraint（系統訊息兩者皆 NULL）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'channel_messages_sender_exactly_one'
  ) THEN
    ALTER TABLE public.channel_messages
      ADD CONSTRAINT channel_messages_sender_exactly_one CHECK (
        (sender_employee_id IS NOT NULL AND sender_agent_id IS NULL) OR
        (sender_employee_id IS NULL     AND sender_agent_id IS NOT NULL) OR
        (sender_employee_id IS NULL     AND sender_agent_id IS NULL)
      );
  END IF;
END $$;

COMMENT ON COLUMN public.channel_messages.sender_employee_id IS '員工發的訊息、與 sender_agent_id 互斥';
COMMENT ON COLUMN public.channel_messages.sender_agent_id    IS 'AI agent 發的訊息、與 sender_employee_id 互斥';

-- ═══════════════════════════════════════════════
-- 4. channels.agent_id — DM 對象是 agent 時標記
-- ═══════════════════════════════════════════════
ALTER TABLE public.channels
  ADD COLUMN IF NOT EXISTS agent_id uuid
    REFERENCES public.ai_agents(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_channels_agent
  ON public.channels(agent_id)
  WHERE agent_id IS NOT NULL;

COMMENT ON COLUMN public.channels.agent_id IS '員工↔HAPPY DM 時設、員工↔員工 DM 為 NULL';

-- ═══════════════════════════════════════════════
-- 5. 清 employees.is_bot 殭屍欄位
--    is_bot 從未被 source code 引用、純概念污染
-- ═══════════════════════════════════════════════
DROP INDEX    IF EXISTS public.idx_employees_is_bot;
ALTER TABLE public.employees DROP COLUMN IF EXISTS is_bot;

-- employee_type CHECK constraint 移除 'system_bot'（HAPPY 已不在 employees）
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employees_employee_type_check') THEN
    ALTER TABLE public.employees DROP CONSTRAINT employees_employee_type_check;
  END IF;
  -- 重建：human / bot（早期 BOT001 遺留、未清）/ integration（LINE/FB/IG 佔位）
  ALTER TABLE public.employees ADD CONSTRAINT employees_employee_type_check
    CHECK (employee_type IN ('human', 'bot', 'integration'));
END $$;

-- ═══════════════════════════════════════════════
-- 6. 清 ensure_happy_dm RPC（v1 不 seed DM、v2 再補）
-- ═══════════════════════════════════════════════
DROP FUNCTION IF EXISTS public.ensure_happy_dm();

-- ═══════════════════════════════════════════════
-- 7. RLS
-- ═══════════════════════════════════════════════
ALTER TABLE public.ai_agents ENABLE ROW LEVEL SECURITY;

-- workspace 內 active employee 可 SELECT（channel 顯示 agent 名稱 / 頭像用）
DROP POLICY IF EXISTS ai_agents_select ON public.ai_agents;
CREATE POLICY ai_agents_select ON public.ai_agents
  FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM public.employees WHERE id = auth.uid()::uuid
  ));

-- INSERT / UPDATE / DELETE 只 service role 能做（應用層不開放）

-- channel_messages INSERT — sender 必須是自己員工 id
DROP POLICY IF EXISTS channel_messages_insert ON public.channel_messages;
CREATE POLICY channel_messages_insert ON public.channel_messages
  FOR INSERT
  WITH CHECK (
    sender_employee_id = get_current_employee_id()
    AND EXISTS (
      SELECT 1 FROM public.channel_members cm
      WHERE cm.channel_id = channel_messages.channel_id
        AND cm.employee_id = get_current_employee_id()
    )
    -- system_notice：只允 thread reply
    AND (
      reply_to_id IS NOT NULL
      OR NOT EXISTS (
        SELECT 1 FROM public.channels c
        WHERE c.id = channel_messages.channel_id AND c.type = 'system_notice'
      )
    )
    -- announcement 主訊息：要有 channels.manage capability
    AND (
      reply_to_id IS NOT NULL
      OR NOT EXISTS (
        SELECT 1 FROM public.channels c
        WHERE c.id = channel_messages.channel_id AND c.type = 'announcement'
      )
      OR has_capability_for_workspace(get_current_user_workspace(), 'channels.manage')
    )
  );

-- UPDATE / DELETE — 只能動自己發的訊息
DROP POLICY IF EXISTS channel_messages_update ON public.channel_messages;
CREATE POLICY channel_messages_update ON public.channel_messages
  FOR UPDATE
  USING (sender_employee_id = get_current_employee_id());

DROP POLICY IF EXISTS channel_messages_delete ON public.channel_messages;
CREATE POLICY channel_messages_delete ON public.channel_messages
  FOR DELETE
  USING (sender_employee_id = get_current_employee_id());

COMMIT;

NOTIFY pgrst, 'reload schema';

-- ═══════════════════════════════════════════════
-- 驗證查詢（apply 後跑）
-- ═══════════════════════════════════════════════
-- SELECT workspace_id, code, name, scope FROM ai_agents WHERE code = 'HAPPY';
-- 預期：各 workspace 一筆
--
-- SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'employees' AND column_name = 'is_bot';
-- 預期：0 筆
--
-- SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'channel_messages'
--   AND column_name IN ('sender_employee_id','sender_agent_id');
-- 預期：2 筆
--
-- SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'channels' AND column_name = 'agent_id';
-- 預期：1 筆

-- ═══════════════════════════════════════════════
-- Rollback（緊急用）
-- ═══════════════════════════════════════════════
-- BEGIN;
-- DROP POLICY IF EXISTS channel_messages_delete ON public.channel_messages;
-- DROP POLICY IF EXISTS channel_messages_update ON public.channel_messages;
-- DROP POLICY IF EXISTS channel_messages_insert ON public.channel_messages;
-- DROP POLICY IF EXISTS ai_agents_select ON public.ai_agents;
-- DROP INDEX IF EXISTS idx_channels_agent;
-- ALTER TABLE public.channels DROP COLUMN IF EXISTS agent_id;
-- DROP INDEX IF EXISTS idx_channel_messages_sender_agent;
-- DROP INDEX IF EXISTS idx_channel_messages_sender_employee;
-- ALTER TABLE public.channel_messages DROP CONSTRAINT IF EXISTS channel_messages_sender_exactly_one;
-- ALTER TABLE public.channel_messages DROP COLUMN IF EXISTS sender_agent_id;
-- ALTER TABLE public.channel_messages DROP COLUMN IF EXISTS sender_employee_id;
-- DROP INDEX IF EXISTS idx_ai_agents_scope;
-- DROP INDEX IF EXISTS idx_ai_agents_workspace;
-- DROP TABLE IF EXISTS public.ai_agents CASCADE;
-- COMMIT;
