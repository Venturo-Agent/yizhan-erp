-- ════════════════════════════════════════════════════════════════════
-- 效能：為所有「缺覆蓋索引的外鍵」補索引（深度效能盤查、Supabase advisor）
-- ════════════════════════════════════════════════════════════════════
--
-- 為什麼（2026-05-24 深度效能盤查、William「加」拍板）：
-- Supabase 效能顧問報出 154+ 個外鍵沒有覆蓋索引（public schema 實查 198 個 FK 欄缺索引）。
-- 沒索引的外鍵 → 關聯查詢(JOIN)、串表、cascade/SET NULL 刪除都會全表掃描、規模化後線性變慢
-- = 讀取效能差 + Supabase 運算成本上升（William #1 在意的「效能成本/讀取速度」）。
--
-- 做法：動態掃出「有 FK 約束、但沒有以該 FK 欄為前綴的覆蓋索引」的欄、逐一建 btree 索引。
-- - 冪等：CREATE INDEX IF NOT EXISTS、可重跑、不會重複建。
-- - 只補 public schema 業務表。
-- - 索引名 idx_<table>_<cols>；Postgres 自動截斷超過 63 字元的名稱（IF NOT EXISTS 下無害）。
-- - 純加索引、不改任何資料 / 邏輯 / RLS / 登入 → 零行為風險、只加速。
-- 當前資料量小、CREATE INDEX 瞬間完成；未來大表若要避免鎖、改用 CONCURRENTLY 個別建。
-- ════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  r record;
  idx_name text;
BEGIN
  FOR r IN
    SELECT c.relname AS tbl,
           (SELECT string_agg(quote_ident(a.attname), ', ' ORDER BY x.ord)
              FROM unnest(con.conkey) WITH ORDINALITY AS x(attnum, ord)
              JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = x.attnum) AS cols,
           (SELECT string_agg(a.attname, '_' ORDER BY x.ord)
              FROM unnest(con.conkey) WITH ORDINALITY AS x(attnum, ord)
              JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = x.attnum) AS colnames
    FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.contype = 'f' AND n.nspname = 'public'
      AND NOT EXISTS (
        SELECT 1 FROM pg_index i
        WHERE i.indrelid = con.conrelid
          AND (i.indkey::int2[])[0:array_length(con.conkey,1)] @> con.conkey
          AND (i.indkey::int2[])[0:array_length(con.conkey,1)] <@ con.conkey
      )
  LOOP
    idx_name := left('idx_' || r.tbl || '_' || r.colnames, 63);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (%s);', idx_name, r.tbl, r.cols);
  END LOOP;
END $$;

-- ════ Rollback：索引純加速、移除不影響正確性。若要還原可逐一 DROP INDEX idx_xxx。════
