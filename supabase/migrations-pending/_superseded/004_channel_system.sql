-- =============================================================================
-- 004_channel_system.sql — Channel 系統 v0.1
-- =============================================================================
-- 純加法（CREATE TABLE / ADD COLUMN）、純內部、零風險
-- spec 完整版：~/Obsidian/Logan-Workspace/2026-05-12-channel-system-spec-v0.md
--
-- 設計重點（5/12 William 拍板）：
-- - 5 種 type：announcement / system_notice / dm / blank / project
-- - HAPPY 走 DM、每員工 1on1、不做公開 bot 頻道
-- - 對外 AI（FB/IG/LINE@）不在系統內、scope 欄位不要
-- - 避開舊版（5/2 砍掉那套）3 痛點：
--   1. sender_id FK 到 employees、API 一律 join 出 sender_name、UI 不再看 UUID
--   2. is_system 標記、UI 系統頻道分區、不爆 sidebar
--   3. 邀請 = 直接 INSERT、不發機器人通知打擾（內部簡化版）
--
-- 執行條件：
--   1. William review spec + 此 migration
--   2. UI 路由 + sidebar + features.ts + capabilities.ts 同步準備好
--   3. Seed data migration（005 待後續寫）準備好
-- =============================================================================

BEGIN;

-- ============================================
-- 1. employees 加 is_bot flag（標記 HAPPY）
-- ============================================
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS is_bot boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_employees_is_bot
  ON public.employees(workspace_id) WHERE is_bot = true;

COMMENT ON COLUMN public.employees.is_bot IS
  'HAPPY 等系統使用者標記、true = 不是真員工、用來在 channel_messages 當 sender 顯示';

-- ============================================
-- 2. channels
-- ============================================
CREATE TABLE IF NOT EXISTS public.channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('announcement','system_notice','dm','blank','project')),
  tour_id text REFERENCES public.tours(id) ON DELETE CASCADE,  -- 只 project type 用、tours.id 是 text
  name text,
  description text,
  created_by uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  is_system boolean NOT NULL DEFAULT false,
  is_archived boolean NOT NULL DEFAULT false,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_channels_workspace ON public.channels(workspace_id);
CREATE INDEX IF NOT EXISTS idx_channels_type ON public.channels(workspace_id, type);
CREATE INDEX IF NOT EXISTS idx_channels_tour ON public.channels(tour_id) WHERE tour_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_channels_active ON public.channels(workspace_id, is_archived) WHERE is_archived = false;

COMMENT ON TABLE public.channels IS '溝通頻道、5 種 type、spec v0.1 2026-05-12';
COMMENT ON COLUMN public.channels.is_system IS 'announcement / system_notice 是 true、不能手動刪、UI 系統分區顯示';
COMMENT ON COLUMN public.channels.tour_id IS '只 project type 用、FK 到 tours(id)、綁團';

