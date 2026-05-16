-- ================================================================
-- 清空 daily_itinerary 冗餘欄位（徹底清除污染）
-- 日期: 2026-03-13
-- 原因: daily_itinerary 只存展示設定，實際資料從核心表 JOIN
-- 影響: 舊資料的 meals/accommodation/activities 會被清空
-- ================================================================

-- 清空冗餘欄位（保留展示設定）
UPDATE itineraries
SET daily_itinerary = (
  SELECT jsonb_agg(
    jsonb_build_object(
      'dayLabel', elem->>'dayLabel',
      'date', elem->>'date',
      'title', elem->>'title',
      'highlight', COALESCE(elem->>'highlight', ''),
      'description', COALESCE(elem->>'description', ''),
      'images', COALESCE(elem->'images', '[]'::jsonb)
    )
  )
  FROM jsonb_array_elements(daily_itinerary) elem
)
WHERE daily_itinerary IS NOT NULL;

-- 統計清理結果
DO $$
DECLARE
  total_count integer;
  has_meals integer;
  has_accommodation integer;
  has_activities integer;
BEGIN
  SELECT COUNT(*) INTO total_count
  FROM itineraries
  WHERE daily_itinerary IS NOT NULL;
  
  SELECT COUNT(*) INTO has_meals
  FROM itineraries
  WHERE daily_itinerary::text LIKE '%"meals"%';
  
  SELECT COUNT(*) INTO has_accommodation
  FROM itineraries
  WHERE daily_itinerary::text LIKE '%"accommodation"%';
  
  SELECT COUNT(*) INTO has_activities
  FROM itineraries
  WHERE daily_itinerary::text LIKE '%"activities"%';
  
  RAISE NOTICE '✅ 清理完成：';
  RAISE NOTICE '  - 總行程表: % 筆', total_count;
  RAISE NOTICE '  - 包含 meals: % 筆（應為 0）', has_meals;
  RAISE NOTICE '  - 包含 accommodation: % 筆（應為 0）', has_accommodation;
  RAISE NOTICE '  - 包含 activities: % 筆（應為 0）', has_activities;
  
  IF has_meals = 0 AND has_accommodation = 0 AND has_activities = 0 THEN
    RAISE NOTICE '🎉 污染已徹底清除！';
  ELSE
    RAISE WARNING '⚠️ 仍有部分資料包含冗餘欄位';
  END IF;
END $$;

COMMENT ON COLUMN itineraries.daily_itinerary IS 
  '每日行程展示設定（只存 title/description/highlight/images）。
  實際餐食/住宿/活動資料從 tour_itinerary_items 核心表 JOIN 取得。
  資料結構：[{dayLabel, date, title, description, highlight, images}]
  ⚠️ 不存 meals/accommodation/activities（防止污染）';
