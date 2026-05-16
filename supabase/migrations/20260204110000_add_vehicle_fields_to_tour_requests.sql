-- 為 tour_requests 表新增遊覽車/交通相關欄位
ALTER TABLE tour_requests
ADD COLUMN IF NOT EXISTS driver_name TEXT,
ADD COLUMN IF NOT EXISTS plate_number TEXT,
ADD COLUMN IF NOT EXISTS driver_phone TEXT;

-- 註解說明
COMMENT ON COLUMN tour_requests.driver_name IS '司機姓名';
COMMENT ON COLUMN tour_requests.plate_number IS '車牌號碼';
COMMENT ON COLUMN tour_requests.driver_phone IS '司機手機';
