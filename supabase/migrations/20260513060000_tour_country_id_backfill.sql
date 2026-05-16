-- ─────────────────────────────────────────────────────────────────────────────
-- tours.country_id backfill（5/13 William 拍板）
--
-- 緣起：392 個 tour 內 388 個 country_id 空（早期 schema 未強制、UI 沒選國家就建）
-- 1 個 dangling country_id（指向已被刪除的 countries row）
--
-- 邏輯：
--   1. 清 1 個 dangling → SET NULL
--   2. 對空 country_id 的 tour、用 LEFT(code, 3) IATA → ref_airports → countries
--      譬如 'SDJ260612A' → 'SDJ' → 'JP' → countries.id='jp'
--   3. 反查不到的（tour.code 不是標準 IATA 格式）→ 保留 NULL、之後人工修
--
-- 預期：388 → 大多反查成功、剩零星人工
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. 清 1 個 dangling country_id
-- ═══════════════════════════════════════════════════════════════════════════
UPDATE public.tours
SET country_id = NULL
WHERE country_id IS NOT NULL
  AND country_id != ''
  AND country_id NOT IN (SELECT id FROM public.countries);

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. backfill 空 country_id：tour.code 前 3 字 IATA → countries.id
-- ═══════════════════════════════════════════════════════════════════════════
UPDATE public.tours t
SET country_id = c.id
FROM public.ref_airports a
JOIN public.countries c ON c.code = a.country_code
WHERE (t.country_id IS NULL OR t.country_id = '')
  AND t.code IS NOT NULL
  AND LENGTH(t.code) >= 3
  AND a.iata_code = UPPER(LEFT(t.code, 3));

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. 結果驗證
-- ═══════════════════════════════════════════════════════════════════════════
DO $$
DECLARE
  v_total INT;
  v_still_null INT;
  v_backfilled INT;
  v_country_distribution TEXT;
BEGIN
  SELECT count(*) INTO v_total FROM public.tours WHERE deleted_at IS NULL;
  SELECT count(*) INTO v_still_null
    FROM public.tours
    WHERE deleted_at IS NULL AND (country_id IS NULL OR country_id = '');
  v_backfilled := v_total - v_still_null;

  SELECT string_agg(country_id || ':' || cnt, ', ' ORDER BY cnt DESC)
    INTO v_country_distribution
    FROM (
      SELECT country_id, count(*) AS cnt
      FROM public.tours
      WHERE deleted_at IS NULL AND country_id IS NOT NULL AND country_id != ''
      GROUP BY country_id
      ORDER BY count(*) DESC
      LIMIT 10
    ) sub;

  RAISE NOTICE '════════════════════════════════════════════════════════════';
  RAISE NOTICE '✓ tours.country_id backfill 完成';
  RAISE NOTICE '  總 tour 數：%', v_total;
  RAISE NOTICE '  backfilled（country_id 已填）：%', v_backfilled;
  RAISE NOTICE '  仍為 NULL（IATA 反查不到）：%', v_still_null;
  RAISE NOTICE '  Top 10 國家分布：%', COALESCE(v_country_distribution, '(無)');
  RAISE NOTICE '════════════════════════════════════════════════════════════';
END $$;

COMMIT;
