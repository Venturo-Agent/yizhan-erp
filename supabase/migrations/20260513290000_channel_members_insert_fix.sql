-- ════════════════════════════════════════════════════════════════════════
-- Hotfix: channel_members INSERT 雞生蛋
--
-- 問題：
--   原 policy: WITH CHECK (is_channel_owner(channel_id, get_current_employee_id()))
--   新 channel 剛建完還沒 owner、第一個 channel_members INSERT 必失敗
--   error: new row violates row-level security policy for table "channel_members"
--
-- 場景：
--   William 從 sidebar「同事」section 點 Carson → openDmWith 跑：
--     1. createChannel(type='dm', created_by=me)
--     2. createChannelMember(channel_id, employee_id=me, role='owner')  ← 卡這、雞生蛋
--
-- 修法：
--   policy 允許「我加我自己進 channel」（建完自己變 owner / member）
--   既有 owner 加別人也允許（OR is_channel_owner）
-- ════════════════════════════════════════════════════════════════════════

BEGIN;

DROP POLICY IF EXISTS channel_members_insert ON public.channel_members;
CREATE POLICY channel_members_insert ON public.channel_members
FOR INSERT
WITH CHECK (
  -- 自己加自己進 channel（建完當 owner、或被邀請後接受）
  employee_id = public.get_current_employee_id()
  -- OR 既有 owner 加別人
  OR public.is_channel_owner(channel_id, public.get_current_employee_id())
);

COMMIT;

NOTIFY pgrst, 'reload schema';
