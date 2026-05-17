-- ============================================================================
-- 補檔：inbox unified messaging 三表加進 supabase_realtime publication
-- Date: 2026-05-17
-- 補檔理由：
--   原本 2026-05-17 透過 Supabase Management API 直接 apply 過、production
--   上 inbox_conversations / inbox_messages / channel_messages 已加進
--   publication、但沒寫 migration 檔進 repo（違反 Migration SOP「本地寫檔
--   → commit → apply」）。本檔補進來、idempotent 重跑也 OK。
--
-- 為什麼要這 3 表 realtime：
--   - inbox_conversations：對話列表自動跳新對話 / 未讀變化
--   - inbox_messages：客戶傳新訊息、agent UI 即時顯示
--   - channel_messages：HAPPY bot 回 + 同事頻道訊息即時同步
--
-- 紅線遵守：
--   - 純 ALTER PUBLICATION ADD TABLE、不影響 RLS / 寫入路徑
--   - idempotent：DO block 內檢查 pg_publication_tables 已存在則跳過
-- ============================================================================

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'inbox_conversations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.inbox_conversations;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'inbox_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.inbox_messages;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'channel_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.channel_messages;
  END IF;
END $$;

COMMIT;

-- ════ Rollback（萬一爆炸、複製貼上跑）════
-- BEGIN;
-- ALTER PUBLICATION supabase_realtime DROP TABLE public.inbox_conversations;
-- ALTER PUBLICATION supabase_realtime DROP TABLE public.inbox_messages;
-- ALTER PUBLICATION supabase_realtime DROP TABLE public.channel_messages;
-- COMMIT;
