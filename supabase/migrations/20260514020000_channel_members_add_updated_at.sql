-- ════════════════════════════════════════════════════════════════════════
-- channel_members 加 updated_at 欄位 + trigger
--
-- 問題：ChannelView 進頻道時 updateChannelMember(last_read_at=now()) 跑
-- createEntityHook 預設 update payload 含 `updated_at: now()`、channel_members 沒這欄
-- 錯誤：Could not find the 'updated_at' column of 'channel_members' in the schema cache
--
-- 修：加 updated_at + 觸發器自動填
-- ════════════════════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE public.channel_members
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

DROP TRIGGER IF EXISTS channel_members_set_updated_at ON public.channel_members;
CREATE TRIGGER channel_members_set_updated_at
  BEFORE UPDATE ON public.channel_members
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMIT;

NOTIFY pgrst, 'reload schema';
