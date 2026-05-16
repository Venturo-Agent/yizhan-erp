-- 新增 parent_message_id 欄位到 messages 表格
-- 用於 Slack 風格討論串：回覆訊息指向父訊息

BEGIN;

-- 新增 parent_message_id 欄位（如果不存在）
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS parent_message_id uuid REFERENCES public.messages(id) ON DELETE SET NULL;

-- 建立索引以加速查詢討論串回覆
CREATE INDEX IF NOT EXISTS idx_messages_parent_message_id 
ON public.messages(parent_message_id) 
WHERE parent_message_id IS NOT NULL;

-- 添加註解
COMMENT ON COLUMN public.messages.parent_message_id IS 'Slack-style thread: reply message points to parent message';

COMMIT;
