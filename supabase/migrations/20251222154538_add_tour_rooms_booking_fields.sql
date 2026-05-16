-- Migration: 為 tour_rooms 表格新增 booking_code 和 amount 欄位
-- 這兩個欄位在前端已有編輯功能，但資料庫缺少對應欄位

BEGIN;

-- 新增訂房代號欄位
ALTER TABLE public.tour_rooms
ADD COLUMN IF NOT EXISTS booking_code VARCHAR(255) NULL;

COMMENT ON COLUMN public.tour_rooms.booking_code IS '訂房代號/確認碼';

-- 新增費用欄位
ALTER TABLE public.tour_rooms
ADD COLUMN IF NOT EXISTS amount DECIMAL(10,2) NULL;

COMMENT ON COLUMN public.tour_rooms.amount IS '房間費用';

COMMIT;
