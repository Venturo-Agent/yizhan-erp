-- 為 messages 表新增 metadata 欄位
-- 用於儲存機器人通知等額外資料

BEGIN;

ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT NULL;

COMMENT ON COLUMN public.messages.metadata IS '訊息額外資料（如機器人通知類型等）';

COMMIT;
