-- Add flight_self_arranged field to order_members
-- Used to mark passengers who arrange their own flights (skip ticket reminders)

BEGIN;

-- Add the column
ALTER TABLE public.order_members
ADD COLUMN IF NOT EXISTS flight_self_arranged boolean DEFAULT false;

-- Add comment
COMMENT ON COLUMN public.order_members.flight_self_arranged IS 'Mark if passenger arranges their own flight (skip ticket status reminders)';

-- Create index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_order_members_flight_self_arranged
ON public.order_members(flight_self_arranged)
WHERE flight_self_arranged = false;

COMMIT;
