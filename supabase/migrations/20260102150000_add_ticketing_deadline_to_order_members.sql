-- 為 order_members 表添加開票期限欄位
BEGIN;

ALTER TABLE public.order_members
ADD COLUMN IF NOT EXISTS ticketing_deadline date;

COMMENT ON COLUMN public.order_members.ticketing_deadline IS '開票期限（DL）';

COMMIT;
