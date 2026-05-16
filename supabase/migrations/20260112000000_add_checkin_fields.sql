-- 報到功能欄位
-- 為 order_members 表添加報到相關欄位

BEGIN;

-- 添加報到欄位到 order_members
ALTER TABLE public.order_members
ADD COLUMN IF NOT EXISTS checked_in boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS checked_in_at timestamptz;

-- 添加註解
COMMENT ON COLUMN public.order_members.checked_in IS '是否已報到';
COMMENT ON COLUMN public.order_members.checked_in_at IS '報到時間';

-- 確認 tours 表有報到功能欄位（如果沒有的話）
ALTER TABLE public.tours
ADD COLUMN IF NOT EXISTS enable_checkin boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS checkin_qrcode text;

COMMENT ON COLUMN public.tours.enable_checkin IS '是否啟用報到功能';
COMMENT ON COLUMN public.tours.checkin_qrcode IS '報到 QR Code 內容';

COMMIT;
