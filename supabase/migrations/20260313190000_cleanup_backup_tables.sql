-- ================================================================
-- 清理備份和多餘表格
-- 日期: 2026-03-13
-- 原因: 備份已完成，資料已驗證，刪除多餘表格
-- ================================================================

-- 刪除 daily_itinerary 備份表（已完成 rollback）
DROP TABLE IF EXISTS _backup_daily_itinerary CASCADE;

-- 刪除定價欄位備份表（已完成清理）
DROP TABLE IF EXISTS _backup_itineraries_pricing CASCADE;

-- 刪除展示表（已決定不使用）
DROP TABLE IF EXISTS tour_itinerary_display CASCADE;

-- 驗證結果
DO $$
DECLARE
  backup_daily_exists boolean;
  backup_pricing_exists boolean;
  display_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = '_backup_daily_itinerary'
  ) INTO backup_daily_exists;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = '_backup_itineraries_pricing'
  ) INTO backup_pricing_exists;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'tour_itinerary_display'
  ) INTO display_exists;
  
  IF NOT backup_daily_exists AND NOT backup_pricing_exists AND NOT display_exists THEN
    RAISE NOTICE '✅ 所有多餘表格已刪除';
  ELSE
    RAISE WARNING '⚠️ 部分表格刪除失敗：';
    IF backup_daily_exists THEN
      RAISE WARNING '  - _backup_daily_itinerary 仍存在';
    END IF;
    IF backup_pricing_exists THEN
      RAISE WARNING '  - _backup_itineraries_pricing 仍存在';
    END IF;
    IF display_exists THEN
      RAISE WARNING '  - tour_itinerary_display 仍存在';
    END IF;
  END IF;
END $$;
