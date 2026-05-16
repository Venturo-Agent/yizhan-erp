-- Add updated_at to customer_group_members table

BEGIN;

ALTER TABLE public.customer_group_members
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

COMMIT;
