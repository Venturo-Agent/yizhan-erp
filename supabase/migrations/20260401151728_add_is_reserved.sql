-- 新增 is_reserved 欄位到 tour_itinerary_items
-- 用途：記錄廠商是否已保留（飯店房間、車子等）

ALTER TABLE tour_itinerary_items
ADD COLUMN IF NOT EXISTS is_reserved BOOLEAN DEFAULT FALSE;

-- 新增 reserved_at 欄位（保留時間）
ALTER TABLE tour_itinerary_items
ADD COLUMN IF NOT EXISTS reserved_at TIMESTAMPTZ;

COMMENT ON COLUMN tour_itinerary_items.is_reserved IS '廠商是否已保留（房間/車子等）';
COMMENT ON COLUMN tour_itinerary_items.reserved_at IS '保留確認時間';
