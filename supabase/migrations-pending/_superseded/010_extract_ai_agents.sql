-- =============================================================================
-- 010_extract_ai_agents.sql — Channel spec v0.2 修訂
-- =============================================================================
-- 把 HAPPY 從 employees 表（is_bot=true）拆出來、建獨立 ai_agents 表
-- 對齊 spec §9 概念：HAPPY 是 SaaS 內部 AI、不是員工
--
-- spec：~/Obsidian/Logan-Workspace/2026-05-12-channel-spec-v0.2-extract-ai-agents.md
--
-- 執行條件：
--   1. William review spec v0.2 + 此 migration
--   2. 應用層 6 個檔案改動同步準備好（見 spec §動工範圍）
--   3. 跑 tests/e2e/login-api.spec.ts 確認動 RLS 不破登入
--
-- Rollback：見 spec §Rollback 區塊
-- =============================================================================

BEGIN;

-- ============================================
-- 1. 建 ai_agents 表
-- ============================================
CREATE TABLE IF NOT EXISTS public.ai_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  avatar_url text,
  description text,
  scope text NOT NULL DEFAULT 'internal' CHECK (scope IN ('internal','external')),
  capabilities jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, code)
);

CREATE INDEX IF NOT EXISTS idx_ai_agents_workspace ON public.ai_agents(workspace_id);
CREATE INDEX IF NOT EXISTS idx_ai_agents_scope ON public.ai_agents(workspace_id, scope);

COMMENT ON TABLE public.ai_agents IS 'AI agent / 機器人實體、不掛在 employees 表、spec v0.2 2026-05-12';
COMMENT ON COLUMN public.ai_agents.scope IS 'internal = SaaS 內部 AI（HAPPY）、external = 對外客服機器人（FB/IG/LINE@、v2）';
COMMENT ON COLUMN public.ai_agents.capabilities IS '能查什麼資料、能執行什麼動作、v1 預留、v2 接 AI 時定義';

-- ============================================
-- 2. 把現有 4 筆 HAPPY 從 employees 搬到 ai_agents
--    保留原 id、讓未來「如果」有人錯引用還對得上
-- ============================================
INSERT INTO public.ai_agents (id, workspace_id, code, name, scope, status)
SELECT id, workspace_id, 'HAPPY', 'HAPPY', 'internal', 'active'
FROM public.employees
WHERE is_bot = true
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 3. channel_messages.sender 拆兩欄
--    (channel_messages 0 筆訊息、不用搬資料、直接 drop sender_id)
-- ============================================
ALTER TABLE public.channel_messages
  ADD COLUMN IF NOT EXISTS sender_employee_id uuid
    REFERENCES public.employees(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sender_agent_id uuid
    REFERENCES public.ai_agents(id) ON DELETE SET NULL;

-- 確認真的沒訊息再 drop sender_id（防線、避免實機跑時意外有訊息）
DO $$
DECLARE
  v_count integer;
BEGIN
  SELECT count(*) INTO v_count FROM public.channel_messages;
  IF v_count > 0 THEN
    RAISE EXCEPTION 'channel_messages 有 % 筆資料、不能直接 drop sender_id、要先寫資料搬移邏輯', v_count;
  END IF;
END $$;

-- 先 drop 依賴 sender_id 的 RLS policies（後面 §7 重建新版）
DROP POLICY IF EXISTS channel_messages_insert ON public.channel_messages;
DROP POLICY IF EXISTS channel_messages_update ON public.channel_messages;
DROP POLICY IF EXISTS channel_messages_delete ON public.channel_messages;

ALTER TABLE public.channel_messages DROP COLUMN IF EXISTS sender_id;

ALTER TABLE public.channel_messages
  ADD CONSTRAINT channel_messages_sender_exactly_one CHECK (
    (sender_employee_id IS NOT NULL AND sender_agent_id IS NULL) OR
    (sender_employee_id IS NULL AND sender_agent_id IS NOT NULL) OR
    (sender_employee_id IS NULL AND sender_agent_id IS NULL)  -- 系統訊息（message_type='system'）
  );

CREATE INDEX IF NOT EXISTS idx_channel_messages_sender_employee
  ON public.channel_messages(sender_employee_id)
  WHERE sender_employee_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_channel_messages_sender_agent
  ON public.channel_messages(sender_agent_id)
  WHERE sender_agent_id IS NOT NULL;

COMMENT ON COLUMN public.channel_messages.sender_employee_id IS '訊息發送者是員工時設、與 sender_agent_id 互斥';
COMMENT ON COLUMN public.channel_messages.sender_agent_id IS '訊息發送者是 AI agent 時設、與 sender_employee_id 互斥';

-- ============================================
-- 4. channels.agent_id — DM 對話對象是 agent 時標記
-- ============================================
ALTER TABLE public.channels
  ADD COLUMN IF NOT EXISTS agent_id uuid
    REFERENCES public.ai_agents(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_channels_agent ON public.channels(agent_id) WHERE agent_id IS NOT NULL;

COMMENT ON COLUMN public.channels.agent_id IS 'DM channel 對話對象是 agent 時設（員工↔HAPPY DM）、員工↔員工 DM 為 NULL';

-- ============================================
-- 5. 清 employees 殘留
-- ============================================
DELETE FROM public.employees WHERE is_bot = true;
DROP INDEX IF EXISTS public.idx_employees_is_bot;
ALTER TABLE public.employees DROP COLUMN IF EXISTS is_bot;

-- employee_type CHECK 砍 'system_bot' （HAPPY 已不在 employees）
-- 保留 'human' / 'bot' / 'integration'（'bot' 是早期 BOT001 概念、未刪、避免雙改動風險）
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employees_employee_type_check') THEN
    ALTER TABLE public.employees DROP CONSTRAINT employees_employee_type_check;
  END IF;
  ALTER TABLE public.employees ADD CONSTRAINT employees_employee_type_check
    CHECK (employee_type IN ('human', 'bot', 'integration'));
END $$;

-- ============================================
-- 6. 移除 ensure_happy_dm RPC
--    v1 拍板不 seed HAPPY DM、HAPPY 還沒接 AI 對話能力、空殼 DM 沒意義
--    v2 接 AI 後另寫 ensure_happy_dm v2 撈 ai_agents
-- ============================================
DROP FUNCTION IF EXISTS public.ensure_happy_dm();

-- ============================================
-- 7. RLS policies
-- ============================================
ALTER TABLE public.ai_agents ENABLE ROW LEVEL SECURITY;

-- ai_agents：workspace 內所有 active employee 都能 SELECT（給 channel 顯示用）
CREATE POLICY ai_agents_select ON public.ai_agents
  FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM public.employees
    WHERE id = auth.uid()::uuid
  ));

