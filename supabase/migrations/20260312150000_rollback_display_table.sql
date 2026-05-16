-- 回滾 tour_itinerary_display 表
-- 原因：採用新架構 - 核心表支援兩種模式（資料庫 reference + 文字），不需要獨立展示表

DROP TABLE IF EXISTS public.tour_itinerary_display;

-- 註解：
-- 核心表 tour_itinerary_items 已支援：
-- 1. 資料庫模式：resource_type + resource_id (JOIN attractions/hotels/restaurants)
-- 2. 文字模式：title + description (直接顯示)
-- 
-- UI 顯示時動態組合，不需要 daily_itinerary JSONB 或獨立展示表
