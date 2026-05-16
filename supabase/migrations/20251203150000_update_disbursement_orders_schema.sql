-- 更新出納單表格結構以支援新的出納功能
BEGIN;

-- 新增 order_number 欄位
ALTER TABLE public.disbursement_orders
ADD COLUMN IF NOT EXISTS order_number TEXT;

-- 新增 disbursement_date 欄位
ALTER TABLE public.disbursement_orders
ADD COLUMN IF NOT EXISTS disbursement_date DATE;

-- 新增 payment_request_ids 陣列欄位（一個出納單可以包含多張請款單）
ALTER TABLE public.disbursement_orders
ADD COLUMN IF NOT EXISTS payment_request_ids UUID[] DEFAULT '{}';

-- 新增 confirmed_by 和 confirmed_at 欄位
ALTER TABLE public.disbursement_orders
ADD COLUMN IF NOT EXISTS confirmed_by UUID;

ALTER TABLE public.disbursement_orders
ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;

COMMIT;
