-- =====================================================
-- 擴充 customer_assigned_itineraries 表格
-- 日期: 2025-12-13
-- 目的: 為前端「我的旅程詳情頁」新增必要欄位
-- =====================================================

-- 新增欄位
ALTER TABLE public.customer_assigned_itineraries
ADD COLUMN IF NOT EXISTS visa_status TEXT,
ADD COLUMN IF NOT EXISTS esim_url TEXT,
ADD COLUMN IF NOT EXISTS payment_details JSONB,
ADD COLUMN IF NOT EXISTS room_allocation JSONB;

-- 欄位說明
COMMENT ON COLUMN public.customer_assigned_itineraries.visa_status IS '簽證狀態：pending, approved, rejected, not_required';
COMMENT ON COLUMN public.customer_assigned_itineraries.esim_url IS 'eSIM 下載連結';
COMMENT ON COLUMN public.customer_assigned_itineraries.payment_details IS '付款詳情 JSON：{ "status": "paid"|"partial"|"pending", "paid_amount": number, "total_amount": number, "due_date": string }';
COMMENT ON COLUMN public.customer_assigned_itineraries.room_allocation IS '房間分配 JSON：{ "room_type": string, "room_number": string, "roommates": [string] }';
