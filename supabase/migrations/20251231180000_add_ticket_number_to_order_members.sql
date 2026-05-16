-- 為團員新增票號欄位
BEGIN;

ALTER TABLE public.order_members
ADD COLUMN IF NOT EXISTS ticket_number VARCHAR(20);

COMMENT ON COLUMN public.order_members.ticket_number IS '機票票號';

COMMIT;
