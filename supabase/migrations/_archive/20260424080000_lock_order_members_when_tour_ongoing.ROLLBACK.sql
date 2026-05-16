-- ROLLBACK: 移除 order_members 出團鎖
BEGIN;
DROP TRIGGER IF EXISTS tg_lock_order_members_ongoing ON public.order_members;
DROP FUNCTION IF EXISTS public.check_tour_member_modify_lock();
COMMIT;
