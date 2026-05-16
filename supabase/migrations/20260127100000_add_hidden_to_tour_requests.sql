-- 需求總覽隱藏功能
-- 允許用戶隱藏不需要的需求項目（如機上餐食）

ALTER TABLE tour_requests
ADD COLUMN IF NOT EXISTS hidden boolean DEFAULT false;

-- 添加索引以優化查詢
CREATE INDEX IF NOT EXISTS idx_tour_requests_hidden ON tour_requests(hidden) WHERE hidden = true;

COMMENT ON COLUMN tour_requests.hidden IS '是否隱藏（不顯示在需求總覽，但保留資料）';
