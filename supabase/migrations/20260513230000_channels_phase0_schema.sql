-- ════════════════════════════════════════════════════════════════════════
-- Channels Phase 0：schema 調整（為「三類官方頻道」鋪基底）
--
-- 5/13 William 拍板：頻道分三層結構
--   1. 官方頻道（置頂、員工自動可見）：公告 / 機器人 / 通知
--   2. 私訊 DM（獨立區）
--   3. 專案 & 群組（合併、綁團 = 專案、無團 = 群組）
--
-- 動作：
--   1. channels.type CHECK constraint 加 'bot'（HAPPY 機器人頻道）
--   2. channels.is_official boolean — 公司級別、員工自動加入、不可主動建
--   3. channels.post_permission text — 發言守門：'all' / 'capability:X'（公告類限發、其他 reply 留言）
--   4. channel_messages.recipient_employee_id uuid — 個人化通知用（系統通知頻道、訊息對單員工）
--
-- 不動：
--   - 既有 row（保留現況、Phase 1 seed 才補 is_official=true）
--   - channels.agent_id（已有、給 bot 類連 ai_agents）
--   - channel_messages.reply_to_id / sender_employee_id / sender_agent_id（已有、留言串 + 機器人發訊息 ready）
-- ════════════════════════════════════════════════════════════════════════

BEGIN;

-- 1. type CHECK constraint 加 'bot'
ALTER TABLE public.channels DROP CONSTRAINT IF EXISTS channels_type_check;
ALTER TABLE public.channels ADD CONSTRAINT channels_type_check
  CHECK (type = ANY (ARRAY['announcement', 'system_notice', 'dm', 'blank', 'project', 'bot']));

-- 2. is_official boolean（公司級別、員工自動 enroll）
ALTER TABLE public.channels
  ADD COLUMN IF NOT EXISTS is_official boolean NOT NULL DEFAULT false;

-- 3. post_permission text（發言守門規則）
--    'all'：任何 member 可發
--    'capability:channels.announcement.post'：限有該 capability 可發、其他人只能 reply
ALTER TABLE public.channels
  ADD COLUMN IF NOT EXISTS post_permission text NOT NULL DEFAULT 'all';

-- 4. recipient_employee_id uuid（系統通知個人化）
--    NULL = 公開訊息（所有 member 可見）
--    NOT NULL = 個人訊息（只該員工 + 發送方可見、RLS 守）
ALTER TABLE public.channel_messages
  ADD COLUMN IF NOT EXISTS recipient_employee_id uuid REFERENCES public.employees(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_channel_messages_recipient
  ON public.channel_messages(recipient_employee_id)
  WHERE recipient_employee_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_channels_is_official
  ON public.channels(is_official)
  WHERE is_official = true;

COMMIT;

-- 通知 PostgREST 重 reload schema cache（client 才能查新欄位）
NOTIFY pgrst, 'reload schema';

-- ════ Rollback（萬一爆炸、複製貼上跑）════
-- BEGIN;
-- DROP INDEX IF EXISTS idx_channels_is_official;
-- DROP INDEX IF EXISTS idx_channel_messages_recipient;
-- ALTER TABLE public.channel_messages DROP COLUMN IF EXISTS recipient_employee_id;
-- ALTER TABLE public.channels DROP COLUMN IF EXISTS post_permission;
-- ALTER TABLE public.channels DROP COLUMN IF EXISTS is_official;
-- ALTER TABLE public.channels DROP CONSTRAINT IF EXISTS channels_type_check;
-- ALTER TABLE public.channels ADD CONSTRAINT channels_type_check
--   CHECK (type = ANY (ARRAY['announcement', 'system_notice', 'dm', 'blank', 'project']));
-- COMMIT;
-- NOTIFY pgrst, 'reload schema';
