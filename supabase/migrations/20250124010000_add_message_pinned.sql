-- 新增訊息置頂功能
-- 日期：2025-01-24
-- 說明：為 messages 表新增 is_pinned 欄位，支援訊息置頂功能

-- 新增 is_pinned 欄位（如果不存在）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'is_pinned'
  ) THEN
    ALTER TABLE messages ADD COLUMN is_pinned BOOLEAN DEFAULT false;

    -- 新增索引以提升置頂訊息的查詢效能
    CREATE INDEX idx_messages_pinned ON messages(channel_id, is_pinned)
    WHERE is_pinned = true;

    RAISE NOTICE '✅ 已新增 messages.is_pinned 欄位';
  ELSE
    RAISE NOTICE 'ℹ️ messages.is_pinned 欄位已存在，跳過';
  END IF;
END $$;
