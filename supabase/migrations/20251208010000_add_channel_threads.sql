-- Slack 風格討論串：訊息可以回覆訊息
-- 不需要獨立的 channel_threads 資料表

BEGIN;

-- 移除舊的 thread_id 欄位（如果存在）
ALTER TABLE public.messages
DROP COLUMN IF EXISTS thread_id;

-- 新增 parent_message_id 欄位：指向被回覆的訊息
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS parent_message_id uuid REFERENCES public.messages(id) ON DELETE CASCADE;

-- 新增 reply_count 欄位：該訊息有多少回覆（僅父訊息有值）
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS reply_count integer DEFAULT 0;

-- 新增 last_reply_at 欄位：最後回覆時間（用於排序）
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS last_reply_at timestamptz;

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_messages_parent_message_id ON public.messages(parent_message_id);
CREATE INDEX IF NOT EXISTS idx_messages_reply_count ON public.messages(reply_count) WHERE reply_count > 0;

-- 建立觸發器：更新父訊息的回覆統計
CREATE OR REPLACE FUNCTION update_message_reply_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.parent_message_id IS NOT NULL THEN
    -- 新增回覆時，更新父訊息的統計
    UPDATE public.messages
    SET
      reply_count = COALESCE(reply_count, 0) + 1,
      last_reply_at = NEW.created_at
    WHERE id = NEW.parent_message_id;
  ELSIF TG_OP = 'DELETE' AND OLD.parent_message_id IS NOT NULL THEN
    -- 刪除回覆時，更新父訊息的統計
    UPDATE public.messages
    SET
      reply_count = GREATEST(COALESCE(reply_count, 0) - 1, 0)
    WHERE id = OLD.parent_message_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_message_reply_stats ON public.messages;
CREATE TRIGGER trigger_update_message_reply_stats
AFTER INSERT OR DELETE ON public.messages
FOR EACH ROW
EXECUTE FUNCTION update_message_reply_stats();

-- 移除舊的 channel_threads 相關觸發器和函數（如果存在）
DROP TRIGGER IF EXISTS trigger_update_thread_stats ON public.messages;
DROP FUNCTION IF EXISTS update_thread_stats();

-- 新增欄位註解
COMMENT ON COLUMN public.messages.parent_message_id IS '父訊息 ID（Slack 風格討論串，null 表示主訊息）';
COMMENT ON COLUMN public.messages.reply_count IS '回覆數量（僅父訊息有值）';
COMMENT ON COLUMN public.messages.last_reply_at IS '最後回覆時間（用於排序）';

COMMIT;
