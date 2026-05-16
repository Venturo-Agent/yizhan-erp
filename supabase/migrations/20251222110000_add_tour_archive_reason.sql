-- 添加旅遊團封存原因欄位
-- 原因選項：no_deal（沒成交）、cancelled（取消）、test_error（測試錯誤）

BEGIN;

-- 添加 archive_reason 欄位
ALTER TABLE public.tours
ADD COLUMN IF NOT EXISTS archive_reason TEXT;

-- 添加註解
COMMENT ON COLUMN public.tours.archive_reason IS '封存原因：no_deal（沒成交）、cancelled（取消）、test_error（測試錯誤）';

-- 如果已有 archived = true 但沒有 archive_reason 的資料，設為 null（保持現狀）

COMMIT;
