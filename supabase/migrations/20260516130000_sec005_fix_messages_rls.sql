-- ════════════════════════════════════════════════════════════════════════
-- SEC-005: 修復 channel_messages RLS — 補 SELECT policy + workspace 隔離
--
-- 問題根因：
--   20260512000000_retroactive_ai_agents_system.sql 重建 INSERT/UPDATE/DELETE
--   但「忘了」補 SELECT policy。RLS enabled 卻無 SELECT policy = 所有
--   authenticated user 無法 SELECT channel_messages。
--   （若 RLS 不 FORCE，service_role 可讀，但 anon/authenticated 全擋）
--
-- 第二個問題：
--   is_channel_member(channel_id, employee_id) 是 SECURITY DEFINER，
--   直接查 channel_members 不走 RLS，沒有 workspace 隔離。
--   惡意 user 若知道另一個 workspace 的 channel_id 且自己不在 channel_members，
--   靠此 function 繞不過去。但若能偽造 employee_id（不可能、get_current_employee_id
--   是 SECURITY DEFINER 從 auth.uid 推導）就可能跨 workspace 讀。
--   為了完整 defense-in-depth，SELECT policy 直接加 workspace_id 子查詢。
--
-- 修法：
--   1. 新增 channel_messages_select policy：
--      - 訊息所屬 channel 的 workspace_id = 當前 user workspace
--      - 且 user 是該 channel 的 member
--      - recipient_employee_id IS NULL（公開訊息）OR recipient = 自己 OR sender = 自己
--        （個人化通知訊息只有收件人 + 發件人可見）
--
-- 不動：
--   - channel_messages_insert / update / delete policy（已存在且正確）
--   - channels / channel_members RLS（已有 workspace 隔離）
-- ════════════════════════════════════════════════════════════════════════

BEGIN;

-- SELECT policy：
--   1. 透過 channels 子查詢確認 workspace 隔離（channel → workspace_id）
--   2. 透過 is_channel_member() 確認 user 是 channel member
--   3. recipient_employee_id 邏輯：
--      - NULL = 公開訊息，所有 member 可見
--      - NOT NULL = 個人化訊息，只有 recipient 本人 + sender 本人可見

DROP POLICY IF EXISTS channel_messages_select ON public.channel_messages;
CREATE POLICY channel_messages_select ON public.channel_messages
  FOR SELECT
  USING (
    -- workspace 隔離：透過 channels 子查詢確認（is_channel_member 是 SECURITY DEFINER 不走 RLS）
    EXISTS (
      SELECT 1 FROM public.channels c
      WHERE c.id = channel_messages.channel_id
        AND c.workspace_id = public.get_current_user_workspace()
    )
    -- channel member 確認
    AND public.is_channel_member(channel_messages.channel_id, public.get_current_employee_id())
    -- recipient 隔離：公開訊息 OR 我是收件人 OR 我是發件人
    AND (
      channel_messages.recipient_employee_id IS NULL
      OR channel_messages.recipient_employee_id = public.get_current_employee_id()
      OR channel_messages.sender_employee_id = public.get_current_employee_id()
    )
  );

COMMIT;

NOTIFY pgrst, 'reload schema';

-- ════ Rollback（萬一爆炸、複製貼上跑）════
-- BEGIN;
-- DROP POLICY IF EXISTS channel_messages_select ON public.channel_messages;
-- COMMIT;
-- NOTIFY pgrst, 'reload schema';
