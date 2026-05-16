-- ================================================================
-- 清理核心表重複項目
-- 日期: 2026-03-12
-- 原因: 同一天同一類別有多筆（drafted + none）
-- 策略: 保留 drafted，刪除 none
-- ================================================================

-- 刪除重複的 none 狀態項目（保留 drafted）
DELETE FROM tour_itinerary_items
WHERE id IN (
  SELECT t1.id
  FROM tour_itinerary_items t1
  WHERE t1.quote_status = 'none'
    AND EXISTS (
      SELECT 1
      FROM tour_itinerary_items t2
      WHERE t2.tour_id = t1.tour_id
        AND t2.day_number = t1.day_number
        AND t2.category = t1.category
        AND t2.quote_status = 'drafted'
        AND (
          -- 住宿：只比較 category 和 day
          (t2.category = 'accommodation')
          OR
          -- 餐食：比較 sub_category
          (t2.category = 'meals' AND t2.sub_category = t1.sub_category)
          OR
          -- 活動：比較 title
          (t2.category = 'activities' AND t2.title = t1.title)
        )
    )
);

-- 統計清理結果
DO $$
DECLARE
  total_items integer;
  accommodation_count integer;
  meals_count integer;
  activities_count integer;
BEGIN
  SELECT COUNT(*) INTO total_items FROM tour_itinerary_items;
  SELECT COUNT(*) INTO accommodation_count FROM tour_itinerary_items WHERE category = 'accommodation';
  SELECT COUNT(*) INTO meals_count FROM tour_itinerary_items WHERE category = 'meals';
  SELECT COUNT(*) INTO activities_count FROM tour_itinerary_items WHERE category = 'activities';
  
  RAISE NOTICE '✅ 重複清理完成：';
  RAISE NOTICE '  - 總項目數: %', total_items;
  RAISE NOTICE '  - 住宿: %', accommodation_count;
  RAISE NOTICE '  - 餐食: %', meals_count;
  RAISE NOTICE '  - 活動: %', activities_count;
END $$;
