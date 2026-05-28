-- 20260528010000_add_realtime_publication_journal_vouchers.sql
--
-- 為什麼：傳票頁（accounting/vouchers）改用 useRealtimeReload 補「同事改同步」（北極星 V2），
-- 但 journal_vouchers 不在 supabase_realtime publication（2026-05-27 live DB 查證 MISSING）→
-- 訂閱收不到廣播、同步靜默失效。補進 publication 讓傳票頁的 realtime 生效。
--
-- 純加廣播、不改 schema、不影響 RLS（publication 只控推送、RLS 仍守 row 可見度）。idempotent。

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'journal_vouchers'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.journal_vouchers;
  END IF;
END $$;

COMMIT;

-- ════ Rollback（萬一要還原）════
-- BEGIN;
-- ALTER PUBLICATION supabase_realtime DROP TABLE public.journal_vouchers;
-- COMMIT;
