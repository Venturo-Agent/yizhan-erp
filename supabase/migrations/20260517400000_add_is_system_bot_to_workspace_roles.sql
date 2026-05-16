-- Add is_system_bot flag to workspace_roles
ALTER TABLE public.workspace_roles
  ADD COLUMN IF NOT EXISTS is_system_bot boolean NOT NULL DEFAULT false;

-- Mark the known system bot role for existing workspaces
-- (backfill: the hardcoded UUID belongs to the first workspace's setup)
UPDATE public.workspace_roles
  SET is_system_bot = true
  WHERE id = '53fd15df-a256-4a55-870d-0d59810fdddf';

-- Rollback:
-- ALTER TABLE public.workspace_roles DROP COLUMN IF EXISTS is_system_bot;
