-- 2026-04-22: 砍「擴張供應商 + 車行 + 確認單」整族（William 決策、之後重新開發）
-- 全 0 row、零資料風險
BEGIN;
-- 確認單 2 表
DROP TABLE IF EXISTS public.tour_confirmation_items CASCADE;
DROP TABLE IF EXISTS public.tour_confirmation_sheets CASCADE;
-- 擴張供應商 5 表
DROP TABLE IF EXISTS public.supplier_users CASCADE;
DROP TABLE IF EXISTS public.supplier_payment_accounts CASCADE;
DROP TABLE IF EXISTS public.supplier_request_responses CASCADE;
DROP TABLE IF EXISTS public.supplier_service_areas CASCADE;
DROP TABLE IF EXISTS public.supplier_price_list CASCADE;
-- 車行 4 表 + 1 view
DROP VIEW  IF EXISTS public.fleet_schedules_with_vehicle CASCADE;
DROP TABLE IF EXISTS public.fleet_vehicle_logs CASCADE;
DROP TABLE IF EXISTS public.fleet_schedules CASCADE;
DROP TABLE IF EXISTS public.fleet_vehicles CASCADE;
DROP TABLE IF EXISTS public.fleet_drivers CASCADE;
COMMIT;
