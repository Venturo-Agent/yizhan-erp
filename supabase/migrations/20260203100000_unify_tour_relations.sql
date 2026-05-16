-- ================================================
-- 統一 Tour 關聯欄位
-- 日期: 2026-02-03
-- 目的: 簡化關聯結構，Tour 存 1:1 關聯
-- ================================================

-- 1. Tour 加上 itinerary_id 欄位
ALTER TABLE tours 
ADD COLUMN IF NOT EXISTS itinerary_id UUID REFERENCES itineraries(id);

COMMENT ON COLUMN tours.itinerary_id IS '關聯的行程表 ID（唯一）';

-- 2. 從現有資料補上 itinerary_id（如果有透過 proposal_package 關聯的）
UPDATE tours t
SET itinerary_id = pp.itinerary_id
FROM proposal_packages pp
WHERE t.proposal_package_id = pp.id
  AND t.itinerary_id IS NULL
  AND pp.itinerary_id IS NOT NULL;

-- 3. 從 itineraries.tour_id 反向補上（直接關聯的情況）
UPDATE tours t
SET itinerary_id = i.id
FROM itineraries i
WHERE i.tour_id = t.id
  AND t.itinerary_id IS NULL
  AND i._deleted = false;

-- 4. 確保 quote_id 也有資料（從 proposal_package 補）
UPDATE tours t
SET quote_id = pp.quote_id
FROM proposal_packages pp
WHERE t.proposal_package_id = pp.id
  AND t.quote_id IS NULL
  AND pp.quote_id IS NOT NULL;

-- 5. 建立索引
CREATE INDEX IF NOT EXISTS idx_tours_itinerary_id ON tours(itinerary_id);
CREATE INDEX IF NOT EXISTS idx_tours_quote_id ON tours(quote_id);
