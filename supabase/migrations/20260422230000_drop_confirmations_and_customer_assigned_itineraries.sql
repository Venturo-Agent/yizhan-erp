-- 2026-04-22: 砍 confirmations（12 row 全測試資料、未來重新開發）+ customer_assigned_itineraries（0 row 孤兒）
BEGIN;
DROP TABLE IF EXISTS public.confirmations CASCADE;
DROP TABLE IF EXISTS public.customer_assigned_itineraries CASCADE;
COMMIT;
