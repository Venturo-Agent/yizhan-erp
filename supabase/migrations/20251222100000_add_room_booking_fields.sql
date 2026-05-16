-- 為 tour_rooms 新增訂房代號和費用欄位
-- 修復之前沒有儲存這些資料的問題

BEGIN;

-- 新增訂房代號欄位
ALTER TABLE public.tour_rooms
ADD COLUMN IF NOT EXISTS booking_code TEXT;

-- 新增費用欄位
ALTER TABLE public.tour_rooms
ADD COLUMN IF NOT EXISTS amount DECIMAL(10, 2);

-- 註解
COMMENT ON COLUMN public.tour_rooms.booking_code IS '訂房代號/確認號';
COMMENT ON COLUMN public.tour_rooms.amount IS '房間費用';

COMMIT;
