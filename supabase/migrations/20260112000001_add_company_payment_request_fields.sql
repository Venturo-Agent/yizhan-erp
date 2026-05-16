-- Migration: 新增公司請款功能相關欄位
-- 說明：支援公司級別請款（薪資、公關費用、差旅費用等），不需要綁定團號

BEGIN;

-- 新增請款類別欄位（團體請款 vs 公司請款）
ALTER TABLE public.payment_requests
ADD COLUMN IF NOT EXISTS request_category VARCHAR(20) DEFAULT 'tour';

-- 新增公司費用類型欄位
ALTER TABLE public.payment_requests
ADD COLUMN IF NOT EXISTS expense_type VARCHAR(10) NULL;

-- 添加欄位說明
COMMENT ON COLUMN public.payment_requests.request_category IS '請款類別: tour(團體請款), company(公司請款)';
COMMENT ON COLUMN public.payment_requests.expense_type IS '公司費用類型: SAL(薪資), ENT(公關費用), TRV(差旅費用), OFC(辦公費用), UTL(水電費), RNT(租金), EQP(設備), MKT(行銷費用), ADV(廣告費用), TRN(培訓費用)';

-- 建立索引以優化查詢
CREATE INDEX IF NOT EXISTS idx_payment_requests_request_category ON public.payment_requests(request_category);
CREATE INDEX IF NOT EXISTS idx_payment_requests_expense_type ON public.payment_requests(expense_type);

COMMIT;
