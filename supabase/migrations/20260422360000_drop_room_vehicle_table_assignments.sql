-- 2026-04-22: 砍分房分車分桌（William 決策、之後重新開發）
-- tour_rooms 24 row + tour_room_assignments 44 row 已 export 留底
-- tour_vehicles / tour_vehicle_assignments 全 0 row
-- 注意：order_members.room_type / roommate_id 4 欄保留（之前 SSOT 整合時併入、未來重做時可直接用）
BEGIN;
DROP VIEW  IF EXISTS public.tour_rooms_status CASCADE;
DROP VIEW  IF EXISTS public.tour_vehicles_status CASCADE;
DROP TABLE IF EXISTS public.tour_room_assignments CASCADE;
DROP TABLE IF EXISTS public.tour_vehicle_assignments CASCADE;
DROP TABLE IF EXISTS public.tour_rooms CASCADE;
DROP TABLE IF EXISTS public.tour_vehicles CASCADE;
COMMIT;
