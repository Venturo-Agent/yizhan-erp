-- 20260527140000_add_realtime_publication_brands_checks_ai_products.sql
--
-- 為什麼：brands / checks / ai_products 三張表的 entity hook（createEntityHook）已訂閱 realtime
-- （useRealtimeSync），但這三張表不在 supabase_realtime publication 裡 → 訂閱空轉、
-- 同事改了別人收不到（北極星驗收 V2「同事改自動同步」破口）。
--
-- 這是 code↔production 漂移：hook 端訂了、DB 端 publication 沒開。2026-05-27 用 live DB
-- pg_publication_tables 查證確認 MISSING（讀取層即時性盤點 §3 校正一）。
--
-- 純加廣播、不改 schema、不影響 RLS（publication 只控推送、RLS 仍守 row 可見度）。
-- idempotent：已在 publication 的不重複 ADD（可安全重跑）。
--
-- 註：journal_vouchers 也 MISSING，但其頁面是直接 supabase+useState、無 entity hook 訂閱，
-- 補 publication 無人接收，留 P1（先改頁面走 entity hook 再補廣播）。

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'brands'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.brands;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'checks'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.checks;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'ai_products'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_products;
  END IF;
END $$;

COMMIT;

-- ════ Rollback（萬一要還原、複製貼上跑）════
-- BEGIN;
-- ALTER PUBLICATION supabase_realtime DROP TABLE public.brands;
-- ALTER PUBLICATION supabase_realtime DROP TABLE public.checks;
-- ALTER PUBLICATION supabase_realtime DROP TABLE public.ai_products;
-- COMMIT;
