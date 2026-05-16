-- 為收款單新增 LinkPay 連結欄位
-- 讓付款連結直接存在收款單，方便複製

BEGIN;

-- 新增 link 欄位
ALTER TABLE public.receipts
ADD COLUMN IF NOT EXISTS link text;

-- 新增 linkpay_order_number 欄位
ALTER TABLE public.receipts
ADD COLUMN IF NOT EXISTS linkpay_order_number text;

-- 加上註解
COMMENT ON COLUMN public.receipts.link IS 'LinkPay 付款連結';
COMMENT ON COLUMN public.receipts.linkpay_order_number IS 'LinkPay 訂單號';

COMMIT;
