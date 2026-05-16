-- =====================================================
-- 為 customers 表新增帳號綁定欄位
-- 日期: 2025-12-13
-- 目的: 支援舊客戶帳號綁定功能
-- =====================================================

ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS linked_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS linked_method TEXT;

COMMENT ON COLUMN public.customers.linked_at IS '帳號綁定時間';
COMMENT ON COLUMN public.customers.linked_method IS '綁定方式：phone, email, national_id';
