-- 禁用分房分車表格的 RLS
-- 2025-12-13
-- 這些表格暫時不需要 RLS，因為它們是透過 tour_id 關聯到團

BEGIN;

-- 確保 RLS 是禁用的（預設情況下新表格 RLS 是禁用的）
ALTER TABLE IF EXISTS public.tour_rooms DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tour_room_assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tour_vehicles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tour_vehicle_assignments DISABLE ROW LEVEL SECURITY;

-- 確保 hotel_name 可以為空（用於可選的房型名稱）
ALTER TABLE public.tour_rooms ALTER COLUMN hotel_name DROP NOT NULL;

COMMIT;
