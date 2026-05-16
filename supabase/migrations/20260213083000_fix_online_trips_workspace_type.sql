-- Fix online_trips.workspace_id type from text to uuid
-- for consistency with all other tables

BEGIN;

DROP POLICY IF EXISTS online_trips_select ON public.online_trips;
DROP POLICY IF EXISTS online_trips_insert ON public.online_trips;
DROP POLICY IF EXISTS online_trips_update ON public.online_trips;
DROP POLICY IF EXISTS online_trips_delete ON public.online_trips;

ALTER TABLE public.online_trips
  ALTER COLUMN workspace_id TYPE uuid USING workspace_id::uuid;

CREATE POLICY online_trips_select ON public.online_trips FOR SELECT
  USING (is_super_admin() OR workspace_id = get_current_user_workspace());

CREATE POLICY online_trips_insert ON public.online_trips FOR INSERT
  WITH CHECK (is_super_admin() OR workspace_id = get_current_user_workspace());

CREATE POLICY online_trips_update ON public.online_trips FOR UPDATE
  USING (is_super_admin() OR workspace_id = get_current_user_workspace());

CREATE POLICY online_trips_delete ON public.online_trips FOR DELETE
  USING (is_super_admin() OR workspace_id = get_current_user_workspace());

COMMIT;
