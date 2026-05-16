-- Add contract tracking fields to order_members and members tables
-- This allows tracking which members have had contracts created for them

BEGIN;

-- Add contract_created_at to order_members table
ALTER TABLE public.order_members
ADD COLUMN IF NOT EXISTS contract_created_at timestamptz;

-- Add comment to explain the field
COMMENT ON COLUMN public.order_members.contract_created_at IS 'Timestamp when a contract was created for this member. NULL means no contract yet.';

-- Add contract_created_at to members table (used by useMemberStore)
ALTER TABLE public.members
ADD COLUMN IF NOT EXISTS contract_created_at timestamptz;

-- Add comment to explain the field
COMMENT ON COLUMN public.members.contract_created_at IS 'Timestamp when a contract was created for this member. NULL means no contract yet.';

COMMIT;