-- ============================================
-- 3. channel_members
-- ============================================
CREATE TABLE IF NOT EXISTS public.channel_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner','member')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  last_read_at timestamptz,
  UNIQUE (channel_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_channel_members_employee
  ON public.channel_members(employee_id);

-- ============================================
-- 4. channel_messages
-- ============================================
CREATE TABLE IF NOT EXISTS public.channel_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  body text,
  message_type text NOT NULL DEFAULT 'text'
    CHECK (message_type IN ('text','card','system','action_result')),
  payload jsonb,
  reply_to_id uuid REFERENCES public.channel_messages(id) ON DELETE CASCADE,
  reply_count integer NOT NULL DEFAULT 0,
  last_reply_at timestamptz,
  scheduled_at timestamptz,
  is_pinned boolean NOT NULL DEFAULT false,
  reactions jsonb NOT NULL DEFAULT '{}'::jsonb,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,    -- 軟刪：false = 撤回（VENTURO 標準）
  revoked_at timestamptz,                      -- 撤回時間戳（給 UI 顯示「於 X 時撤回」）
  created_at timestamptz NOT NULL DEFAULT now(),
  edited_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_channel_messages_channel_time
  ON public.channel_messages(channel_id, created_at DESC)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_channel_messages_thread
  ON public.channel_messages(reply_to_id) WHERE reply_to_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_channel_messages_scheduled
  ON public.channel_messages(scheduled_at)
  WHERE scheduled_at IS NOT NULL AND is_active = true;

COMMENT ON COLUMN public.channel_messages.sender_id IS
  'null = 系統訊息；HAPPY 訊息 = HAPPY 員工 id（is_bot=true 那筆）';
COMMENT ON COLUMN public.channel_messages.reactions IS 'v2 才開 UI、欄位先留';
COMMENT ON COLUMN public.channel_messages.is_pinned IS 'v2 才開 UI、欄位先留';
COMMENT ON COLUMN public.channel_messages.attachments IS 'v1 只放 URL string array、不做檔案上傳';

-- ============================================
-- 5. updated_at trigger
-- ============================================
DROP TRIGGER IF EXISTS channels_set_updated_at ON public.channels;
CREATE TRIGGER channels_set_updated_at
  BEFORE UPDATE ON public.channels
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================
-- 6. Thread reply 統計 trigger
-- ============================================
CREATE OR REPLACE FUNCTION public.update_channel_message_reply_stats()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.reply_to_id IS NOT NULL THEN
    UPDATE public.channel_messages
    SET reply_count = COALESCE(reply_count, 0) + 1,
        last_reply_at = NEW.created_at
    WHERE id = NEW.reply_to_id;
  ELSIF TG_OP = 'DELETE' AND OLD.reply_to_id IS NOT NULL THEN
    UPDATE public.channel_messages
    SET reply_count = GREATEST(COALESCE(reply_count, 0) - 1, 0)
    WHERE id = OLD.reply_to_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS channel_messages_reply_stats ON public.channel_messages;
CREATE TRIGGER channel_messages_reply_stats
  AFTER INSERT OR DELETE ON public.channel_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_channel_message_reply_stats();

-- ============================================
-- 7. RLS
-- ============================================
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_messages ENABLE ROW LEVEL SECURITY;

-- === channels ===

-- SELECT：同 workspace 且（系統頻道 OR 是 member）
DROP POLICY IF EXISTS channels_select ON public.channels;
CREATE POLICY channels_select ON public.channels FOR SELECT
  USING (
    workspace_id = public.get_current_user_workspace()
    AND (
      is_system = true
      OR EXISTS (
        SELECT 1 FROM public.channel_members cm
        WHERE cm.channel_id = channels.id
          AND cm.employee_id = public.get_current_employee_id()
      )
    )
  );

-- INSERT：dm/blank 自由建、project 要 tour controller、系統頻道走 service role
DROP POLICY IF EXISTS channels_insert ON public.channels;
CREATE POLICY channels_insert ON public.channels FOR INSERT
  WITH CHECK (
    workspace_id = public.get_current_user_workspace()
    AND is_system = false
    AND (
      type IN ('dm', 'blank')
      OR (
        type = 'project'
        AND EXISTS (
          SELECT 1 FROM public.tours t
          WHERE t.id = channels.tour_id
            AND t.controller_id = public.get_current_employee_id()
        )
      )
    )
  );

-- UPDATE：owner 才能改、且不能改系統頻道
DROP POLICY IF EXISTS channels_update ON public.channels;
CREATE POLICY channels_update ON public.channels FOR UPDATE
  USING (
    is_system = false
    AND EXISTS (
      SELECT 1 FROM public.channel_members cm
      WHERE cm.channel_id = channels.id
        AND cm.employee_id = public.get_current_employee_id()
        AND cm.role = 'owner'
    )
  );

-- DELETE：owner 才能刪、且非系統頻道
DROP POLICY IF EXISTS channels_delete ON public.channels;
CREATE POLICY channels_delete ON public.channels FOR DELETE
  USING (
    is_system = false
    AND EXISTS (
      SELECT 1 FROM public.channel_members cm
      WHERE cm.channel_id = channels.id
        AND cm.employee_id = public.get_current_employee_id()
        AND cm.role = 'owner'
    )
  );

-- === channel_members ===

-- SELECT：是該 channel 的 member 才能看誰在裡面
DROP POLICY IF EXISTS channel_members_select ON public.channel_members;
CREATE POLICY channel_members_select ON public.channel_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.channel_members cm2
      WHERE cm2.channel_id = channel_members.channel_id
        AND cm2.employee_id = public.get_current_employee_id()
    )
  );

