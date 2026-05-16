-- ================================================================
-- Rollback: 恢復 daily_itinerary 資料
-- 日期: 2026-03-12
-- 原因: 需要保留 activities 讓 syncToCore 能讀取
-- ================================================================

-- 從備份表恢復資料
UPDATE itineraries
SET daily_itinerary = backup.original_data
FROM _backup_daily_itinerary backup
WHERE itineraries.id = backup.itinerary_id
  AND backup.original_data IS NOT NULL;

-- 檢查恢復結果
DO $$
DECLARE
  restored_count integer;
  has_activities integer;
BEGIN
  SELECT COUNT(*) INTO restored_count
  FROM itineraries
  WHERE daily_itinerary IS NOT NULL;
  
  SELECT COUNT(*) INTO has_activities
  FROM itineraries
  WHERE daily_itinerary::text LIKE '%"activities"%';
  
  RAISE NOTICE '✅ 恢復完成：';
  RAISE NOTICE '  - 總行程表: % 筆', restored_count;
  RAISE NOTICE '  - 包含 activities: % 筆', has_activities;
END $$;

COMMENT ON COLUMN itineraries.daily_itinerary IS 
  '每日行程資料（用於 syncToCore 寫入核心表，展示時從核心表 JOIN 取得）。
  資料結構：[{dayLabel, date, title, description, highlight, images, activities, meals, accommodation}]';
