-- ================================================================
-- 清理 daily_itinerary 冗餘資料
-- 日期: 2026-03-12
-- 原因: daily_itinerary 與 tour_itinerary_items 重複記錄餐食/住宿/活動
-- 決策: tour_itinerary_items 是唯一來源，daily_itinerary 只存展示設定
-- ================================================================

-- ================================================================
-- Part 1: 清理 daily_itinerary jsonb（移除重複欄位）
-- ================================================================

-- 移除 daily_itinerary 的重複欄位
UPDATE itineraries
SET daily_itinerary = (
  SELECT jsonb_agg(
    elem - 'meals' - 'accommodation' - 'activities' - 'isSameAccommodation' - 'recommendations'
  )
  FROM jsonb_array_elements(daily_itinerary) elem
)
WHERE daily_itinerary IS NOT NULL;

-- ================================================================
-- Part 2: 清理 tour_itinerary_items 格式化重複項目
-- ================================================================

-- 刪除格式化重複的餐食項目
DELETE FROM tour_itinerary_items
WHERE category = 'meals' 
  AND (
    title LIKE 'Day% 早餐：%' 
    OR title LIKE 'Day% 午餐：%' 
    OR title LIKE 'Day% 晚餐：%'
  );

-- 刪除格式化重複的住宿項目
DELETE FROM tour_itinerary_items
WHERE category = 'accommodation' 
  AND title LIKE 'Day%：%';

-- ================================================================
-- 更新註解
-- ================================================================

COMMENT ON COLUMN itineraries.daily_itinerary IS 
  '每日行程展示設定（只存 title/description/highlight/images，不存實際資料）。
  實際餐食/住宿/活動資料從 tour_itinerary_items 核心表 JOIN 取得。
  資料結構：[{dayLabel, date, title, description, highlight, images}]';
