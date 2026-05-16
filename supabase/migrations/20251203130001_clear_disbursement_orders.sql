-- 清空出納單資料
BEGIN;

-- 清空 disbursement_orders 表格
DELETE FROM public.disbursement_orders;

COMMIT;
