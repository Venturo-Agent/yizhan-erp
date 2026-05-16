-- ════════════════════════════════════════════════════════════════════════
-- Channels Phase 3：公告類發言守門 + capability 對齊 + role seed
--
-- 5/13 William 拍板：公告類限有 capability 的人發訊息、其他人只能 reply 留言。
-- 因為 channel_messages 走 client supabase（無 API route）、守門必須在 DB 層
-- （trigger）、不能靠 API。
--
-- 動作：
--   1. 補救 P1+2 寫的 'capability:channels.announcement.post' → '.write'
--      （codegen pattern 是 .read / .write、沒有 .post）
--   2. 加 trigger function check_channel_post_permission() 守 INSERT
--      - reply（reply_to_id IS NOT NULL）一律放行
--      - 機器人（sender_agent_id IS NOT NULL）一律放行
--      - channel.post_permission='all' / NULL 一律放行
--      - 'capability:X' → check sender_employee 的 role 有沒有該 capability
--   3. seed：給每個 workspace 的「系統主管 / 老闆 / admin」role
--      channels.announcement.write capability（預設可發公告）
-- ════════════════════════════════════════════════════════════════════════

BEGIN;

-- 1. 補救 P1+2 的 capability code（pattern 對齊 codegen）
UPDATE public.channels
SET post_permission = 'capability:channels.announcement.write'
WHERE post_permission = 'capability:channels.announcement.post';

-- 2. trigger function：channel_messages INSERT 前守門
CREATE OR REPLACE FUNCTION public.check_channel_post_permission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_channel public.channels%ROWTYPE;
  v_capability text;
BEGIN
  -- reply 留言一律放行（任何 member 可在 thread 內回覆）
  IF NEW.reply_to_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- 機器人發訊息一律放行（HAPPY 自動推播等）
  IF NEW.sender_agent_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- 撈該 channel 設定
  SELECT * INTO v_channel FROM public.channels WHERE id = NEW.channel_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION '找不到該頻道 (channel_id=%)', NEW.channel_id;
  END IF;

  -- 'all' 或 NULL 一律放行
  IF v_channel.post_permission IS NULL OR v_channel.post_permission = 'all' THEN
    RETURN NEW;
  END IF;

  -- 'capability:X' → check 發送員工的 role 有沒有該 capability
  IF v_channel.post_permission LIKE 'capability:%' THEN
    v_capability := substring(v_channel.post_permission FROM 'capability:(.*)');

    IF NEW.sender_employee_id IS NULL THEN
      RAISE EXCEPTION '此頻道限有 % capability 的員工發言、需以員工身份發送', v_capability
        USING ERRCODE = '42501';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM public.employees e
      JOIN public.role_capabilities rc ON rc.role_id = e.role_id
      WHERE e.id = NEW.sender_employee_id
        AND rc.capability_code = v_capability
        AND rc.enabled = true
    ) THEN
      RAISE EXCEPTION '無權在此頻道發訊息、僅能在留言串內 reply（缺 capability: %）', v_capability
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_channel_post_permission_trigger ON public.channel_messages;
CREATE TRIGGER check_channel_post_permission_trigger
  BEFORE INSERT ON public.channel_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.check_channel_post_permission();

-- 3. seed：「系統主管」/「老闆」/「admin」role 自動有 channels.announcement.write
--    （新 workspace seed 後續另外處理、這次補既有 4 workspace 主管 role）
INSERT INTO public.role_capabilities (role_id, capability_code, enabled)
SELECT wr.id, 'channels.announcement.write', true
FROM public.workspace_roles wr
WHERE (wr.name IN ('系統主管', '老闆', 'admin', 'Admin') OR wr.is_admin = true)
  AND NOT EXISTS (
    SELECT 1 FROM public.role_capabilities rc
    WHERE rc.role_id = wr.id AND rc.capability_code = 'channels.announcement.write'
  );

COMMIT;

NOTIFY pgrst, 'reload schema';

-- ════ Rollback（萬一爆炸、複製貼上跑）════
-- BEGIN;
-- DELETE FROM public.role_capabilities WHERE capability_code = 'channels.announcement.write';
-- DROP TRIGGER IF EXISTS check_channel_post_permission_trigger ON public.channel_messages;
-- DROP FUNCTION IF EXISTS public.check_channel_post_permission();
-- UPDATE public.channels SET post_permission = 'capability:channels.announcement.post'
--   WHERE post_permission = 'capability:channels.announcement.write';
-- COMMIT;
