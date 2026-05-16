-- ════════════════════════════════════════════════════════════════════════
-- Touch channels.updated_at on new message
--
-- 問題：channels.updated_at 只在 channel 本身被 UPDATE 時動、新訊息進來不動。
-- sidebar 未讀紅點邏輯靠 channel.updated_at vs my.last_read_at 比、
-- 但 updated_at 一直停留在建立時間、永遠不能正確判定。
--
-- 修：channel_messages INSERT 後、把 channels.updated_at 設為 now()
--    → 新訊息進來 → updated_at 動 → 跟 last_read_at 比就準
-- ════════════════════════════════════════════════════════════════════════

BEGIN;

CREATE OR REPLACE FUNCTION public.touch_channel_on_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.channels SET updated_at = now() WHERE id = NEW.channel_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_channel_on_message ON public.channel_messages;
CREATE TRIGGER trg_touch_channel_on_message
  AFTER INSERT ON public.channel_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_channel_on_new_message();

COMMIT;

NOTIFY pgrst, 'reload schema';
