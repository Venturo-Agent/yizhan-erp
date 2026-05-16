-- 需求單發送時間欄位
-- 列印需求單時自動記錄時間和更新狀態

-- 新增 sent_at 欄位
ALTER TABLE tour_requests ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;

COMMENT ON COLUMN tour_requests.sent_at IS '需求單發送時間（列印時記錄）';

-- 新增索引方便查詢已發送的需求單
CREATE INDEX IF NOT EXISTS idx_tour_requests_sent_at ON tour_requests(sent_at) WHERE sent_at IS NOT NULL;
