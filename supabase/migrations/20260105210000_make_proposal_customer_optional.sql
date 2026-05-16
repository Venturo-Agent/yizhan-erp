-- Make customer_name optional in proposals table
-- 客戶資訊改為選填

BEGIN;

-- 移除 customer_name 的 NOT NULL 限制
ALTER TABLE public.proposals
ALTER COLUMN customer_name DROP NOT NULL;

-- 設定預設值為空字串（避免已有資料問題）
ALTER TABLE public.proposals
ALTER COLUMN customer_name SET DEFAULT '';

COMMIT;
