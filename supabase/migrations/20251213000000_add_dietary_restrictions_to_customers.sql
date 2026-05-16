-- Migration: 為 customers 新增飲食禁忌欄位
-- 日期: 2025-12-13
-- 說明: 添加 dietary_restrictions 欄位供團員名單編輯時同步儲存

BEGIN;

-- 為 customers 表新增 dietary_restrictions 欄位
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS dietary_restrictions text;

COMMENT ON COLUMN public.customers.dietary_restrictions IS '飲食禁忌/特殊飲食需求';

COMMIT;
