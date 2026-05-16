-- ============================================================================
-- Merge tour_itinerary_days into tour_itinerary_items
--
-- 背景：
--   - tour_itinerary_items（404 rows）是行程 SSOT、五面觀點都讀它（行程/報價/需求/確認/結帳）
--   - tour_itinerary_days（109 rows）寄生在 items 上的 day-level metadata 冗餘 mirror
--   - itineraries.daily_itinerary jsonb 又存第三份
--   - A2 報告抽樣 8 個 itineraries：jsonb_array_length(daily_itinerary) = COUNT(days) 完全一致
--
-- 方案 A：days 表砍掉、把 day-level metadata 合併進 items 的「day_meta row」
--   - 規則：(tour_id, day_number, category='day_meta') 為該 day 的 day-level anchor
--     （不依賴 sort_order=0、現存資料 sort_order=0 已被景點/住宿/餐食佔用）
--   - items 多開 day_* prefix 欄位來容納 day-level metadata
--   - 109 筆 days metadata 全部搬進對應 day_meta row（缺的就 INSERT placeholder）
--
-- 註：itineraries 表保留（對外文宣 + 版本管理）、jsonb 簡化是另一波任務、不在這次。
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. 預處理：清掉真孤兒（tour 也不在了的 items）
-- ----------------------------------------------------------------------------
-- A2 抽查當下 0 筆真孤兒；保留 statement 做 idempotent 防護
DELETE FROM public.tour_itinerary_items items
WHERE itinerary_id IS NULL
  AND NOT EXISTS (SELECT 1 FROM public.tours WHERE id = items.tour_id);

-- ----------------------------------------------------------------------------
-- 2. items 加 day-level 欄位（避免跟 item-level 同名欄位衝突，全用 day_* prefix）
-- ----------------------------------------------------------------------------
ALTER TABLE public.tour_itinerary_items
  ADD COLUMN IF NOT EXISTS day_title text,
  ADD COLUMN IF NOT EXISTS day_route text,
  ADD COLUMN IF NOT EXISTS day_note text,
  ADD COLUMN IF NOT EXISTS day_blocks jsonb,
  ADD COLUMN IF NOT EXISTS is_same_accommodation boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS breakfast_preset text,
  ADD COLUMN IF NOT EXISTS lunch_preset text,
  ADD COLUMN IF NOT EXISTS dinner_preset text;

-- meal preset 限定值（跟原本 days 表的隱性 contract 對齊：'hotel' / 'self' / 'airline'）
ALTER TABLE public.tour_itinerary_items
  DROP CONSTRAINT IF EXISTS tour_itinerary_items_breakfast_preset_check,
  ADD CONSTRAINT tour_itinerary_items_breakfast_preset_check
    CHECK (breakfast_preset IS NULL OR breakfast_preset IN ('hotel', 'self', 'airline'));

ALTER TABLE public.tour_itinerary_items
  DROP CONSTRAINT IF EXISTS tour_itinerary_items_lunch_preset_check,
  ADD CONSTRAINT tour_itinerary_items_lunch_preset_check
    CHECK (lunch_preset IS NULL OR lunch_preset IN ('hotel', 'self', 'airline'));

ALTER TABLE public.tour_itinerary_items
  DROP CONSTRAINT IF EXISTS tour_itinerary_items_dinner_preset_check,
  ADD CONSTRAINT tour_itinerary_items_dinner_preset_check
    CHECK (dinner_preset IS NULL OR dinner_preset IN ('hotel', 'self', 'airline'));

-- 加 partial unique index：每個 (tour_id, day_number) 只能有一個 day_meta anchor row
CREATE UNIQUE INDEX IF NOT EXISTS tour_itinerary_items_day_meta_anchor_uidx
  ON public.tour_itinerary_items (tour_id, day_number)
  WHERE category = 'day_meta';

-- ----------------------------------------------------------------------------
-- 3. 資料遷移：把 days 的 metadata 寫進對應 items 的 day_meta row
-- ----------------------------------------------------------------------------

-- 3a. 先 UPDATE：(tour_id, day_number) 已有 category='day_meta' row 的、直接覆寫
--     （migration 第一次跑時、items 還沒任何 day_meta row、這段 0 rows）
UPDATE public.tour_itinerary_items i
SET
  day_title             = COALESCE(d.title, i.day_title),
  day_route             = COALESCE(d.route, i.day_route),
  day_note              = COALESCE(d.note, i.day_note),
  day_blocks            = COALESCE(d.blocks, i.day_blocks),
  is_same_accommodation = COALESCE(d.is_same_accommodation, i.is_same_accommodation),
  breakfast_preset      = COALESCE(d.breakfast_preset, i.breakfast_preset),
  lunch_preset          = COALESCE(d.lunch_preset, i.lunch_preset),
  dinner_preset         = COALESCE(d.dinner_preset, i.dinner_preset),
  updated_at            = now()
FROM public.tour_itinerary_days d
WHERE i.tour_id     = d.tour_id
  AND i.day_number  = d.day_number
  AND i.category    = 'day_meta';

-- 3b. 再 INSERT day_meta anchor：每筆 days 都建一個、放在 sort_order=-1
--     （sort_order=-1 確保排序時 day_meta anchor 不擋到原本 sort_order>=0 的內容 row）
INSERT INTO public.tour_itinerary_items (
  tour_id,
  itinerary_id,
  workspace_id,
  day_number,
  sort_order,
  category,
  title,
  day_title,
  day_route,
  day_note,
  day_blocks,
  is_same_accommodation,
  breakfast_preset,
  lunch_preset,
  dinner_preset,
  created_at,
  updated_at,
  created_by,
  updated_by
)
SELECT
  d.tour_id,
  d.itinerary_id,
  d.workspace_id,
  d.day_number,
  -1,
  'day_meta',
  d.title,
  d.title,
  d.route,
  d.note,
  d.blocks,
  d.is_same_accommodation,
  d.breakfast_preset,
  d.lunch_preset,
  d.dinner_preset,
  d.created_at,
  d.updated_at,
  d.created_by,
  d.updated_by
FROM public.tour_itinerary_days d
WHERE NOT EXISTS (
  SELECT 1
  FROM public.tour_itinerary_items i
  WHERE i.tour_id    = d.tour_id
    AND i.day_number = d.day_number
    AND i.category   = 'day_meta'
);

-- ----------------------------------------------------------------------------
-- 4. 驗證：days 109 筆都應該對應到 items 的 day_meta row
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_unmigrated integer;
  v_days_total integer;
  v_meta_rows  integer;
BEGIN
  SELECT count(*) INTO v_days_total FROM public.tour_itinerary_days;

  SELECT count(*)
  INTO v_unmigrated
  FROM public.tour_itinerary_days d
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.tour_itinerary_items i
    WHERE i.tour_id    = d.tour_id
      AND i.day_number = d.day_number
      AND i.category   = 'day_meta'
  );

  SELECT count(*) INTO v_meta_rows
  FROM public.tour_itinerary_items WHERE category = 'day_meta';

  RAISE NOTICE 'days total=%, day_meta rows=%, unmigrated=%', v_days_total, v_meta_rows, v_unmigrated;

  IF v_unmigrated > 0 THEN
    RAISE EXCEPTION 'Migration failed: % days have no corresponding day_meta row in items', v_unmigrated;
  END IF;

  IF v_meta_rows < v_days_total THEN
    RAISE EXCEPTION 'Migration failed: day_meta rows (%) less than days total (%)', v_meta_rows, v_days_total;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 5. 砍 days 表
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS public.tour_itinerary_days CASCADE;

COMMIT;
