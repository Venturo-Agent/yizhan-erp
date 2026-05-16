-- ─────────────────────────────────────────────────────────────────────────────
-- attractions / restaurants / hotels.country_id 對齊 countries.id (5/13 W 拍板)
--
-- Root cause:
--   countries.id = 短代碼 ('jp' / 'cn' / 'th')、ISO 3166 對應
--   attractions/restaurants/hotels.country_id = 英文長名 ('japan' / 'china' / 'thailand')
--   → tour.country_id='jp' query 撈不到、景點不 filter
--
-- Fix: UPDATE attractions/restaurants/hotels.country_id 用 countries.name_en
--      ILIKE 反查、對齊 countries.id 短代碼。
--
-- 涵蓋（5/13 production snapshot）：
--   attractions: 796 japan / 492 china / 232 thailand / 等 ≈ 2200+ row
--   restaurants: 115 japan / 62 thailand / 等 ≈ 270+ row
--   hotels: 418 japan / 14 thailand / 等 ≈ 460+ row
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════
-- 用 countries.name_en (LOWERCASE) ILIKE attractions.country_id 反查、UPDATE
-- 限制：只動 country_id 是「英文長名」格式的、譬如 'japan' / 'china'
-- 不動：已經是短代碼的 / NULL / 其他特殊格式（譬如 'taiwan-country-001'）
-- ═══════════════════════════════════════════════════════════════════════════

-- 預先建臨時對照表：long_name → countries.id
DROP TABLE IF EXISTS _temp_country_alias;
CREATE TEMP TABLE _temp_country_alias AS
SELECT
  id AS country_id,
  LOWER(name_en) AS long_name_lc
FROM public.countries
WHERE name_en IS NOT NULL;

-- 特殊 case：name_en 不是單一字（譬如 'United Arab Emirates'）需要額外 alias
INSERT INTO _temp_country_alias VALUES
  ('us', 'usa'),
  ('us', 'united states'),
  ('gb', 'uk'),
  ('gb', 'britain'),
  ('gb', 'england'),
  ('kr', 'korea'),
  ('kr', 'south korea'),
  ('tw', 'taiwan'),
  ('tw', 'taiwan-country-001'),
  ('hk', 'hongkong'),
  ('cn', 'prc')
ON CONFLICT DO NOTHING;

-- attractions backfill
UPDATE public.attractions a
SET country_id = c.country_id
FROM _temp_country_alias c
WHERE LOWER(a.country_id) = c.long_name_lc
  AND a.country_id NOT IN (SELECT id FROM public.countries); -- 只動還沒對齊的

-- restaurants backfill
UPDATE public.restaurants r
SET country_id = c.country_id
FROM _temp_country_alias c
WHERE LOWER(r.country_id) = c.long_name_lc
  AND r.country_id NOT IN (SELECT id FROM public.countries);

-- hotels backfill
UPDATE public.hotels h
SET country_id = c.country_id
FROM _temp_country_alias c
WHERE LOWER(h.country_id) = c.long_name_lc
  AND h.country_id NOT IN (SELECT id FROM public.countries);

-- ═══════════════════════════════════════════════════════════════════════════
-- 驗證
-- ═══════════════════════════════════════════════════════════════════════════
DO $$
DECLARE
  v_attr_aligned INT;
  v_attr_misaligned INT;
  v_attr_distribution TEXT;
BEGIN
  -- attractions
  SELECT count(*) INTO v_attr_aligned FROM attractions
    WHERE country_id IS NOT NULL AND country_id IN (SELECT id FROM countries);
  SELECT count(*) INTO v_attr_misaligned FROM attractions
    WHERE country_id IS NOT NULL AND country_id NOT IN (SELECT id FROM countries);

  SELECT string_agg(country_id || ':' || cnt, ', ' ORDER BY cnt DESC)
    INTO v_attr_distribution
    FROM (
      SELECT country_id, count(*) AS cnt FROM attractions
      WHERE country_id IS NOT NULL
      GROUP BY country_id ORDER BY count(*) DESC LIMIT 8
    ) sub;

  RAISE NOTICE '════════════════════════════════════════════════════════════';
  RAISE NOTICE '✓ Library country_id align 完成';
  RAISE NOTICE '  attractions aligned: % / misaligned: %', v_attr_aligned, v_attr_misaligned;
  RAISE NOTICE '  attractions top 8: %', v_attr_distribution;
  RAISE NOTICE '════════════════════════════════════════════════════════════';
END $$;

DROP TABLE IF EXISTS _temp_country_alias;

COMMIT;