-- ai_agents：v1 不開 INSERT/UPDATE/DELETE（只 service role 能改、避免亂建 agent）

-- channel_messages RLS policy 改寫
-- 原引用 sender_id 的三條（insert/update/delete）改成 sender_employee_id
-- 邏輯：員工只能用「自己員工身分」發/改/刪訊息、不能假冒 agent
-- AI agent 的訊息由 service role 寫入、繞過 RLS、不需在 policy 內開閘

-- INSERT：sender_employee_id = 當前員工 id + 必為頻道成員 + system_notice/announcement 寫入規則
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
    -- system_notice：只允許 thread reply、不允許頻道內直接發新訊息
    AND (
      reply_to_id IS NOT NULL
      OR NOT EXISTS (
        SELECT 1 FROM public.channels c
        WHERE c.id = channel_messages.channel_id AND c.type = 'system_notice'
      )
    )
    -- announcement：thread reply 自由、發主訊息要 channels.manage capability
    AND (
      reply_to_id IS NOT NULL
      OR NOT EXISTS (
        SELECT 1 FROM public.channels c
        WHERE c.id = channel_messages.channel_id AND c.type = 'announcement'
      )
      OR has_capability_for_workspace(get_current_user_workspace(), 'channels.manage')
    )
  );

-- UPDATE：只能改自己發的訊息（員工身分）
DROP POLICY IF EXISTS channel_messages_update ON public.channel_messages;
CREATE POLICY channel_messages_update ON public.channel_messages
  FOR UPDATE
  USING (sender_employee_id = get_current_employee_id());

-- DELETE：只能刪自己發的訊息（員工身分）
DROP POLICY IF EXISTS channel_messages_delete ON public.channel_messages;
CREATE POLICY channel_messages_delete ON public.channel_messages
  FOR DELETE
  USING (sender_employee_id = get_current_employee_id());

-- SELECT policy 不動（只看 channel_members、沒引用 sender_id）

COMMIT;

-- =============================================================================
-- 後續手動驗證 SQL（apply 完跑）
-- =============================================================================
-- 1. 確認 4 個 HAPPY 都在 ai_agents
-- SELECT workspace_id, code, name FROM ai_agents WHERE code = 'HAPPY';
-- 預期：4 筆
--
-- 2. 確認 employees 沒有 HAPPY
-- SELECT count(*) FROM employees WHERE display_name = 'HAPPY';
-- 預期：0
--
-- 3. 確認 is_bot 欄位沒了
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name = 'employees' AND column_name = 'is_bot';
-- 預期：0 筆
--
-- 4. 確認 channel_messages 兩個新欄位 + CHECK
-- \d channel_messages
-- 預期：sender_employee_id / sender_agent_id 都在、有 channel_messages_sender_exactly_one CHECK
--
-- 5. 確認 channels.agent_id 存在
-- \d channels
-- 預期：agent_id 欄位在
