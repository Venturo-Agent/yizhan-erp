-- =====================================================
-- Migration: 擴充需求單留言欄位
-- Date: 2025-12-29
-- =====================================================

BEGIN;

-- 新增 is_important 欄位
ALTER TABLE public.tour_request_messages
ADD COLUMN IF NOT EXISTS is_important BOOLEAN DEFAULT false;

-- 新增 is_read_by_staff 欄位
ALTER TABLE public.tour_request_messages
ADD COLUMN IF NOT EXISTS is_read_by_staff BOOLEAN DEFAULT false;

-- 新增 is_read_by_supplier 欄位
ALTER TABLE public.tour_request_messages
ADD COLUMN IF NOT EXISTS is_read_by_supplier BOOLEAN DEFAULT false;

-- 新增轉發相關欄位
ALTER TABLE public.tour_request_messages
ADD COLUMN IF NOT EXISTS forwarded_to_channel BOOLEAN DEFAULT false;

ALTER TABLE public.tour_request_messages
ADD COLUMN IF NOT EXISTS forwarded_at TIMESTAMPTZ;

ALTER TABLE public.tour_request_messages
ADD COLUMN IF NOT EXISTS forwarded_message_id UUID;

-- 新增 updated_at 欄位
ALTER TABLE public.tour_request_messages
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 新增 tour_requests.request_type 欄位
ALTER TABLE public.tour_requests
ADD COLUMN IF NOT EXISTS request_type VARCHAR(20) DEFAULT 'item';

-- 新增 tour_requests.supplier_response_at 欄位
ALTER TABLE public.tour_requests
ADD COLUMN IF NOT EXISTS supplier_response_at TIMESTAMPTZ;

-- 索引
CREATE INDEX IF NOT EXISTS idx_tour_requests_type ON public.tour_requests(request_type);

COMMIT;