-- INSERT：owner 才能加人（系統頻道走 service role）
DROP POLICY IF EXISTS channel_members_insert ON public.channel_members;
CREATE POLICY channel_members_insert ON public.channel_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.channel_members cm
      WHERE cm.channel_id = channel_members.channel_id
        AND cm.employee_id = public.get_current_employee_id()
        AND cm.role = 'owner'
    )
  );

-- UPDATE：自己更新自己的 last_read_at
DROP POLICY IF EXISTS channel_members_update ON public.channel_members;
CREATE POLICY channel_members_update ON public.channel_members FOR UPDATE
  USING (employee_id = public.get_current_employee_id());

-- DELETE：自己離開 OR owner 踢人；DM type 不允許退出
DROP POLICY IF EXISTS channel_members_delete ON public.channel_members;
CREATE POLICY channel_members_delete ON public.channel_members FOR DELETE
  USING (
    NOT EXISTS (
      SELECT 1 FROM public.channels c
      WHERE c.id = channel_members.channel_id AND c.type = 'dm'
    )
    AND (
      employee_id = public.get_current_employee_id()
      OR EXISTS (
        SELECT 1 FROM public.channel_members cm
        WHERE cm.channel_id = channel_members.channel_id
          AND cm.employee_id = public.get_current_employee_id()
          AND cm.role = 'owner'
      )
    )
  );

-- === channel_messages ===

-- SELECT：是 channel member、且訊息為 active（撤回的訊息也能 SELECT、但 UI 顯示成佔位）
DROP POLICY IF EXISTS channel_messages_select ON public.channel_messages;
CREATE POLICY channel_messages_select ON public.channel_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.channel_members cm
      WHERE cm.channel_id = channel_messages.channel_id
        AND cm.employee_id = public.get_current_employee_id()
    )
  );

-- INSERT：member 才能發、且符合 channel type 規則：
-- - system_notice：只允許 thread reply（reply_to_id 非 null）
-- - announcement：主訊息（reply_to_id is null）需 channels.manage capability
DROP POLICY IF EXISTS channel_messages_insert ON public.channel_messages;
CREATE POLICY channel_messages_insert ON public.channel_messages FOR INSERT
  WITH CHECK (
    sender_id = public.get_current_employee_id()
    AND EXISTS (
      SELECT 1 FROM public.channel_members cm
      WHERE cm.channel_id = channel_messages.channel_id
        AND cm.employee_id = public.get_current_employee_id()
    )
    -- system_notice 只能 thread reply
    AND (
      reply_to_id IS NOT NULL
      OR NOT EXISTS (
        SELECT 1 FROM public.channels c
        WHERE c.id = channel_messages.channel_id
          AND c.type = 'system_notice'
      )
    )
    -- announcement 主訊息需 channels.manage capability
    AND (
      reply_to_id IS NOT NULL
      OR NOT EXISTS (
        SELECT 1 FROM public.channels c
        WHERE c.id = channel_messages.channel_id
          AND c.type = 'announcement'
      )
      OR public.has_capability_for_workspace(public.get_current_user_workspace(), 'channels.manage'::text)
    )
  );

-- UPDATE：sender 才能改自己的訊息
DROP POLICY IF EXISTS channel_messages_update ON public.channel_messages;
CREATE POLICY channel_messages_update ON public.channel_messages FOR UPDATE
  USING (sender_id = public.get_current_employee_id());

-- DELETE：sender 才能刪自己的訊息（實際走軟刪、應用層改成 UPDATE deleted_at）
DROP POLICY IF EXISTS channel_messages_delete ON public.channel_messages;
CREATE POLICY channel_messages_delete ON public.channel_messages FOR DELETE
  USING (sender_id = public.get_current_employee_id());

-- ============================================
-- 8. Realtime 開啟（讓前端 supabase.channel().on('postgres_changes') 收得到）
--
-- 重要：channel_members **不**加入 publication
-- - last_read_at 進每個 channel 都會 UPDATE、廣播給全公司會 cascade re-fetch
-- - 5/12 William 踩坑：進 channel 時整站「一直重新整理」、root cause 就是這個
-- - 成員加退人不需要 realtime、進 sidebar 才看就好
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.channel_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.channels;

COMMIT;

NOTIFY pgrst, 'reload schema';
