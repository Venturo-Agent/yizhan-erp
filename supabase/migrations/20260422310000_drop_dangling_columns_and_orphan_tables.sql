-- 2026-04-22: 清今天大砍除留下的 dangling 欄位 + 孤兒表
-- William 提醒：FK CASCADE 砍 constraint 但欄位本身會留、要清乾淨
BEGIN;
-- 整張孤兒表（driver_tasks 是 fleet 砍剩、4 row、src 0 引用）
DROP VIEW  IF EXISTS public.driver_tasks_today CASCADE;
DROP TABLE IF EXISTS public.driver_tasks CASCADE;
-- dangling 欄位（FK 已被 CASCADE 拔、值已是 NULL）
ALTER TABLE public.payment_request_items DROP COLUMN IF EXISTS tour_request_id;
ALTER TABLE public.todos DROP COLUMN IF EXISTS tour_request_id;
COMMIT;
