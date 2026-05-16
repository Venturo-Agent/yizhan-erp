-- Migration: Add check-in and hotel confirmation fields
-- Date: 2025-12-12
-- Description: 新增報到功能和訂房代號欄位

-- =============================================
-- 1. Members 表：新增訂房代號欄位
-- =============================================
ALTER TABLE members
ADD COLUMN IF NOT EXISTS hotel_confirmation TEXT;

COMMENT ON COLUMN members.hotel_confirmation IS '訂房確認代號';

-- =============================================
-- 2. Members 表：新增報到相關欄位
-- =============================================
ALTER TABLE members
ADD COLUMN IF NOT EXISTS checked_in BOOLEAN DEFAULT FALSE;

ALTER TABLE members
ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ;

COMMENT ON COLUMN members.checked_in IS '是否已報到';
COMMENT ON COLUMN members.checked_in_at IS '報到時間';

-- =============================================
-- 3. Tours 表：新增報到功能欄位
-- =============================================
ALTER TABLE tours
ADD COLUMN IF NOT EXISTS enable_checkin BOOLEAN DEFAULT FALSE;

ALTER TABLE tours
ADD COLUMN IF NOT EXISTS checkin_qrcode TEXT;

COMMENT ON COLUMN tours.enable_checkin IS '是否開啟報到功能';
COMMENT ON COLUMN tours.checkin_qrcode IS '團體報到 QR Code 內容';
