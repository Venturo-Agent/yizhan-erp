-- ============================================================================
-- 20260503080000_drop_update_updated_at_column.sql
--
-- T2: B-001 留下的尾巴 — 凍結模組已刪、把剩餘 update_updated_at_column trigger
--    全部轉到憲法標準 set_updated_at()、然後 DROP 老 function。
--
-- 起因：
--   - B-001（2026-05-02）整合了 12 個變體 trigger function、但 update_updated_at_column
--     當時被凍結模組（channels/messages/channel_groups）佔用、不能 DROP
--   - N-M04（2026-05-02）刪掉整個聊天模組、4 張表 CASCADE 砍光
--   - 現在 update_updated_at_column 只剩 ~34 條非凍結模組 trigger 在用、可全收斂
--
-- 驗證 set_updated_at body 跟 update_updated_at_column body 完全等價（都只做
-- NEW.updated_at = now()）、行為不變。
-- ============================================================================

-- 1. 把所有用 update_updated_at_column 的 trigger 換成 set_updated_at
--    用 dynamic SQL 自動處理、避免列 34 條 boilerplate
DO $$
DECLARE
  rec record;
  trigger_count int := 0;
BEGIN
  FOR rec IN
    SELECT t.tgname, c.relname AS table_name
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_proc p ON p.oid = t.tgfoid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND NOT t.tgisinternal
      AND p.proname = 'update_updated_at_column'
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS %I ON public.%I',
      rec.tgname, rec.table_name
    );
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()',
      rec.tgname, rec.table_name
    );
    trigger_count := trigger_count + 1;
  END LOOP;

  RAISE NOTICE '✅ 轉換 % 條 trigger 到 set_updated_at()', trigger_count;
END $$;

-- 2. 確認再無 trigger 用 update_updated_at_column、然後 DROP function
DO $$
DECLARE
  remaining int;
BEGIN
  SELECT COUNT(*) INTO remaining
  FROM pg_trigger t
  JOIN pg_proc p ON p.oid = t.tgfoid
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND NOT t.tgisinternal
    AND p.proname = 'update_updated_at_column';

  IF remaining > 0 THEN
    RAISE EXCEPTION '還有 % 條 trigger 在用 update_updated_at_column、不能 DROP', remaining;
  END IF;
END $$;

DROP FUNCTION IF EXISTS public.update_updated_at_column();
