-- 2026-04-22: 砍機器人 2 表（War Room 已死）+ itinerary_permissions（孤兒、行程權限走 role_tab_permissions）
BEGIN;
DROP TABLE IF EXISTS public.bot_groups CASCADE;
DROP TABLE IF EXISTS public.bot_registry CASCADE;
DROP TABLE IF EXISTS public.itinerary_permissions CASCADE;
COMMIT;
